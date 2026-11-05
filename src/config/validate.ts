import { load as yamlLoad, YAMLException } from 'js-yaml'
import type {
  RawAufbau,
  RawBeschriftung,
  RawConfig,
  RawDirektpunkt,
  RawDisq,
  RawEnglisch,
  RawKatalog,
  RawLegendeHinweis,
  RawPosition,
  RawPositionen,
  RawRegelwerk,
  RawRegelwerkListe,
  RawSpalte,
} from './schema'

/**
 * Locker getypte Eingabe: Der Validator prüft gerade evtl. fehlerhaftes YAML,
 * darf also keinen vollständig gültigen RawConfig voraussetzen. Ein echter
 * RawConfig ist hierzu zuweisbar.
 */
export type ConfigInput = {
  sprachen?: string[]
  einheitEn?: string
  fehlerHinweis?: string
  fehlerHinweisEn?: string
  legendeHinweise?: RawLegendeHinweis[]
  direktpunkte?: Array<Partial<RawDirektpunkt>>
  englisch?: RawEnglisch
  klassen?: Array<string | number>
  ohneSpalten?: Record<string, string[]>
  disqualifikationen?: Array<Partial<RawDisq>>
  kataloge?: Record<string, Partial<RawKatalog>>
  hinweise?: Record<string, string>
  bezeichnungen?: Record<string, string>
  beschriftungen?: Array<Partial<RawBeschriftung>>
  aufbauten?: Array<Partial<RawAufbau>>
  positionen?: Array<Partial<RawPosition>>
}

// Semantische Prüfung der YAML-Konfiguration: Die Positionen werden gegen JEDES
// Regelwerk geprüft, denn jedes muss alles anbieten, worauf sie verweisen. Der
// Parser (js-yaml) fängt bereits Syntaxfehler und doppelte Mapping-Keys ab; hier
// geht es um die fachlichen Regeln, die gültiges YAML NICHT verhindert:
//   • doppelte Definitionen (Positions-IDs, Spalten-Keys, Fehler-Codes …)
//   • Verweise ins Leere (Aufbau → Position, Spalte → Katalog/Summenspalte …)
// Genutzt von validate.test.ts (blockt Commit/CI) und scripts/check-config.ts.

export type Severity = 'error' | 'warning'

export interface ConfigIssue {
  severity: Severity
  /** Kurz-Code zum Nachschlagen, z. B. 'DUP_POSITION_ID'. */
  code: string
  /** Verständliche Meldung (deutsch). */
  message: string
  /** Fundstelle, z. B. 'positionen[3] (id: mueb)'. */
  where: string
}

const VALID_TYPEN = new Set<RawSpalte['typ']>([
  'boje',
  'code',
  'punkte',
  'zeit',
  'disq',
  'text',
  'summe',
  'trenner',
])

const VALID_TRENNER = new Set(['fett', 'doppelt', 'gepunktet', 'gestrichelt'])

// Bleibt lokal: types.ts würde hier einen Laufzeit-Import nötig machen, und das
// Skript check-config.ts läuft ohne Bundler.
const VALID_KLASSEN = new Set(['E', '1', '2', '3', '4', '5', '6', '7'])

/** Bereiche, denen Disqualifikationen und Positionen zugeordnet sein können. */
const VALID_BEREICHE = new Set(['vorsteg', 'steg', 'parcours', 'mueb'])

