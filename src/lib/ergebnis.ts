import { aufbauOrder, getAufbau, getAufbauten, getDisziplin, getRegelwerk, getSheetDef, positionAllowsClass } from '../config/active'
import type { AppState, ClassId, Lauf } from '../types'
import { felderJeKennung, laufSchluessel, OHNE_LAUF, type Feld } from './eingaben'
import { codeEntries, parseCodeEntry } from './codes'
import { LAEUFE } from './quickpick'
import { NR_SPALTE, bojenWert, codeDisqs, columnsForClass, disqCodes, errorParts } from './scoring'
import { vergleicheNr } from './starter'
import { formatSeconds, parseTime } from './time'

// Ergebnislisten aus den Eingaben, nachgebaut nach den Auswertungs-Listen der DM 2026.
//
// Lauf: Die Zeit ist die der elektronischen Zeiterfassung, ohne sie der Mittelwert der
// Stoppuhren. Eine Sekunde zählt einen Punkt, dazu die Strafpunkte. Disqualifiziert steht ein Starter ohne Punkte hinter allen
// anderen; die 999,00 der Excel-Listen sollten dort nur die Sortierung erzwingen. Gleiche Punkte
// teilen sich den Platz.
//
// Gesamt: Ab drei Läufen wird genau einer gestrichen, der schlechteste; bei Gleichstand der
// frühere. Per Einstellung geht das schon ab zwei Läufen. Zählt danach noch ein
// disqualifizierter Lauf, ist der Starter insgesamt disqualifiziert und steht auf dem letzten
// Platz. Knoten zählen zusätzlich.
//
// Punkte stehen als ganze Hundertstel in den Zeilen, damit nichts durch Rundung kippt.

/** Eine Zelle je Zeile: die Punkte und Buchstaben ihrer Felder. */
export interface ErgebnisBlatt {
  label: string
  felder: string[]
}

export interface ErgebnisGruppe {
  label: string
  blaetter: ErgebnisBlatt[]
  /** Kopf zweizeilig: Gruppe und darunter die Kürzel der Blätter. */
  mitUnter: boolean
}

export interface LaufZeile {
  nr: string
  name: string
  vorname: string
  /** Gefahrene Zeit in Hundertstel; null = keine eingetragen. */
  zeit: number | null
  strafpunkte: number
  /** Zeit + Strafpunkte in Hundertstel; null = disqualifiziert oder ohne Zeit. */
  gesamt: number | null
  disq: boolean
  platz: number | null
  /** Inhalt je Blatt der Gruppen. */
  zellen: string[]
  /** Fehlercodes und Disq-Buchstaben, z. B. „3, 17, 18, J“. */
  schluessel: string
}

export interface LaufListe {
  klasse: ClassId
  lauf: Lauf
  gruppen: ErgebnisGruppe[]
  nachNummer: LaufZeile[]
  nachPlatz: LaufZeile[]
}

export interface GesamtZeile {
  nr: string
  name: string
  vorname: string
  /** Je Lauf der Gesamtliste eine Zeile, in derselben Reihenfolge. */
  laeufe: LaufZeile[]
  /** Der gestrichene Lauf. */
  gestrichen: Lauf | null
  /** Summe der gewerteten Läufe; null = disqualifiziert oder noch offen. */
  ergebnis: number | null
  disq: boolean
  /** Knoten-Strafpunkte. */
  knoten: number
  gesamt: number | null
  platz: number | null
}

export interface GesamtListe {
  klasse: ClassId
  laeufe: Lauf[]
  zeilen: GesamtZeile[]
}

export interface KlassenErgebnis {
  klasse: ClassId
  laeufe: LaufListe[]
  gesamt: GesamtListe
}

type Werte = Record<string, string>
type Stand = Pick<AppState, 'aufbau' | 'tor5MitParcours' | 'streichenAbZwei' | 'eingaben' | 'numbers' | 'starter'>

/** Die Bojen heißen hier immer R und L: Andere Bezeichnungen dienen nur den WKR zur Orientierung am Parcours. */
const BOJEN_SEITE: Record<string, string> = { seiteA: 'R', seiteB: 'L' }

/** Eine Punkte-Zelle: „disq.“ statt einer Zahl, leer solange die Zeit fehlt. */
export function punkteText(disq: boolean, punkte: number | null): string {
  if (disq) return 'disq.'
  return punkte === null ? '' : formatSeconds(punkte)
}

