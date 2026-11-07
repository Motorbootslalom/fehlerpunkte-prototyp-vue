import { aufbauOrder, getAufbau, positionAllowsClass } from '../config/active'
import type { AppState, ClassId, Eingaben } from '../types'
import { bogenLauf, felderJeKennung, laufSchluessel, listenFelder, OHNE_LAUF, zerlegeLauf, type Feld } from './eingaben'
import { mittlereZeit } from './ergebnis'
import { LAEUFE } from './quickpick'
import { formatMinutenEingabe, formatSeconds } from './time'

// Glaubhafte Zufallswerte für die angezeigten Bögen, damit sich der Prototyp ohne ausgedachte
// Werte erklären lässt.
//
// Die Zahlen sind gerundete Kennzahlen je Klasse aus echten Ergebnislisten, je Wettkampf aus
// anderen: Das Manövrieren der DM kommt aus der DM 2026 (450 Läufe), das Manövrieren nach UIM und
// der Parallelslalom aus der WM 2025 (je 194 Versuche). Einzelne Ergebnisse oder Namen stehen
// bewusst nicht im Repo, die Listen liegen in private/.
// Zwei Annahmen stammen nicht aus den Listen, weil dort nur der Mittelwert steht: die Streuung
// zwischen den Stoppuhren und wie oft eine dritte Zeit dabei ist.

/** Stoppuhr: 2 bis 3 Zeiten als „1,2345“. Lichtschranke: genau eine Zeit als „85,34“. */
export type Zeitnahme = 'stoppuhr' | 'lichtschranke'

type Stand = Pick<AppState, 'regelwerk' | 'aufbau' | 'tor5MitParcours' | 'boegen' | 'numbers' | 'eingaben'>
type Zufall = () => number

interface Profil {
  /** Gefahrene Zeit in Sekunden: unteres Quartil, Median, oberes Quartil. */
  zeit: [number, number, number]
  /** Wahrscheinlichkeit je Bojen-Zelle. */
  boje: number
  /** Abweichende Wahrscheinlichkeit je Zelle an diesen Stellen; ohne Angabe gilt `boje`. */
  start?: number
  ziel?: number
  tor5?: number
  /** Wahrscheinlichkeit eines Fehlers beim Anlegen je Start. */
  stegAn: number
  /** Wahrscheinlichkeit einer Disqualifikation je Start. */
  disq: number
  /** Wahrscheinlichkeit je Knoten. */
  knoten: number
}

type Ort = 'boje' | 'tor5' | 'mueb' | 'steg' | 'spalte'

/** Was einen Wettkampf statistisch ausmacht. */
interface Kennzahlen {
  /** Je Klasse; fehlt eine, gilt Klasse 5 (die WM kennt 6 und 7 nicht). */
  profile: Partial<Record<ClassId, Profil>>
  /** Fehler je Start an Stellen, die sich zwischen den Klassen kaum unterscheiden. */
  fehlerJeStart: Record<string, number>
  /**
   * Wie oft die Codes vorkamen, in der Nummerierung der Regelwerke. Was hier fehlt, kam nicht vor
   * oder gilt erst ab einer bestimmten Klasse und wird nicht gezogen.
   */
  codeHaeufigkeit: Record<string, number>
  /** Codes für den 2. und 3. Versuch stehen auch als „2x7“: Anteil der Wiederholungen. */
  wiederholt: Record<string, number>
  /** Anteil der Fehler-Zellen mit einem zweiten Code. */
  zweiterCode: number
  /** Wo Disqualifikationen standen und welche Buchstaben dort. `spalte` ist die Spalte Disq. */
  disqOrte: Record<Ort, { anteil: number; buchstaben: Record<string, number> }>
  /** Streuung derselben Person von Lauf zu Lauf in Sekunden. */
  laufStreuung: number
  /** Anteil der Läufe, die deutlich länger dauern, z. B. durch einen wiederholten Versuch. */
  patzer: number
}

