import { aufbauOrder, getAufbau, getAufbauten, getPositions, getSheetDef, positionAllowsClass } from '../config/active'
import type { AppState, Bogen, CellKind, Eingaben, ErrorDef, Geraet, ParcoursNr, SheetDef } from '../types'
import { normalizeCodeCell } from './codes'
import { nameAusEinteilung, parcoursVon } from './einteilung'
import { allowedSet, sanitizeBuoy, sanitizeDisq } from './disq'
import { NR_SPALTE, columnCellKeys, defFuerKlasse } from './scoring'

// Die Eingaben stehen je Disziplin, Klasse, Lauf und Startnummer im Feld mit ihrer Kennung
// (config/feld.ts). Sie hängen weder an der Bogen-Auswahl noch am Aufbau: Bojen, Fehler und
// Zeiten sehen in jedem Aufbau einer Disziplin dasselbe Feld, egal auf welcher Liste es dort
// steht. Parallelslalom hat als eigene Disziplin eigene Werte.
//
// Disq., Bemerkung und WKR-Name gehören zu ihrer Liste. Beim Aufbau-Wechsel ziehen sie auf
// die entsprechende Liste um (listenUmziehen). Gibt es keine, bleiben sie gespeichert und
// sind beim Zurückwechseln wieder da.

/** Lauf-Nummer im Lauf-Schlüssel für Listen ohne Lauf (Knoten). */
export const OHNE_LAUF = 0

type Stand = Pick<AppState, 'aufbau' | 'eingaben' | 'wkr' | 'tor5MitParcours'>

export interface Feld {
  /** Teil des Zellschlüssels hinter der Zeile, z. B. „t1a#0“. */
  zelle: string
  kennung: string
  kind: CellKind
  /** Fehler-Katalog der Spalte (nur `code`). */
  katalog?: ErrorDef[]
  /** Gerät der Zeitspalte (nur `time`); fehlt = Stoppuhr. */
  geraet?: Geraet
  /** Der noch gültige Teil des Werts, '' wenn nichts mehr gilt. */
  gueltig: (wert: string) => string
}

export function laufSchluessel(disziplin: string, klasse: string, lauf: number): string {
  return `${disziplin}/${klasse}/${lauf}`
}

export function zerlegeLauf(schluessel: string): { disziplin: string; klasse: string; lauf: number } {
  const [disziplin, klasse, lauf] = schluessel.split('/')
  return { disziplin, klasse, lauf: Number(lauf) }
}

/** Der Lauf-Schlüssel, unter dem die Werte eines Bogens stehen. */
export function bogenLauf(aufbau: string, bogen: Bogen): string {
  const lauf = getSheetDef(bogen.typeId).showLauf === false ? OHNE_LAUF : bogen.lauf
  return laufSchluessel(getAufbau(aufbau).disziplin, bogen.klasse, lauf)
}

function wkrSchluessel(aufbau: string, bogen: Bogen): string {
  return `${bogenLauf(aufbau, bogen)}/${bogen.typeId}`
}

/** Der WKR-Name eines Bogens: sein eigener, sonst der aus der Einteilung. */
export function wkrVon(state: Pick<AppState, 'aufbau' | 'wkr'> & Partial<Pick<AppState, 'einteilung'>>, bogen: Bogen): string {
  return state.wkr[wkrSchluessel(state.aufbau, bogen)] || nameAusEinteilung(state.einteilung, bogen.typeId, bogen.klasse)
}

/** Kommt der WKR-Name des Bogens aus der Einteilung (kein eigener eingetragen)? */
export function wkrAusEinteilung(state: Pick<AppState, 'aufbau' | 'wkr' | 'einteilung'>, bogen: Bogen): boolean {
  return !state.wkr[wkrSchluessel(state.aufbau, bogen)] && !!nameAusEinteilung(state.einteilung, bogen.typeId, bogen.klasse)
}

/** Der Parcours im Kopf der Liste: nur bei zwei Parcours. */
export function parcoursImKopf(state: Pick<AppState, 'einteilung'>, bogen: Bogen): ParcoursNr | undefined {
  return state.einteilung?.zweiParcours ? parcoursVon(state.einteilung, bogen.klasse) : undefined
}

