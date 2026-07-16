import type { CellKind, Column, DisqDef, ErrorDef, ErrorGroup, SheetDef, TrennerDesign } from '../types'
import type { RawConfig, RawKatalog, RawPosition, RawSpalte } from './schema'

// Wandelt die geparste (zusammengeführte) YAML-Konfiguration in die interne
// Darstellung um. Positionen binden Fehler-Kataloge und Hinweise per Verweis ein.

export interface ResolvedAufbau {
  id: string
  name: string
  /** Positions-IDs dieses Aufbaus (nur existierende, in Reihenfolge). */
  order: string[]
}

/** Umschaltbares Bezeichnungs-Schema (Bojen-Kürzel), z. B. Rechts/Links. */
export interface BeschriftungScheme {
  id: string
  name: string
  tokens: Record<string, string>
  /** Räumliches Schema (Pfeile): an "von hinten" betrachteten Positionen spiegeln. */
  raeumlich: boolean
}

export interface ResolvedConfig {
  positions: SheetDef[]
  /** Aufbauten (Setups); der erste ist der Standard. */
  aufbauten: ResolvedAufbau[]
  /** Alle konfigurierten Disqualifikationen. */
  allDisqs: DisqDef[]
  /** Auf der Seite umschaltbare Bezeichnungs-Schemata (der erste ist Standard). */
  beschriftungen: BeschriftungScheme[]
}