const DM_2026: Kennzahlen = {
  profile: {
    E: { zeit: [79, 82, 95], boje: 0.05, stegAn: 0.43, disq: 0.25, knoten: 0.23 },
    1: { zeit: [68, 71, 81], boje: 0.12, stegAn: 0.41, disq: 0.08, knoten: 0.13 },
    2: { zeit: [70, 74, 80], boje: 0.1, stegAn: 0.17, disq: 0.05, knoten: 0.03 },
    3: { zeit: [74, 78, 83], boje: 0.06, stegAn: 0.18, disq: 0.05, knoten: 0.04 },
    4: { zeit: [76, 83, 94], boje: 0.11, stegAn: 0.04, disq: 0.24, knoten: 0.02 },
    5: { zeit: [100, 111, 117], boje: 0.03, stegAn: 0.03, disq: 0.23, knoten: 0.01 },
    6: { zeit: [102, 112, 123], boje: 0.04, stegAn: 0.03, disq: 0.31, knoten: 0 },
    7: { zeit: [108, 119, 131], boje: 0.05, stegAn: 0.12, disq: 0.29, knoten: 0 },
  },
  fehlerJeStart: { 'katalog:stegAblegen': 0.02, 'katalog:tor5': 0.03, 'katalog:mueb': 0.38 },
  codeHaeufigkeit: { 1: 7, 3: 8, 7: 28, 8: 14, 11: 4, 12: 32, 14: 25, 15: 10, 17: 57, 18: 7, 19: 15 },
  wiederholt: { 7: 0.15, 19: 0.3 },
  zweiterCode: 0.2,
  disqOrte: {
    boje: { anteil: 32, buchstaben: { J: 26, G: 4, H: 2 } },
    tor5: { anteil: 23, buchstaben: { J: 22, G: 1 } },
    mueb: { anteil: 23, buchstaben: { J: 7, D: 6, C: 4, H: 2, G: 2, L: 1, F: 1 } },
    steg: { anteil: 1, buchstaben: { I: 1 } },
    spalte: { anteil: 10, buchstaben: { D: 6, C: 3, G: 3, A: 1 } },
  },
  laufStreuung: 2.8,
  patzer: 0.1,
}

// Für beide WM-Tabellen gilt: Je Klasse gab es nur 20 bis 44 Versuche. Die Quoten sind deshalb
// mit dem Schnitt aller Klassen geglättet (mit dem Gewicht von zehn Versuchen), sonst käme in
// manchen Klassen nie eine Disqualifikation vor. Die Codes und Buchstaben sind auf die Nummern
// von regelwerke/uim-2026.yaml umgeschrieben, die Legende der WM nummeriert anders. Geschrieben
// wie „2x7“ hat die WM keinen Code.

/**
 * Manövrieren nach UIM, beide Versuche. Fehler beim Anlegen sind nach ihren Codes gezählt, weil
 * die Liste sie in einigen Klassen unter „Pon. dep.“ führt. Die Buchstaben stehen dort meist nur
 * in der Spalte Error Code: Die Stellen von J sind wie bei der DM verteilt.
 */
const WM_MANOEVRIEREN: Kennzahlen = {
  profile: {
    E: { zeit: [71, 74, 85], boje: 0.02, start: 0.003, ziel: 0.15, tor5: 0.12, stegAn: 0.3, disq: 0.09, knoten: 0.003 },
    1: { zeit: [75, 79, 88], boje: 0.1, start: 0.003, ziel: 0.02, tor5: 0.05, stegAn: 0.14, disq: 0.04, knoten: 0.003 },
    2: { zeit: [77, 82, 88], boje: 0.03, start: 0.003, ziel: 0.01, tor5: 0.13, stegAn: 0.06, disq: 0.02, knoten: 0.003 },
    3: { zeit: [76, 84, 95], boje: 0.06, start: 0.003, ziel: 0.02, tor5: 0.16, stegAn: 0.03, disq: 0.04, knoten: 0.003 },
    4: { zeit: [73, 77, 83], boje: 0.06, start: 0.003, ziel: 0.06, tor5: 0.08, stegAn: 0.08, disq: 0.09, knoten: 0.003 },
    5: { zeit: [100, 108, 114], boje: 0.01, start: 0.003, ziel: 0.01, tor5: 0.05, stegAn: 0.09, disq: 0.11, knoten: 0.003 },
  },
  fehlerJeStart: { 'katalog:stegAblegen': 0.02, 'katalog:tor5': 0.05, 'katalog:mueb': 0.37 },
  codeHaeufigkeit: { 1: 7, 3: 4, 7: 9, 9: 7, 11: 1, 12: 4, 14: 2, 15: 1, 17: 14, 18: 14, 19: 10, 20: 3, 21: 1 },
  wiederholt: {},
  zweiterCode: 0.2,
  disqOrte: {
    boje: { anteil: 5, buchstaben: { J: 5 } },
    tor5: { anteil: 4, buchstaben: { J: 4 } },
    mueb: { anteil: 3, buchstaben: { Q: 2, J: 1 } },
    steg: { anteil: 0, buchstaben: {} },
    spalte: { anteil: 4, buchstaben: { F: 3, D: 1 } },
  },
  laufStreuung: 2.8,
  patzer: 0.15,
}