/** Setzt den Namen eines Bogens; leer gilt wieder die Einteilung. */
export function setzeWkr(state: Pick<AppState, 'aufbau' | 'wkr'>, bogen: Bogen, name: string): AppState['wkr'] {
  const schluessel = wkrSchluessel(state.aufbau, bogen)
  if (name) return { ...state.wkr, [schluessel]: name }
  const { [schluessel]: _weg, ...rest } = state.wkr
  return rest
}

/** Zerlegt „12:t1a#0“. Der Spalten-Key enthält nie einen Doppelpunkt, die Startnummer vielleicht. */
function zerlege(schluessel: string): { zeile: string; zelle: string } {
  const i = schluessel.lastIndexOf(':')
  return { zeile: schluessel.slice(0, i), zelle: schluessel.slice(i + 1) }
}

interface ListenFelder {
  liste: Feld[]
  jeZelle: Map<string, Feld>
}

// Je Konfigurationsstand: Beim Neubau entstehen neue SheetDef-Objekte.
const felderCache = new WeakMap<SheetDef, Map<string, ListenFelder>>()

/** Die Felder einer Liste für eine Klasse. */
function felderVon(typeId: string, klasse: string): ListenFelder {
  const basis = getSheetDef(typeId)
  const jeKlasse = felderCache.get(basis) ?? new Map<string, ListenFelder>()
  felderCache.set(basis, jeKlasse)
  const bekannt = jeKlasse.get(klasse)
  if (bekannt) return bekannt

  const def = defFuerKlasse(basis, klasse)
  const disqs = allowedSet(def.disqTable)
  const spalten = def.columns.filter((col) => col.kind !== 'sum').flatMap((col) => {
    const katalog = col.kind === 'code' ? (col.errorTable ?? def.errorTable ?? []) : undefined
    const gueltig = (wert: string): string => {
      if (col.kind === 'buoy') return sanitizeBuoy(wert, disqs)
      if (col.kind === 'disq') return sanitizeDisq(wert, disqs)
      if (katalog) return normalizeCodeCell(wert, new Set(katalog.map((e) => e.code)), disqs)
      return wert
    }
    return columnCellKeys('', col).map((schluessel, i): Feld => ({
      zelle: schluessel.slice(1),
      kennung: col.felder?.[i] ?? col.key,
      kind: col.kind,
      katalog,
      geraet: col.geraet,
      gueltig,
    }))
  })
  // Handschriftliche Startnummer einer Leerzeile (es gibt sie auf jeder Liste).
  const liste = [...spalten, { zelle: NR_SPALTE, kennung: NR_SPALTE, kind: 'text' as const, gueltig: (wert: string) => wert }]
  const felder = { liste, jeZelle: new Map(liste.map((f) => [f.zelle, f])) }
  jeKlasse.set(klasse, felder)
  return felder
}

/** Die Felder einer Liste für eine Klasse, wie sie der Bogen zeigt. */
export function listenFelder(typeId: string, klasse: string): Feld[] {
  return felderVon(typeId, klasse).liste
}

/** Alle Felder einer Klasse nach Kennung; bei Dopplungen zählt die erste Liste aus `vorrang`. */
export function felderJeKennung(klasse: string, vorrang: string[] = []): Map<string, Feld> {
  const out = new Map<string, Feld>()
  for (const typeId of [...vorrang, ...getPositions().map((p) => p.typeId)]) {
    if (!positionAllowsClass(typeId, klasse)) continue
    for (const feld of felderVon(typeId, klasse).liste) if (!out.has(feld.kennung)) out.set(feld.kennung, feld)
  }
  return out
}

/** Leser für die Zellen eines Bogens über dessen Zellschlüssel („401:t1a#0“). */
export function bogenLeser(state: Pick<AppState, 'aufbau' | 'eingaben'>, bogen: Bogen): (schluessel: string) => string {
  const zeilen = state.eingaben[bogenLauf(state.aufbau, bogen)]
  const felder = felderVon(bogen.typeId, bogen.klasse).jeZelle
  return (schluessel) => {
    const { zeile, zelle } = zerlege(schluessel)
    const kennung = felder.get(zelle)?.kennung
    return (kennung && zeilen?.[zeile]?.[kennung]) || ''
  }
}