// 'trenner' ist keine Datenspalte und taucht hier nicht auf (wird vorher aus der
// Spaltenliste herausgefiltert, siehe buildColumns).
const TYP_TO_KIND: Record<Exclude<RawSpalte['typ'], 'trenner'>, CellKind> = {
  boje: 'buoy',
  code: 'code',
  punkte: 'points',
  zeit: 'time',
  disq: 'disq',
  text: 'text',
  summe: 'sum',
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Ersetzt ganze Wörter, die in der Token-Map stehen (einmalig, ohne Kaskade). */
function resolveTokens(text: string, tokens: Record<string, string>): string {
  const keys = Object.keys(tokens)
  if (keys.length === 0) return text
  keys.sort((a, b) => b.length - a.length)
  const re = new RegExp(`\\b(${keys.map(escapeRegex).join('|')})\\b`, 'g')
  return text.replace(re, (m) => tokens[m] ?? m)
}

function katalogRows(kat: RawKatalog | undefined): ErrorDef[] | undefined {
  return kat?.fehler.map((f) => ({ code: String(f.code), text: f.text, punkte: f.punkte }))
}

function toColumn(
  sp: RawSpalte,
  tokens: Record<string, string>,
  kataloge: Record<string, RawKatalog>,
): Column {
  // Innen/Außen-Modus: aktiv, sobald das Schema innen/aussen-Tokens liefert.
  // Für eine Spalte mit `innen`-Markierung (Tore 1-4) werden die Bojen-Seiten
  // dann relativ beschriftet - die innere Seite = innen, die andere = aussen.
  // Spalten ohne Markierung (Tor 5/Start/Ziel) bleiben physisch (R/L).
  let subTokens = tokens
  if (sp.innen && tokens.innen !== undefined && tokens.aussen !== undefined) {
    subTokens = {
      ...tokens,
      seiteA: sp.innen === 'seiteA' ? tokens.innen : tokens.aussen,
      seiteB: sp.innen === 'seiteB' ? tokens.innen : tokens.aussen,
    }
  }
  return {
    key: sp.key ?? '',
    label: sp.label ?? '',
    kind: TYP_TO_KIND[sp.typ as Exclude<RawSpalte['typ'], 'trenner'>] ?? 'text',
    sub: sp.sub?.map((x) => resolveTokens(x, subTokens)),
    pointsCol: sp.punkteSpalte,
    errorTable: sp.katalog ? katalogRows(kataloge[sp.katalog]) : undefined,
    grow: sp.breite,
    trenner: sp.trenner,
    subTrenner: sp.subTrenner,
    klassen: sp.klassen?.map((k) => String(k)),
  }
}

/**
 * Baut die Spaltenliste einer Position. Einträge mit `typ: trenner` sind keine
 * echten Spalten, sondern hängen ihre Trennlinie (Design) an die LINKE Kante der
 * folgenden Spalte. Zusätzlich bleibt die Kurzform `trenner:` an einer Spalte
 * erhalten; ein vorangestellter Trenner-Eintrag hat Vorrang.
 */
function buildColumns(
  spalten: RawSpalte[],
  tokens: Record<string, string>,
  kataloge: Record<string, RawKatalog>,
  posSubTrenner?: TrennerDesign,
): Column[] {
  const cols: Column[] = []
  let pending: TrennerDesign | undefined
  for (const sp of spalten) {
    if (sp.typ === 'trenner') {
      pending = sp.design ?? 'fett'
      continue
    }
    const col = toColumn(sp, tokens, kataloge)
    if (pending) {
      col.trenner = pending
      pending = undefined
    }
    // Positions-Standard für Unter-Spalten-Trenner, sofern die Spalte nicht
    // selbst eines vorgibt.
    if (!col.subTrenner && posSubTrenner) col.subTrenner = posSubTrenner
    cols.push(col)
  }
  return cols
}

function resolveDisq(pos: RawPosition, all: DisqDef[]): DisqDef[] | undefined {
  if (!pos.disq || pos.disq === 'keine') return undefined
  if (pos.disq === 'alle') return all
  const set = new Set(pos.disq.map((c) => String(c)))
  return all.filter((d) => set.has(d.code))
}

export function buildConfig(raw: RawConfig, opts?: { raeumlich?: boolean }): ResolvedConfig {
  const allDisqs: DisqDef[] = (raw.disqualifikationen ?? []).map((d) => ({
    code: String(d.code),
    text: d.text,
  }))
  const kataloge = raw.kataloge ?? {}
  const hinweise = raw.hinweise ?? {}
  const tokens = raw.bezeichnungen ?? {}
  const raeumlich = opts?.raeumlich ?? false

  const positions: SheetDef[] = (raw.positionen ?? []).map((pos) => {
    const disqTable = resolveDisq(pos, allDisqs)
    const kat = pos.katalog ? kataloge[pos.katalog] : undefined
    // Räumliches Schema (Pfeile) + Position von hinten betrachtet → Bojen-Seiten
    // spiegeln (Rechts erscheint dann links im Bild). Nur die Anzeige-Kürzel
    // werden getauscht, nicht die Langnamen (seiteAlang bleibt "Rechts").
    const posTokens =
      raeumlich && pos.pfeileSpiegeln
        ? { ...tokens, seiteA: tokens.seiteB ?? '', seiteB: tokens.seiteA ?? '' }
        : tokens
    // Hinweis per Verweis (ID), sonst direkt als Text; Tokens einsetzen.
    const noteRaw = pos.hinweis ? (hinweise[pos.hinweis] ?? pos.hinweis) : undefined
    // Nach dem Ersetzen leere Zeilen entfernen (z. B. wenn der iahinweis-Token
    // außerhalb des Innen/Außen-Schemas leer ist).
    const legendNote = noteRaw
      ? resolveTokens(noteRaw, posTokens)
          .split('\n')
          .filter((l) => l.trim() !== '')
          .join('\n')
      : undefined
    // Spalten-eigene Kataloge (in Reihenfolge, ohne Dubletten) → Legende zeigt
    // die Blöcke nebeneinander (z. B. Steg Ablegen / Anlegen).
    const groupIds: string[] = []
    for (const sp of pos.spalten) {
      if (sp.katalog && kataloge[sp.katalog] && !groupIds.includes(sp.katalog)) groupIds.push(sp.katalog)
    }
    const errorGroups: ErrorGroup[] | undefined =
      groupIds.length > 0
        ? groupIds.map((id) => ({ title: kataloge[id].titel, rows: katalogRows(kataloge[id]) ?? [] }))
        : undefined
    return {
      typeId: pos.id,
      title: pos.titel,
      menuLabel: pos.menue ?? pos.titel,
      orientation: pos.ausrichtung === 'quer' ? 'landscape' : 'portrait',
      showLauf: pos.lauf !== false,
      klassen: pos.klassen?.map((k) => String(k)),
      columns: buildColumns(pos.spalten, posTokens, kataloge, pos.subTrenner),
      sumColumnKey: pos.summeSpalte,
      errorTable: katalogRows(kat),
      errorTableTitle: kat?.titel,
      errorGroups,
      disqTable,
      showDisqTable: !!disqTable && disqTable.length > 0,
      legendNote,
      courseImageDir: pos.bild,
      bildDrehung: pos.bildDrehung,
    }
  })

  const known = new Set(positions.map((p) => p.typeId))
  // Aufbauten: nur existierende Positions-IDs; ohne Definition ein Standard mit allen.
  const aufbauten: ResolvedAufbau[] =
    raw.aufbauten && raw.aufbauten.length > 0
      ? raw.aufbauten.map((a) => ({
          id: a.id,
          name: a.name,
          order: a.positionen.filter((id) => known.has(id)),
        }))
      : [{ id: 'standard', name: 'Standard', order: positions.map((p) => p.typeId) }]

  const beschriftungen: BeschriftungScheme[] = (raw.beschriftungen ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    tokens: b.tokens ?? {},
    raeumlich: b.raeumlich ?? false,
  }))

  return { positions, aufbauten, allDisqs, beschriftungen }
}