/**
 * Parallelslalom, Vorlauf auf beiden Parcours. Start und Ziel sind hier je eine Zelle je Start.
 * „Nicht gestartet“ zählt nicht mit, dafür gäbe es keine Zeit. Dass kleine Boote auf Parcours A
 * rund 6 bis 7 Sekunden langsamer waren als auf B, steckt nur in der Breite der Quartile: Die
 * Listen kennen den Parcours noch nicht.
 */
const WM_PARALLEL: Kennzahlen = {
  profile: {
    E: { zeit: [71, 73, 81], boje: 0.02, start: 0.16, ziel: 0.27, stegAn: 0.04, disq: 0.04, knoten: 0 },
    1: { zeit: [68, 72, 78], boje: 0.01, start: 0.06, ziel: 0.16, stegAn: 0.1, disq: 0.1, knoten: 0 },
    2: { zeit: [65, 70, 72], boje: 0.005, start: 0.05, ziel: 0.09, stegAn: 0.01, disq: 0.01, knoten: 0 },
    3: { zeit: [67, 70, 73], boje: 0.01, start: 0.04, ziel: 0.11, stegAn: 0.01, disq: 0.01, knoten: 0 },
    4: { zeit: [57, 58, 60], boje: 0.005, start: 0.05, ziel: 0.06, stegAn: 0.01, disq: 0.005, knoten: 0 },
    5: { zeit: [55, 58, 60], boje: 0.005, start: 0.07, ziel: 0.08, stegAn: 0.02, disq: 0.005, knoten: 0 },
  },
  fehlerJeStart: { 'katalog:stegAblegen': 0.03 },
  codeHaeufigkeit: { 3: 5, 7: 3, 9: 3 },
  wiederholt: {},
  zweiterCode: 0.1,
  disqOrte: {
    boje: { anteil: 4, buchstaben: { J: 4 } },
    tor5: { anteil: 0, buchstaben: {} },
    mueb: { anteil: 0, buchstaben: {} },
    steg: { anteil: 0, buchstaben: {} },
    spalte: { anteil: 1, buchstaben: { J: 1 } },
  },
  laufStreuung: 1.5,
  patzer: 0.03,
}

function kennzahlenFuer(regelwerk: string, disziplin: string): Kennzahlen {
  if (disziplin === 'parallel') return WM_PARALLEL
  return regelwerk.startsWith('uim') ? WM_MANOEVRIEREN : DM_2026
}

/** Quartile liegen so viele Standardabweichungen vom Median entfernt. */
const QUARTIL_ABSTAND = 0.674
/** Annahme: Abweichung einer Stoppuhr von der gefahrenen Zeit in Sekunden. */
const STOPPUHR_STREUUNG = 0.15
/** Annahme: Anteil der Läufe mit einer dritten Stoppuhr-Zeit. */
const DRITTE_ZEIT = 0.5

function normal(zufall: Zufall): number {
  return Math.sqrt(-2 * Math.log(1 - zufall())) * Math.cos(2 * Math.PI * zufall())
}

function waehle<T>(liste: T[], gewicht: (t: T) => number, zufall: Zufall): T | undefined {
  let rest = zufall() * liste.reduce((s, t) => s + gewicht(t), 0)
  return liste.find((t) => (rest -= gewicht(t)) < 0)
}

/** Die übliche Zeit eines Starters in Sekunden; nach unten und oben verschieden breit gestreut. */
function grundzeit({ zeit: [q1, median, q3] }: Profil, zufall: Zufall): number {
  const z = Math.max(-2, Math.min(2.5, normal(zufall)))
  return median + (z * (z < 0 ? median - q1 : q3 - median)) / QUARTIL_ABSTAND
}

/** Die gefahrene Zeit eines Laufs in Hundertstel. */
function laufzeit(grund: number, k: Kennzahlen, zufall: Zufall): number {
  const patzer = zufall() < k.patzer ? 5 + zufall() * 15 : 0
  return Math.round((grund + normal(zufall) * k.laufStreuung + patzer) * 100)
}

/**
 * Die Lichtschranke schreibt in die elektronische Spalte, die Stoppuhren in die übrigen. Fehlt
 * die passende Spalte, nehmen sie die anderen. Erst die ersten Spalten aller Zeit-Listen
 * („zeit1“, „zeit1~2“, „zeit2“ …).
 */