/** Die Spalten der Ergebnisliste: Felder, die es im Aufbau für die Klasse nicht gibt, entfallen. */
export function ergebnisGruppen(state: Pick<AppState, 'aufbau' | 'tor5MitParcours'>, klasse: string): ErgebnisGruppe[] {
  const kuerzel = new Map<string, string>()
  for (const typeId of aufbauOrder(state.aufbau, state.tor5MitParcours)) {
    if (!positionAllowsClass(typeId, klasse)) continue
    for (const col of columnsForClass(getSheetDef(typeId).columns, klasse)) {
      // Kennung „t1a|hin seiteA“: Das letzte Wort ist die Bojen-Seite.
      col.felder?.forEach((feld) => kuerzel.set(feld, BOJEN_SEITE[feld.split(' ').pop() ?? ''] ?? col.label))
    }
  }
  return (getDisziplin(getAufbau(state.aufbau).disziplin).ergebnisspalten ?? []).flatMap((sp): ErgebnisGruppe[] => {
    if (sp.unter) {
      const blaetter = sp.unter
        .map((u) => (typeof u === 'string' ? { feld: u, label: kuerzel.get(u) ?? '' } : u))
        .filter((u) => kuerzel.has(u.feld))
        .map((u) => ({ label: u.label, felder: [u.feld] }))
      return blaetter.length > 0 ? [{ label: sp.label, blaetter, mitUnter: true }] : []
    }
    const felder = (sp.felder ?? []).filter((f) => kuerzel.has(f))
    return felder.length > 0 ? [{ label: sp.label, blaetter: [{ label: sp.label, felder }], mitUnter: false }] : []
  })
}

/** Was eine Zeile eines Laufs ergibt: Punkte und Buchstaben einer Menge von Feldern. */
function bewerte(werte: Werte, kennungen: Iterable<string>, felder: Map<string, Feld>): { punkte: number; disqs: string[]; codes: string[] } {
  let punkte = 0
  const disqs: string[] = []
  const codes: string[] = []
  for (const kennung of kennungen) {
    const wert = werte[kennung]
    const feld = felder.get(kennung)
    if (!wert || !feld) continue
    if (feld.kind === 'buoy') {
      const boje = bojenWert(wert)
      punkte += boje.punkte
      if (boje.disq) disqs.push(boje.disq)
    } else if (feld.kind === 'code') {
      punkte += errorParts(feld.katalog, wert).reduce((s, p) => s + p.anzahl * p.punkte, 0)
      disqs.push(...codeDisqs(wert))
      codes.push(...codeEntries(wert).filter((e) => parseCodeEntry(e)))
    } else if (feld.kind === 'points') {
      punkte += parseInt(wert, 10) || 0
    } else if (feld.kind === 'disq') {
      disqs.push(...disqCodes(wert))
    }
  }
  return { punkte, disqs, codes }
}

/**
 * Die Zeit eines Laufs, auf Hundertstel gerundet: die elektronische Zeiterfassung, ohne sie der
 * Mittelwert der Stoppuhren. Zeitspalten ohne Gerät zählen als Stoppuhr.
 */
export function mittlereZeit(werte: Werte, felder: Map<string, Feld>): number | null {
  const zeiten = Object.entries(werte).flatMap(([kennung, wert]) => {
    const feld = felder.get(kennung)
    const zeit = feld?.kind === 'time' ? parseTime(wert) : null
    return zeit ? [{ centis: zeit.centis, elektronisch: feld?.geraet === 'elektronisch' }] : []
  })
  const elektronisch = zeiten.filter((z) => z.elektronisch)
  const gewertet = elektronisch.length > 0 ? elektronisch : zeiten
  return gewertet.length > 0 ? Math.round(gewertet.reduce((a, z) => a + z.centis, 0) / gewertet.length) : null
}

/** „J“ oder „5, J“: die Punkte einer Zelle, dahinter ihre Buchstaben. */
function zellText(punkte: number, disqs: string[]): string {
  return [...(punkte > 0 ? [String(punkte)] : []), ...[...new Set(disqs)].sort()].join(', ')
}

/** Der Code eines Eintrags: „2x6“ → „6“. */
const codeVon = (eintrag: string) => parseCodeEntry(eintrag)?.code ?? eintrag

/** Fehler-Schlüssel in natürlicher Reihenfolge: die Codes der Zahl nach, dahinter die Buchstaben. */
function schluesselText(codes: string[], disqs: string[]): string {
  const sortiert = [...codes].sort((a, b) => vergleicheNr(codeVon(a), codeVon(b)))
  return [...sortiert, ...[...new Set(disqs)].sort()].join(', ')
}

const istLeerzeile = (zeile: string) => /^_p\d+_x\d+$/.test(zeile)

/** Die Leerzeilen, in denen eine Startnummer von Hand eingetragen ist: Nummer und Werte. */
function leerzeilen(zeilen: Record<string, Werte> | undefined): Array<[string, Werte]> {
  return Object.entries(zeilen ?? {}).flatMap(([zeile, werte]): Array<[string, Werte]> => {
    const nr = istLeerzeile(zeile) ? werte[NR_SPALTE]?.trim().toUpperCase() : ''
    return nr ? [[nr, werte]] : []
  })
}