/** Die Eingaben, nachdem eine Zelle eines Bogens geändert wurde. */
export function setzeZelle(state: Pick<AppState, 'aufbau' | 'eingaben'>, bogen: Bogen, schluessel: string, wert: string): Eingaben {
  const { zeile, zelle } = zerlege(schluessel)
  const kennung = felderVon(bogen.typeId, bogen.klasse).jeZelle.get(zelle)?.kennung
  if (!kennung) return state.eingaben
  const lauf = bogenLauf(state.aufbau, bogen)
  const werte = { ...state.eingaben[lauf]?.[zeile] }
  if (wert === '') delete werte[kennung]
  else werte[kennung] = wert
  const zeilen = { ...state.eingaben[lauf] }
  if (Object.keys(werte).length > 0) zeilen[zeile] = werte
  else delete zeilen[zeile]
  const eingaben = { ...state.eingaben }
  if (Object.keys(zeilen).length > 0) eingaben[lauf] = zeilen
  else delete eingaben[lauf]
  return eingaben
}

/** Wirft weg, was es nach einem Regelwerk-Wechsel nicht mehr gibt oder nicht mehr gilt. */
export function bereinigeEingaben(state: Stand): Pick<AppState, 'eingaben' | 'wkr'> {
  const out: Pick<AppState, 'eingaben' | 'wkr'> = { eingaben: {}, wkr: {} }
  const vorrang = aufbauOrder(state.aufbau, state.tor5MitParcours)
  for (const [lauf, zeilen] of Object.entries(state.eingaben)) {
    const felder = felderJeKennung(zerlegeLauf(lauf).klasse, vorrang)
    for (const [zeile, werte] of Object.entries(zeilen)) {
      for (const [kennung, wert] of Object.entries(werte)) {
        const gueltig = felder.get(kennung)?.gueltig(wert)
        if (gueltig) ((out.eingaben[lauf] ??= {})[zeile] ??= {})[kennung] = gueltig
      }
    }
  }
  for (const [schluessel, name] of Object.entries(state.wkr)) {
    const typeId = schluessel.split('/')[3]
    if (istListe(typeId) && positionAllowsClass(typeId, zerlegeLauf(schluessel).klasse)) out.wkr[schluessel] = name
  }
  return out
}

const istListe = (typeId: string) => getPositions().some((p) => p.typeId === typeId)

/** Die Liste eines Felds, das zu seiner Liste gehört („disq@steg“ → „steg“). */
const listeVon = (kennung: string): string | undefined => kennung.split('@')[1]

/**
 * Welche neue Liste entspricht welcher alten? Vorrang haben dieselbe Position und derselbe
 * Titel („Tor 1 / 3 / 5“ in Alcatraz und Frontal), danach zählen die gemeinsamen Felder.
 * Listen, die nur Disq. und Bemerkung gemeinsam haben, entsprechen sich nicht.
 */
function listenPaare(alt: string[], neu: string[], klasse: string, fest?: [string, string]): Map<string, string> {
  const fuerKlasse = (ids: string[]) => ids.filter((t) => istListe(t) && positionAllowsClass(t, klasse))
  const kennungen = (t: string) =>
    felderVon(t, klasse).liste.map((f) => f.kennung).filter((k) => k !== NR_SPALTE && !listeVon(k))
  const passung = (a: string, n: string): number => {
    if (a === n) return 2e6
    if (getSheetDef(a).titelDe === getSheetDef(n).titelDe) return 1e6
    const felder = new Set(kennungen(n))
    return kennungen(a).filter((k) => felder.has(k)).length
  }
  const kandidaten = fuerKlasse(alt)
    .flatMap((a) => fuerKlasse(neu).map((n) => ({ a, n, punkte: passung(a, n) })))
    .filter((k) => k.punkte > 0)
    .sort((x, y) => y.punkte - x.punkte)
  const paare = new Map<string, string>(fest ? [fest] : [])
  const vergeben = new Set<string>(fest ? [fest[1]] : [])
  for (const { a, n } of kandidaten) {
    if (paare.has(a) || vergeben.has(n)) continue
    paare.set(a, n)
    vergeben.add(n)
  }
  return paare
}

/** Der Aufbau, aus dem gespeicherte Listen vermutlich stammen (auch zusammengelegt). */
function herkunft(listen: Set<string>, disziplin: string): string[] {
  const treffer = (order: string[]) => order.filter((t) => listen.has(t)).length
  return getAufbauten()
    .filter((a) => a.disziplin === disziplin)
    .flatMap((a) => (a.kombi ? [a.order, a.kombi.order] : [a.order]))
    .reduce((beste, order) => (treffer(order) > treffer(beste) ? order : beste), [] as string[])
}