function zeitWerte(felder: Feld[], zeit: number, zeitnahme: Zeitnahme, zufall: Zufall): Record<string, string> {
  const sortiert = [...felder].sort((a, b) => (a.kennung < b.kennung ? -1 : 1))
  const elektronisch = sortiert.filter((f) => f.geraet === 'elektronisch')
  const stoppuhren = sortiert.filter((f) => f.geraet !== 'elektronisch')
  if (zeitnahme === 'lichtschranke') return { [(elektronisch[0] ?? sortiert[0]).kennung]: formatSeconds(zeit) }
  const anzahl = zufall() < DRITTE_ZEIT ? 3 : 2
  return Object.fromEntries(
    (stoppuhren.length > 0 ? stoppuhren : sortiert)
      .slice(0, anzahl)
      .map((f) => [f.kennung, formatMinutenEingabe(zeit + Math.round(normal(zufall) * STOPPUHR_STREUUNG * 100))]),
  )
}

function fehlerCodes(feld: Feld, k: Kennzahlen, zufall: Zufall): string {
  const haeufig = (code: string) => k.codeHaeufigkeit[code] ?? 0
  const kandidaten = (feld.katalog ?? []).map((e) => e.code).filter((c) => haeufig(c) > 0)
  const erster = waehle(kandidaten, haeufig, zufall)
  if (!erster) return ''
  const zweiter = zufall() < k.zweiterCode ? waehle(kandidaten.filter((c) => c !== erster), haeufig, zufall) : undefined
  return [erster, ...(zweiter ? [zweiter] : [])]
    .map((c) => (zufall() < (k.wiederholt[c] ?? 0) ? `2x${c}` : c))
    .join(', ')
}

/** Die Quote einer Bojen-Zelle; Start, Ziel und Tor 5 können abweichen. */
function bojenQuote(feld: Feld, profil: Profil): number {
  const stelle = feld.kennung.split('|')[0]
  const abweichend = stelle === 'start' ? profil.start : stelle === 'ziel' ? profil.ziel : stelle === 't5' ? profil.tor5 : undefined
  return abweichend ?? profil.boje
}

function ortVon(feld: Feld): Ort | null {
  if (feld.kind === 'buoy') return 'boje'
  if (feld.kind === 'disq') return 'spalte'
  if (feld.kind !== 'code') return null
  if (feld.kennung === 'katalog:tor5') return 'tor5'
  return feld.kennung === 'katalog:mueb' ? 'mueb' : 'steg'
}

/** Zieht Stelle und Buchstabe einer Disqualifikation; nur Buchstaben, die dort erlaubt sind. */
function disqualifikation(felder: Feld[], k: Kennzahlen, zufall: Zufall): { feld: Feld; buchstabe: string } | null {
  const erlaubt = (feld: Feld, ort: Ort) => Object.keys(k.disqOrte[ort].buchstaben).filter((b) => feld.gueltig(b))
  const orte = (Object.keys(k.disqOrte) as Ort[]).flatMap((ort) => {
    const zellen = felder.filter((f) => ortVon(f) === ort && erlaubt(f, ort).length > 0)
    return zellen.length > 0 ? [{ ort, zellen }] : []
  })
  const treffer = waehle(orte, (o) => k.disqOrte[o.ort].anteil, zufall)
  if (!treffer) return null
  const feld = treffer.zellen[Math.floor(zufall() * treffer.zellen.length)]
  const buchstaben = k.disqOrte[treffer.ort].buchstaben
  const buchstabe = waehle(erlaubt(feld, treffer.ort), (b) => buchstaben[b], zufall)
  return buchstabe ? { feld, buchstabe } : null
}

/** Die Felder der angezeigten Bögen je Lauf; Freitext und handschriftliche Nummern bleiben außen vor. */
function angezeigteFelder(state: Stand): Map<string, Map<string, Feld>> {
  const out = new Map<string, Map<string, Feld>>()
  for (const bogen of state.boegen) {
    const schluessel = bogenLauf(state.aufbau, bogen)
    const felder = out.get(schluessel) ?? new Map<string, Feld>()
    for (const feld of listenFelder(bogen.typeId, bogen.klasse)) {
      if (feld.kind !== 'text') felder.set(feld.kennung, feld)
    }
    out.set(schluessel, felder)
  }
  return out
}

/** Stehen auf den angezeigten Bögen schon Werte, die das Einfügen ersetzen würde? */
export function beispielwerteErsetzen(state: Stand): boolean {
  return [...angezeigteFelder(state)].some(([schluessel, felder]) => {
    const { klasse } = zerlegeLauf(schluessel)
    return (state.numbers[klasse as ClassId] ?? []).some((nr) => {
      const werte = state.eingaben[schluessel]?.[nr] ?? {}
      return [...felder.keys()].some((kennung) => kennung in werte)
    })
  })
}