/** Die Werte je Startnummer; eine Leerzeile zählt unter ihrer handschriftlichen Nummer. */
function werteJeNummer(zeilen: Record<string, Werte> | undefined): Map<string, Werte> {
  const out = new Map(Object.entries(zeilen ?? {}).filter(([zeile]) => !istLeerzeile(zeile)))
  for (const [nr, werte] of leerzeilen(zeilen)) out.set(nr, { ...werte, ...out.get(nr) })
  return out
}

/** Sortiert nach Punkten (Disqualifizierte dahinter, Offene zuletzt) und vergibt die Plätze. */
function platziert<T extends { nr: string; gesamt: number | null; disq: boolean; platz: number | null }>(zeilen: T[]): T[] {
  const stufe = (z: T) => (z.disq ? 1 : z.gesamt === null ? 2 : 0)
  const gewertet = zeilen.filter((z) => stufe(z) === 0)
  return [...zeilen]
    .sort((a, b) => stufe(a) - stufe(b) || (stufe(a) === 0 ? a.gesamt! - b.gesamt! : 0) || vergleicheNr(a.nr, b.nr))
    .map((z) => ({
      ...z,
      platz:
        stufe(z) === 0
          ? 1 + gewertet.filter((g) => g.gesamt! < z.gesamt!).length
          : stufe(z) === 1
            ? gewertet.length + 1
            : null,
    }))
}

function laufListe(
  state: Stand,
  klasse: ClassId,
  lauf: Lauf,
  zeilen: Record<string, Werte> | undefined,
  nummern: string[],
  felder: Map<string, Feld>,
): LaufListe {
  const gruppen = ergebnisGruppen(state, klasse)
  const jeNummer = werteJeNummer(zeilen)
  const blaetter = gruppen.flatMap((g) => g.blaetter)
  const nachNummer = nummern.map((nr): LaufZeile => {
    const werte = jeNummer.get(nr) ?? {}
    const { punkte, disqs, codes } = bewerte(werte, Object.keys(werte), felder)
    const zeit = mittlereZeit(werte, felder)
    const disq = disqs.length > 0
    const zellen = blaetter.map((blatt) => {
      const zelle = bewerte(werte, blatt.felder, felder)
      return zellText(zelle.punkte, zelle.disqs)
    })
    return {
      nr,
      ...(state.starter[klasse]?.[nr] ?? { name: '', vorname: '' }),
      zeit,
      strafpunkte: punkte,
      gesamt: disq || zeit === null ? null : zeit + punkte * 100,
      disq,
      platz: null,
      zellen,
      schluessel: schluesselText(codes, disqs),
    }
  })
  const nachPlatz = platziert(nachNummer)
  const platzVon = new Map(nachPlatz.map((z) => [z.nr, z.platz]))
  return {
    klasse,
    lauf,
    gruppen,
    nachNummer: nachNummer.map((z) => ({ ...z, platz: platzVon.get(z.nr) ?? null })),
    nachPlatz,
  }
}

/** Index des zu streichenden Laufs: zuerst eine Disq., dann ein offener, sonst der schlechteste. */
function streichIndex(laeufe: LaufZeile[], abLaeufen: number): number | null {
  if (laeufe.length < abLaeufen) return null
  const disq = laeufe.findIndex((l) => l.disq)
  if (disq >= 0) return disq
  const offen = laeufe.findIndex((l) => l.gesamt === null)
  if (offen >= 0) return offen
  return laeufe.reduce((schlechtester, l, i) => (l.gesamt! > laeufe[schlechtester].gesamt! ? i : schlechtester), 0)
}

function gesamtListe(
  klasse: ClassId,
  laeufe: LaufListe[],
  knotenWerte: Map<string, Werte>,
  felder: Map<string, Feld>,
  streichenAb: number,
): GesamtListe {
  const zeilen = laeufe[0].nachNummer.map((kopf, i): GesamtZeile => {
    const jeLauf = laeufe.map((l) => l.nachNummer[i])
    const streichen = streichIndex(jeLauf, streichenAb)
    const zaehlen = jeLauf.filter((_, k) => k !== streichen)
    const disq = zaehlen.some((l) => l.disq)
    const ergebnis = zaehlen.some((l) => l.gesamt === null) ? null : zaehlen.reduce((s, l) => s + l.gesamt!, 0)
    const werte = knotenWerte.get(kopf.nr) ?? {}
    const knoten = bewerte(werte, Object.keys(werte), felder).punkte
    return {
      nr: kopf.nr,
      name: kopf.name,
      vorname: kopf.vorname,
      laeufe: jeLauf,
      gestrichen: streichen === null ? null : laeufe[streichen].lauf,
      ergebnis,
      disq,
      knoten,
      gesamt: ergebnis === null ? null : ergebnis + knoten * 100,
      platz: null,
    }
  })
  return { klasse, laeufe: laeufe.map((l) => l.lauf), zeilen: platziert(zeilen) }
}