/**
 * Disq., Bemerkung und WKR-Name einer Disziplin ziehen auf die entsprechenden Listen um.
 * `fest`: ein Paar [alt, neu], das auf jeden Fall gilt (Tor 5 ↔ Tor 5 + Parcours).
 */
export function listenUmziehen(state: Stand, neu: string[], disziplin: string, fest?: [string, string]): Pick<AppState, 'eingaben' | 'wkr'> {
  const inDisziplin = (schluessel: string) => zerlegeLauf(schluessel).disziplin === disziplin
  const gespeichert = new Set<string>()
  for (const [lauf, zeilen] of Object.entries(state.eingaben)) {
    if (!inDisziplin(lauf)) continue
    for (const werte of Object.values(zeilen)) {
      for (const kennung of Object.keys(werte)) {
        const liste = listeVon(kennung)
        if (liste) gespeichert.add(liste)
      }
    }
  }
  for (const schluessel of Object.keys(state.wkr)) if (inDisziplin(schluessel)) gespeichert.add(schluessel.split('/')[3])
  // Kommt der Wechsel aus der anderen Disziplin, ist deren Aufbau nicht die Herkunft.
  const bisher =
    getAufbau(state.aufbau).disziplin === disziplin
      ? aufbauOrder(state.aufbau, state.tor5MitParcours)
      : herkunft(gespeichert, disziplin)
  const alt = [...new Set([...bisher, ...gespeichert])]
  const paareJeKlasse = new Map<string, Map<string, string>>()
  const paare = (klasse: string) => {
    const bekannt = paareJeKlasse.get(klasse)
    if (bekannt) return bekannt
    const berechnet = listenPaare(alt, neu, klasse, fest)
    paareJeKlasse.set(klasse, berechnet)
    return berechnet
  }

  const eingaben: Eingaben = {}
  for (const [lauf, zeilen] of Object.entries(state.eingaben)) {
    eingaben[lauf] = zeilen
    if (!inDisziplin(lauf)) continue
    const { klasse } = zerlegeLauf(lauf)
    eingaben[lauf] = Object.fromEntries(
      Object.entries(zeilen).map(([zeile, werte]) => [zeile, umgezogen(werte, klasse, paare(klasse))]),
    )
  }
  const wkr: AppState['wkr'] = {}
  for (const [schluessel, name] of Object.entries(state.wkr)) {
    const teile = schluessel.split('/')
    const partner = inDisziplin(schluessel) ? paare(teile[1]).get(teile[3]) : undefined
    wkr[partner ? [...teile.slice(0, 3), partner].join('/') : schluessel] = name
  }
  return { eingaben, wkr }
}

/** Die Werte einer Zeile; was auf der neuen Liste keinen Platz hat, bleibt, wo es ist. */
function umgezogen(werte: Record<string, string>, klasse: string, paare: Map<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  const bleibt: Array<[string, string]> = []
  for (const [kennung, wert] of Object.entries(werte)) {
    const liste = listeVon(kennung)
    const partner = liste && paare.get(liste)
    if (!liste || !partner) {
      bleibt.push([kennung, wert])
      continue
    }
    const ziel = `${kennung.split('@')[0]}@${partner}`
    const feld = felderVon(partner, klasse).liste.find((f) => f.kennung === ziel)
    if (feld?.gueltig(wert) && !(ziel in werte && ziel !== kennung)) out[ziel] = feld.gueltig(wert)
    else bleibt.push([kennung, wert])
  }
  return { ...Object.fromEntries(bleibt), ...out }
}

/** Liest einen Stand von früher, als die Werte je Bogen gespeichert waren. */
export function ausBogenWerten(
  altWerte: Record<string, Record<string, string>>,
  altWkr: Record<string, string>,
  boegen: Bogen[],
  aufbau: string,
): Pick<AppState, 'eingaben' | 'wkr'> {
  let out: Pick<AppState, 'aufbau' | 'eingaben' | 'wkr'> = { aufbau, eingaben: {}, wkr: {} }
  for (const bogen of boegen.filter((b) => istListe(b.typeId))) {
    for (const [schluessel, wert] of Object.entries(altWerte[bogen.id] ?? {})) {
      if (bogenLeser(out, bogen)(schluessel) === '') out = { ...out, eingaben: setzeZelle(out, bogen, schluessel, wert) }
    }
    if (altWkr[bogen.id]) out = { ...out, wkr: setzeWkr(out, bogen, altWkr[bogen.id]) }
  }
  return { eingaben: out.eingaben, wkr: out.wkr }
}