/**
 * Ersetzt die Werte der angezeigten Bögen durch Zufallswerte. Andere Listen, Bemerkungen und
 * Leerzeilen bleiben. Eine Disqualifikation trifft eine Stelle im ganzen Aufbau und erscheint
 * nur, wenn deren Liste angezeigt ist: Eine einzelne Liste hat so nicht die Quote des ganzen Laufs.
 */
export function beispielEingaben(state: Stand, zeitnahme: Zeitnahme, zufall: Zufall = Math.random): Eingaben {
  const anzeige = angezeigteFelder(state)
  const disziplin = getAufbau(state.aufbau).disziplin
  const k = kennzahlenFuer(state.regelwerk, disziplin)
  const profilVon = (klasse: ClassId): Profil => k.profile[klasse] ?? k.profile[5]!
  const hatZeit = (schluessel: string) => [...(anzeige.get(schluessel)?.values() ?? [])].some((f) => f.kind === 'time')
  const grundzeiten = new Map<string, number>()

  /** Dieselbe Person bleibt über die Läufe ähnlich schnell, auch wenn sie einzeln gefüllt werden. */
  const grundzeitVon = (klasse: ClassId, nr: string): number => {
    const schluessel = `${klasse}/${nr}`
    const bekannt = grundzeiten.get(schluessel)
    if (bekannt !== undefined) return bekannt
    const felder = felderJeKennung(klasse, aufbauOrder(state.aufbau, state.tor5MitParcours))
    const bisher = LAEUFE.map((l) => laufSchluessel(disziplin, klasse, l))
      .filter((s) => !hatZeit(s))
      .flatMap((s) => mittlereZeit(state.eingaben[s]?.[nr] ?? {}, felder) ?? [])
    const grund = bisher.length > 0 ? bisher.reduce((a, b) => a + b, 0) / bisher.length / 100 : grundzeit(profilVon(klasse), zufall)
    grundzeiten.set(schluessel, grund)
    return grund
  }

  const fehlerQuote = (feld: Feld, profil: Profil, lauf: number): number => {
    if (feld.kind === 'buoy') return lauf === OHNE_LAUF ? profil.knoten : bojenQuote(feld, profil)
    return feld.kennung === 'katalog:stegAnlegen' ? profil.stegAn : (k.fehlerJeStart[feld.kennung] ?? 0)
  }

  /** Alle Stellen des Aufbaus, an denen ein Lauf disqualifiziert werden kann. */
  const aufbauFelder = (klasse: ClassId, felder: Map<string, Feld>): Feld[] => {
    const alle = new Map(felder)
    for (const typeId of aufbauOrder(state.aufbau, state.tor5MitParcours)) {
      if (!positionAllowsClass(typeId, klasse)) continue
      for (const feld of listenFelder(typeId, klasse)) if (!alle.has(feld.kennung)) alle.set(feld.kennung, feld)
    }
    return [...alle.values()]
  }

  const eingaben = { ...state.eingaben }
  for (const [schluessel, felder] of anzeige) {
    const zerlegt = zerlegeLauf(schluessel)
    const klasse = zerlegt.klasse as ClassId
    const profil = profilVon(klasse)
    const zeitFelder = [...felder.values()].filter((f) => f.kind === 'time')
    const zeilen = { ...eingaben[schluessel] }

    for (const nr of state.numbers[klasse] ?? []) {
      const werte = { ...zeilen[nr] }
      for (const kennung of felder.keys()) delete werte[kennung]

      for (const feld of felder.values()) {
        if (feld.kind !== 'buoy' && feld.kind !== 'code') continue
        if (zufall() >= fehlerQuote(feld, profil, zerlegt.lauf)) continue
        const wert = feld.kind === 'buoy' ? '5' : feld.gueltig(fehlerCodes(feld, k, zufall))
        if (wert) werte[feld.kennung] = wert
      }

      if (zeitFelder.length > 0) {
        Object.assign(werte, zeitWerte(zeitFelder, laufzeit(grundzeitVon(klasse, nr), k, zufall), zeitnahme, zufall))
      }

      if (zerlegt.lauf !== OHNE_LAUF && zufall() < profil.disq) {
        const treffer = disqualifikation(aufbauFelder(klasse, felder), k, zufall)
        if (treffer && felder.has(treffer.feld.kennung)) {
          const { kennung } = treffer.feld
          werte[kennung] = treffer.feld.gueltig(werte[kennung] ? `${werte[kennung]}, ${treffer.buchstabe}` : treffer.buchstabe)
        }
      }

      if (Object.keys(werte).length > 0) zeilen[nr] = werte
      else delete zeilen[nr]
    }

    if (Object.keys(zeilen).length > 0) eingaben[schluessel] = zeilen
    else delete eingaben[schluessel]
  }
  return eingaben
}