/** Werte, die in der Liste mehr als einmal vorkommen (Wert → Anzahl). */
function duplicates<T>(items: readonly T[], keyOf: (t: T) => string | undefined): Map<string, number> {
  const counts = new Map<string, number>()
  for (const it of items) {
    const k = keyOf(it)
    if (k === undefined || k === '') continue
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return new Map([...counts].filter(([, n]) => n > 1))
}

/**
 * Prüft die bereits geparste, zusammengeführte Roh-Konfiguration. Gibt eine
 * Liste von Befunden zurück (leer = alles gut). `error` sollte den Build/Commit
 * blocken, `warning` ist ein Hinweis.
 */
export function validateRawConfig(raw: ConfigInput): ConfigIssue[] {
  const issues: ConfigIssue[] = []
  const add = (severity: Severity, code: string, message: string, where: string) =>
    issues.push({ severity, code, message, where })
  const err = (code: string, message: string, where: string) => add('error', code, message, where)
  const warn = (code: string, message: string, where: string) => add('warning', code, message, where)

  const positionen = raw.positionen ?? []
  const kataloge = raw.kataloge ?? {}
  const hinweise = raw.hinweise ?? {}
  const aufbauten = raw.aufbauten ?? []
  const beschriftungen = raw.beschriftungen ?? []
  const disqs = raw.disqualifikationen ?? []

  const katalogIds = new Set(Object.keys(kataloge))
  const hinweisIds = new Set(Object.keys(hinweise))
  const positionIds = new Set<string>()

  // ---- Duplikate auf oberster Ebene ---------------------------------------
  for (const [id, n] of duplicates(positionen, (p) => p?.id))
    err('DUP_POSITION_ID', `Positions-ID "${id}" ${n}× definiert.`, 'positionen')
  for (const p of positionen) if (p?.id) positionIds.add(p.id)

  for (const [id, n] of duplicates(aufbauten, (a) => a?.id))
    err('DUP_AUFBAU_ID', `Aufbau-ID "${id}" ${n}× definiert.`, 'aufbauten')

  for (const [id, n] of duplicates(beschriftungen, (b) => b?.id))
    err('DUP_BESCHRIFTUNG_ID', `Beschriftungs-ID "${id}" ${n}× definiert.`, 'beschriftungen')

  for (const [code, n] of duplicates(disqs, (d) => (d ? String(d.code) : undefined)))
    err('DUP_DISQ_CODE', `Disqualifikations-Code "${code}" ${n}× definiert.`, 'disqualifikationen')

  // Die Eingabe akzeptiert je Zeichen einen Buchstaben (siehe lib/disq).
  for (const d of disqs)
    if (d && !/^[A-Z]$/.test(String(d.code)))
      err('BAD_DISQ_CODE', `Disqualifikations-Code "${d.code}" muss ein einzelner Großbuchstabe sein.`, 'disqualifikationen')

  for (const [kid, kat] of Object.entries(kataloge)) {
    for (const [code, n] of duplicates(kat?.fehler ?? [], (f) => (f ? String(f.code) : undefined)))
      err('DUP_FEHLER_CODE', `Fehler-Code "${code}" ${n}× im Katalog "${kid}".`, `kataloge.${kid}`)
    // Die Eingabe akzeptiert nur Zahlen als Fehlercode (siehe lib/codes).
    for (const f of kat?.fehler ?? [])
      if (f && !/^\d+$/.test(String(f.code)))
        err('BAD_FEHLER_CODE', `Fehler-Code "${f.code}" im Katalog "${kid}" muss eine Zahl sein.`, `kataloge.${kid}`)
  }

  // Eindeutige Codes über alle Kataloge halten die A4-Legende lesbar.
  const alleFehler = Object.values(kataloge).flatMap((k) => k?.fehler ?? [])
  for (const [code, n] of duplicates(alleFehler, (f) => (f ? String(f.code) : undefined)))
    warn('DUP_FEHLER_CODE_KATALOGE', `Fehler-Code "${code}" steht in ${n} Katalogen.`, 'kataloge')

  for (const k of raw.klassen ?? [])
    if (!VALID_KLASSEN.has(String(k)))
      err('BAD_KLASSE', `Unbekannte Klasse "${k}" (erlaubt: E, 1 bis 7).`, 'klassen')

  for (const d of disqs)
    for (const b of d?.bereiche ?? [])
      if (!VALID_BEREICHE.has(b))
        err('UNKNOWN_DISQ_BEREICH', `Disqualifikation "${d?.code}" nennt den unbekannten Bereich "${b}".`, 'disqualifikationen')

  // ---- Positionen im Detail ------------------------------------------------
  positionen.forEach((pos, i) => {
    const where = `positionen[${i}]${pos?.id ? ` (id: ${pos.id})` : ''}`
    if (!pos || typeof pos !== 'object') {
      err('BAD_POSITION', 'Position ist kein Objekt.', where)
      return
    }
    if (!pos.id) err('MISSING_POSITION_ID', 'Position ohne "id".', where)

    const spalten = pos.spalten ?? []
    if (spalten.length === 0) warn('EMPTY_POSITION', `Position "${pos.id}" hat keine Spalten.`, where)

    for (const [key, n] of duplicates(spalten, (s) => s?.key))
      err('DUP_SPALTE_KEY', `Spalten-Key "${key}" ${n}× in Position "${pos.id}".`, where)

    const spaltenKeys = new Set(spalten.map((s) => s?.key).filter(Boolean) as string[])
    const summeKeys = new Set(
      spalten.filter((s) => s?.typ === 'summe').map((s) => s?.key).filter(Boolean) as string[],
    )

    if (pos.katalog && !katalogIds.has(pos.katalog))
      err('UNKNOWN_KATALOG', `Position "${pos.id}" verweist auf unbekannten Katalog "${pos.katalog}".`, where)

    // Ein Hinweis darf auch direkter Freitext sein (dann Leerzeichen/Zeilen);
    // nur einzelne Wörter werden als Verweis-ID gewertet und geprüft.
    if (pos.hinweis && !/\s/.test(pos.hinweis) && !hinweisIds.has(pos.hinweis))
      warn(
        'UNKNOWN_HINWEIS',
        `Position "${pos.id}" verweist auf unbekannten Hinweis "${pos.hinweis}" (wird als Freitext angezeigt).`,
        where,
      )

    if (pos.summeSpalte && !summeKeys.has(pos.summeSpalte)) {
      if (spaltenKeys.has(pos.summeSpalte))
        err('BAD_SUMME_SPALTE', `summeSpalte "${pos.summeSpalte}" in "${pos.id}" ist keine Spalte vom Typ "summe".`, where)
      else err('UNKNOWN_SUMME_SPALTE', `summeSpalte "${pos.summeSpalte}" in "${pos.id}" existiert nicht.`, where)
    }

    if (pos.subTrenner && !VALID_TRENNER.has(pos.subTrenner))
      err('BAD_SUBTRENNER', `subTrenner "${pos.subTrenner}" in "${pos.id}" muss fett | doppelt | gepunktet | gestrichelt sein.`, where)

    // Bildgenerator: braucht ein Ziel (`bild`) und wenigstens eine Quelle für die
    // Abblendung (spaltenweise `hebt` ODER positionsweite `abblenden`).
    if (pos.bildGenerator) {
      if (!pos.bild)
        err('MISSING_BILD', `Position "${pos.id}" hat bildGenerator: true, aber kein "bild" (Zielordner).`, where)
      const hatHebt = (pos.spalten ?? []).some((s) => !!s?.hebt)
      const hatAbblenden = Array.isArray(pos.abblenden) && pos.abblenden.length > 0
      if (!hatHebt && !hatAbblenden)
        warn(
          'EMPTY_ABBLENDUNG',
          `Position "${pos.id}" nutzt bildGenerator, blendet aber nichts ab (weder Spalten-"hebt" noch "abblenden") - erzeugt eine Kopie ohne Änderung.`,
          where,
        )
    }
    if (pos.abblenden !== undefined && !Array.isArray(pos.abblenden))
      err('BAD_ABBLENDEN', `abblenden in "${pos.id}" muss eine Liste von Element-IDs sein.`, where)

    if (pos.disq !== undefined && typeof pos.disq !== 'string') {
      err('BAD_DISQ', `disq in "${pos.id}" muss 'alle', 'keine' oder ein Bereich sein (keine Liste von Buchstaben).`, where)
    } else if (pos.disq !== undefined && pos.disq !== 'alle' && pos.disq !== 'keine' && !VALID_BEREICHE.has(pos.disq)) {
      err('UNKNOWN_DISQ_BEREICH', `Position "${pos.id}" verweist auf den unbekannten Bereich "${pos.disq}".`, where)
    }

    spalten.forEach((sp, j) => {
      const sw = `${where} · spalte "${sp?.key ?? j}"`
      if (!sp || typeof sp !== 'object') {
        err('BAD_SPALTE', 'Spalte ist kein Objekt.', sw)
        return
      }
      // Trenner-Eintrag: keine Datenspalte - kein key nötig, nur Design prüfen.
      if (sp.typ === 'trenner') {
        if (sp.design && !VALID_TRENNER.has(sp.design))
          err('BAD_TRENNER', `trenner-Design "${sp.design}" (${sw}) muss fett | doppelt | gepunktet | gestrichelt sein.`, sw)
        return
      }
      if (!sp.key) err('MISSING_SPALTE_KEY', 'Spalte ohne "key".', sw)
      if (!sp.typ) err('MISSING_SPALTE_TYP', `Spalte "${sp.key}" ohne "typ".`, sw)
      else if (!VALID_TYPEN.has(sp.typ)) err('BAD_SPALTE_TYP', `Unbekannter Spalten-Typ "${sp.typ}" (Spalte "${sp.key}").`, sw)

      if (sp.katalog && !katalogIds.has(sp.katalog))
        err('UNKNOWN_KATALOG', `Spalte "${sp.key}" verweist auf unbekannten Katalog "${sp.katalog}".`, sw)

      if (sp.punkteSpalte && !summeKeys.has(sp.punkteSpalte)) {
        if (spaltenKeys.has(sp.punkteSpalte))
          err('BAD_PUNKTE_SPALTE', `punkteSpalte "${sp.punkteSpalte}" (Spalte "${sp.key}") ist keine Spalte vom Typ "summe".`, sw)
        else
          err('UNKNOWN_PUNKTE_SPALTE', `punkteSpalte "${sp.punkteSpalte}" (Spalte "${sp.key}") existiert nicht in "${pos.id}".`, sw)
      }

      if (sp.innen && sp.innen !== 'seiteA' && sp.innen !== 'seiteB')
        err('BAD_INNEN', `innen "${sp.innen}" (Spalte "${sp.key}") muss 'seiteA' oder 'seiteB' sein.`, sw)

      if (sp.trenner && !VALID_TRENNER.has(sp.trenner))
        err('BAD_TRENNER', `trenner "${sp.trenner}" (Spalte "${sp.key}") muss fett | doppelt | gepunktet | gestrichelt sein.`, sw)

      if (sp.subTrenner && !VALID_TRENNER.has(sp.subTrenner))
        err('BAD_SUBTRENNER', `subTrenner "${sp.subTrenner}" (Spalte "${sp.key}") muss fett | doppelt | gepunktet | gestrichelt sein.`, sw)
    })
  })

  // ---- Regelwerk mit Englisch: Fehlt irgendwo eine Übersetzung? -------------
  for (const sp of raw.sprachen ?? [])
    if (sp !== 'de' && sp !== 'en') err('BAD_SPRACHE', `Unbekannte Sprache "${sp}" (erlaubt: de, en).`, 'sprachen')
  if (raw.sprachen?.includes('en')) {
    const fehlt = (was: string, where: string) => err('MISSING_EN', `Englischer Text fehlt: ${was}.`, where)
    for (const d of disqs) if (!d?.en) fehlt(`Disqualifikation "${d?.code}"`, 'disqualifikationen')
    for (const [kid, kat] of Object.entries(kataloge)) {
      if (kat?.titel && !kat.titelEn) fehlt(`Titel des Katalogs "${kid}"`, `kataloge.${kid}`)
      for (const f of kat?.fehler ?? []) if (!f?.en) fehlt(`Fehler-Code "${f?.code}"`, `kataloge.${kid}`)
    }
    for (const d of raw.direktpunkte ?? []) if (!d?.en || !d.titelEn) fehlt(`Fehler ohne Code "${d?.titel}"`, 'direktpunkte')
    if (raw.fehlerHinweis && !raw.fehlerHinweisEn) fehlt('fehlerHinweis', 'fehlerHinweisEn')
    for (const h of raw.legendeHinweise ?? [])
      if (typeof h === 'string' || !h.en) fehlt(`Hinweis "${typeof h === 'string' ? h : h.text}"`, 'legendeHinweise')

    const texte = raw.englisch?.texte ?? {}
    const hinweisTexte = raw.englisch?.hinweise ?? {}
    positionen.forEach((pos, i) => {
      const where = `positionen[${i}]${pos?.id ? ` (id: ${pos.id})` : ''}`
      if (pos?.titel && !texte[pos.titel]) fehlt(`Titel "${pos.titel}" (englisch.texte)`, where)
      if (pos?.hinweis && hinweisIds.has(pos.hinweis) && !hinweisTexte[pos.hinweis])
        fehlt(`Hinweis "${pos.hinweis}" (englisch.hinweise)`, where)
      for (const sp of pos?.spalten ?? [])
        if (sp?.label && !texte[sp.label]) fehlt(`Spaltenname "${sp.label}" (englisch.texte)`, where)
    })
    for (const b of beschriftungen)
      if (b?.id && !raw.englisch?.bezeichnungen?.[b.id]) fehlt(`Bezeichnungs-Schema "${b.id}" (englisch.bezeichnungen)`, 'beschriftungen')
  }

  // ---- Regelwerk: Spalten, die es hier nicht gibt --------------------------
  for (const [pid, keys] of Object.entries(raw.ohneSpalten ?? {})) {
    const pos = positionen.find((p) => p?.id === pid)
    if (!pos) {
      err('UNKNOWN_POSITION_REF', `ohneSpalten verweist auf unbekannte Position "${pid}".`, 'ohneSpalten')
      continue
    }
    for (const key of keys)
      if (!(pos.spalten ?? []).some((s) => s?.key === key))
        err('UNKNOWN_SPALTE', `ohneSpalten: Position "${pid}" hat keine Spalte "${key}".`, 'ohneSpalten')
  }

  // ---- Aufbauten: Positions-Verweise --------------------------------------
  aufbauten.forEach((a, i) => {
    const where = `aufbauten[${i}]${a?.id ? ` (id: ${a.id})` : ''}`
    if (!a?.id) err('MISSING_AUFBAU_ID', 'Aufbau ohne "id".', where)
    for (const pid of a?.positionen ?? [])
      if (!positionIds.has(pid))
        err('UNKNOWN_POSITION_REF', `Aufbau "${a?.id}" verweist auf unbekannte Position "${pid}".`, where)
  })

  // ---- Verwaiste Positionen (in keinem Aufbau, nicht in der Schnellauswahl)
  // - nur Hinweis: sie wären nirgends wählbar.
  if (aufbauten.length > 0) {
    const used = new Set(aufbauten.flatMap((a) => a?.positionen ?? []))
    for (const p of positionen)
      if (p?.id && !used.has(p.id) && p.schnellauswahl !== true)
        warn(
          'ORPHAN_POSITION',
          `Position "${p.id}" steht in keinem Aufbau und hat kein "schnellauswahl: true" - sie ist nirgends wählbar.`,
          'positionen',
        )
  }

  return issues
}

/** Parst eine YAML-Datei und meldet Syntaxfehler / doppelte Keys als Befund. */
export function parseYaml(text: string, file: string): { data: unknown; issues: ConfigIssue[] } {
  if (text.trim() === '') return { data: {}, issues: [] } // leere Datei = leere Konfiguration
  try {
    return { data: yamlLoad(text) ?? {}, issues: [] }
  } catch (e) {
    const msg = e instanceof YAMLException ? e.message.split('\n')[0] : String(e)
    return { data: null, issues: [{ severity: 'error', code: 'YAML_PARSE', message: msg, where: file }] }
  }
}

/** Die YAML-Texte der Konfiguration, wie sie im Ordner src/config liegen. */
export interface ConfigTexts {
  /** Inhalt von regelwerke.yaml. */
  liste: string
  /** Inhalt von regelwerke/<id>.yaml je Datei (Schlüssel = <id>). */
  regelwerke: Record<string, string>
  /** Inhalt von positionen.yaml. */
  positionen: string
}

/**
 * Parst die YAML-Texte und prüft die Positionen gegen jedes Regelwerk - wie
 * mergeAndBuild in active.ts, aber mit gesammelten Befunden statt stillem
 * Fallback. Rückgabe: alle Parse- + Validierungs-Befunde.
 */
export function validateConfigTexts(texte: ConfigTexts): ConfigIssue[] {
  const liste = parseYaml(texte.liste, 'regelwerke.yaml')
  const positionen = parseYaml(texte.positionen, 'positionen.yaml')
  const issues = [...liste.issues, ...positionen.issues]
  if (liste.data === null || positionen.data === null) return issues

  const ids = (liste.data as RawRegelwerkListe).regelwerke ?? []
  if (ids.length === 0)
    issues.push({ severity: 'error', code: 'NO_REGELWERK', message: 'regelwerke.yaml nennt kein Regelwerk.', where: 'regelwerke.yaml' })
  for (const [id, n] of duplicates(ids, (x) => x))
    issues.push({ severity: 'error', code: 'DUP_REGELWERK', message: `Regelwerk "${id}" ${n}× in der Liste.`, where: 'regelwerke.yaml' })
  for (const id of ids)
    if (texte.regelwerke[id] === undefined)
      issues.push({ severity: 'error', code: 'MISSING_REGELWERK', message: `Datei regelwerke/${id}.yaml fehlt.`, where: 'regelwerke.yaml' })
  for (const id of Object.keys(texte.regelwerke))
    if (!ids.includes(id))
      issues.push({ severity: 'warning', code: 'ORPHAN_REGELWERK', message: `regelwerke/${id}.yaml steht nicht in regelwerke.yaml - nicht wählbar.`, where: `regelwerke/${id}.yaml` })

  // Befunde, die nur die Positionen betreffen, würden sonst je Regelwerk einmal
  // erscheinen.
  const gesehen = new Set<string>()
  for (const [id, text] of Object.entries(texte.regelwerke)) {
    const file = `regelwerke/${id}.yaml`
    const parsed = parseYaml(text, file)
    issues.push(...parsed.issues)
    if (parsed.data === null) continue
    const rw = parsed.data as RawRegelwerk
    if (rw.id !== id)
      issues.push({ severity: 'error', code: 'BAD_REGELWERK_ID', message: `id "${rw.id}" passt nicht zum Dateinamen "${id}".`, where: file })
    if (!rw.name || rw.version === undefined)
      issues.push({ severity: 'error', code: 'MISSING_REGELWERK_NAME', message: 'Regelwerk ohne "name" oder "version".', where: file })
    const raw: RawConfig = { ...rw, ...(positionen.data as RawPositionen) }
    for (const issue of validateRawConfig(raw)) {
      const schluessel = `${issue.code}|${issue.where}|${issue.message}`
      if (gesehen.has(schluessel)) continue
      gesehen.add(schluessel)
      issues.push({ ...issue, where: `${file}: ${issue.where}` })
    }
  }
  return issues
}