/** Hat ein Lauf etwas anderes als handschriftliche Startnummern? */
function hatWerte(zeilen: Record<string, Werte> | undefined): boolean {
  return Object.values(zeilen ?? {}).some((werte) => Object.keys(werte).some((k) => k !== NR_SPALTE))
}

/** Die Läufe einer Klasse mit Eingaben, in der Disziplin des Aufbaus. */
export function laeufeMitEingaben(state: Pick<AppState, 'aufbau' | 'eingaben'>, klasse: ClassId): Lauf[] {
  const disziplin = getAufbau(state.aufbau).disziplin
  return LAEUFE.filter((l) => hatWerte(state.eingaben[laufSchluessel(disziplin, klasse, l)]))
}

/** Die Ergebnislisten einer Klasse für die Disziplin des Aufbaus; null, solange nichts eingetragen ist. */
export function klassenErgebnis(state: Stand, klasse: ClassId): KlassenErgebnis | null {
  const laeufe = laeufeMitEingaben(state, klasse)
  if (laeufe.length === 0) return null
  const disziplin = getAufbau(state.aufbau).disziplin
  const zeilenVon = (lauf: number) => state.eingaben[laufSchluessel(disziplin, klasse, lauf)]

  // Alle Starter: die Startnummern der Klasse und solche, die nur in einer Leerzeile stehen.
  // Werte entfernter Startnummern bleiben gespeichert, zählen aber nicht mit: Keine Liste zeigt sie.
  const nummern = [
    ...new Set([...(state.numbers[klasse] ?? []), ...laeufe.flatMap((l) => leerzeilen(zeilenVon(l)).map(([nr]) => nr))]),
  ].sort(vergleicheNr)
  const felder = felderJeKennung(klasse, aufbauOrder(state.aufbau, state.tor5MitParcours))
  const listen = laeufe.map((l) => laufListe(state, klasse, l, zeilenVon(l), nummern, felder))
  const streichenAb = state.streichenAbZwei ? 2 : 3
  return { klasse, laeufe: listen, gesamt: gesamtListe(klasse, listen, werteJeNummer(zeilenVon(OHNE_LAUF)), felder, streichenAb) }
}

/** Schlüssel der Gesamtliste einer Klasse in `listenStand`, neben den Lauf-Schlüsseln. */
export function gesamtSchluessel(disziplin: string, klasse: string): string {
  return `${disziplin}/${klasse}/gesamt`
}

/** FNV-1a: Der Listeninhalt selbst wäre für den Browser-Speicher unnötig groß. */
function pruefsumme(text: string): number {
  let summe = 0x811c9dc5
  for (let i = 0; i < text.length; i++) summe = Math.imul(summe ^ text.charCodeAt(i), 0x01000193)
  return summe >>> 0
}

const laufInhalt = ({ gruppen, nachNummer }: LaufListe) => JSON.stringify([gruppen, nachNummer])

/**
 * Der Stand aller Ergebnislisten: `zeit` bleibt, solange sich der Inhalt der Liste nicht ändert.
 * Geprüft wird immer alles, auch die andere Disziplin: Namen und Startnummern gelten für beide.
 * Die Gesamtliste zählt alle Listen ihrer Klasse mit, auch wenn eine Änderung bei ihr nicht zu
 * sehen ist (anderer Fehlercode, gleiche Punkte): Wer die Listen vergleicht, darf keinen Lauf
 * finden, der neuer ist als die Gesamtliste.
 */
export function aktuellerListenStand(state: Stand & Pick<AppState, 'listenStand'>, jetzt: number): AppState['listenStand'] {
  const neu: AppState['listenStand'] = {}
  const eintragen = (schluessel: string, inhalt: string) => {
    const summe = pruefsumme(inhalt)
    const bisher = state.listenStand[schluessel]
    neu[schluessel] = bisher?.inhalt === summe ? bisher : { inhalt: summe, zeit: jetzt }
  }
  const disziplinen = new Set<string>()
  for (const aufbau of [state.aufbau, ...getAufbauten().map((a) => a.id)]) {
    const { disziplin } = getAufbau(aufbau)
    if (disziplinen.has(disziplin)) continue
    disziplinen.add(disziplin)
    for (const klasse of getRegelwerk().klassen as ClassId[]) {
      const ergebnis = klassenErgebnis({ ...state, aufbau }, klasse)
      if (!ergebnis) continue
      for (const lauf of ergebnis.laeufe) eintragen(laufSchluessel(disziplin, klasse, lauf.lauf), laufInhalt(lauf))
      eintragen(gesamtSchluessel(disziplin, klasse), JSON.stringify(ergebnis))
    }
  }
  return neu
}
