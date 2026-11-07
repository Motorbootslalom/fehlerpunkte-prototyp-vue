import { beforeEach, describe, expect, it } from 'vitest'
import { bundledConfig, getBeschriftungen, getSheetDef, initConfig } from '../config/active'
import { defaultState } from '../state/initState'
import { reducer, type Action } from '../state/store'
import type { AppState, Bogen, ClassId, Lauf } from '../types'
import { aktuellerListenStand, ergebnisGruppen, gesamtSchluessel, klassenErgebnis, punkteText, type GesamtZeile, type LaufZeile } from './ergebnis'
import { formatStarter, parseStarter, vergleicheNr } from './starter'

beforeEach(() => initConfig(bundledConfig()))

const nummern = (...nr: string[]) => ({ ...defaultState().numbers, '4': nr })

/** Trägt für einen Starter Zellen je Position ein, so wie es die Bögen tun. */
function eintragen(state: AppState, lauf: Lauf, nr: string, eingaben: Record<string, Record<string, string>>, klasse: ClassId = '4'): AppState {
  let out = state
  for (const [typeId, felder] of Object.entries(eingaben)) {
    const bogen: Bogen = { id: 'x', typeId, klasse, lauf }
    for (const [zelle, value] of Object.entries(felder)) {
      out = reducer(out, { type: 'SET_VALUE', bogen, cell: `${nr}:${zelle}`, value })
    }
  }
  return out
}

/** Ein Lauf mit Zeiten in Sekunden; Strafpunkte und Disq. kommen über die Bögen dazu. */
function laufMitZeiten(state: AppState, lauf: Lauf, zeiten: Record<string, number>): AppState {
  return Object.entries(zeiten).reduce(
    (s, [nr, sek]) => eintragen(s, lauf, nr, { zeit: { zeit1: `${sek},00` } }),
    state,
  )
}

const basis = (...nr: string[]): AppState => ({ ...defaultState(), numbers: nummern(...nr) })
const ergebnis = (state: AppState, klasse: ClassId = '4') => klassenErgebnis(state, klasse)!
const zeile = (zeilen: LaufZeile[], nr: string) => zeilen.find((z) => z.nr === nr)!
const gesamt = (state: AppState, nr: string): GesamtZeile => ergebnis(state).gesamt.zeilen.find((z) => z.nr === nr)!
const reihenfolge = (zeilen: Array<{ nr: string }>) => zeilen.map((z) => z.nr)

describe('punkteText', () => {
  it('zeigt Punkte, „disq.“ statt einer Zahl und bleibt leer, solange die Zeit fehlt', () => {
    expect(punkteText(false, 8169)).toBe('81,69')
    expect(punkteText(true, null)).toBe('disq.')
    expect(punkteText(false, null)).toBe('')
  })
})

describe('Spalten der Ergebnisliste', () => {
  const titel = (state: Pick<AppState, 'aufbau' | 'tor5MitParcours'>, klasse: string) =>
    ergebnisGruppen(state, klasse).map((g) => g.label)
  const alcatraz = { aufbau: 'alcatraz', tor5MitParcours: false }

  it('folgt für Klasse 4 der Liste der DM', () => {
    expect(titel(alcatraz, '4')).toEqual(['Steg AB', 'Start', '1 H', '2 H', '3 H', '4 H', '5', '4 R', '3 R', '2 R', 'MüB', 'Ziel', 'Steg AN'])
    const tor5 = ergebnisGruppen(alcatraz, '4').find((g) => g.label === '5')!
    expect(tor5.blaetter.map((b) => b.label)).toEqual(['L', 'R', 'E', 'L', 'R'])
  })

  it('zeigt je Klasse nur, was sie fährt', () => {
    expect(titel(alcatraz, '3')).toEqual(['Steg AB', 'Start', '1 H', '2 H', '3 H', '4 H', '5', '4 R', '3 R', '2 R', '1 R', 'Ziel', 'Steg AN'])
    expect(titel(alcatraz, '5')).toContain('S1')
    expect(titel(alcatraz, '5')).not.toContain('S2')
    expect(titel(alcatraz, '7').filter((t) => t === '1 R')).toHaveLength(2)
  })

  it('folgt der Fahrt: Tor 1, Mann-über-Bord, Speedrunde, bei Klasse 7 noch einmal Tor 1', () => {
    expect(titel(alcatraz, '5').slice(-6)).toEqual(['2 R', '1 R', 'MüB', 'S1', 'Ziel', 'Steg AN'])
    expect(titel(alcatraz, '7').slice(-8)).toEqual(['2 R', '1 R', 'MüB', 'S1', 'S2', '1 R', 'Ziel', 'Steg AN'])
  })

  it('gilt für jeden Aufbau derselben Disziplin gleich', () => {
    const bezeichnet = (aufbau: string) => ergebnisGruppen({ aufbau, tor5MitParcours: false }, '7').map((g) => g.label)
    for (const aufbau of ['frontal', 'berlin', 'bawue', 'alcatrazdm26']) expect(bezeichnet(aufbau)).toEqual(bezeichnet('alcatraz'))
  })

  it('hat für den Parallelslalom eigene Spalten', () => {
    expect(titel({ aufbau: 'parallel', tor5MitParcours: false }, '4')).toEqual(
      ['Steg AB', 'Start', '1', '2', '3', '4', '5', '4', '3', '2', '1', 'Ziel', 'Steg AN'],
    )
  })

  it('nennt die Bojen immer R und L, egal welche Bezeichnung die Bögen haben', () => {
    const standard = ergebnisGruppen(defaultState(), '7')
    expect(standard[2].blaetter.map((b) => b.label)).toEqual(['L', 'R'])
    for (const { id } of getBeschriftungen()) {
      const state = reducer(defaultState(), { type: 'SET_BESCHRIFTUNG', beschriftung: id })
      expect(ergebnisGruppen(state, '7')).toEqual(standard)
    }
  })

  it('lässt den Bögen ihre gewählte Bezeichnung', () => {
    reducer(defaultState(), { type: 'SET_BESCHRIFTUNG', beschriftung: 'ls' })
    const koepfe = getSheetDef('gate135').columns.flatMap((c) => c.sub ?? [])
    expect(koepfe.length).toBeGreaterThan(0)
    expect(koepfe.every((k) => /[LS]$/.test(k))).toBe(true)
  })
})

describe('Ergebnisliste eines Laufs', () => {
  it('liefert nichts, solange nichts eingetragen ist', () => {
    expect(klassenErgebnis(basis('401'), '4')).toBeNull()
  })

  it('rechnet die Zeit in Punkte um und zählt die Strafpunkte dazu', () => {
    const state = eintragen(basis('401'), 1, '401', {
      zeit: { zeit1: '1,2169' },
      gate135: { 't1a#0': '5' },
      gate245: { 't2a#1': '5' },
      steg: { fehlerAB: '3', fehlerAN: '9' },
      mueb: { fehler: '13, 14' },
      tor5: { fehler: '1' },
    })
    const z = ergebnis(state).laeufe[0].nachNummer[0]
    expect(z.zeit).toBe(8169)
    expect(z.strafpunkte).toBe(5 + 5 + 5 + 10 + 10 + 20)
    expect(z.gesamt).toBe(8169 + 5500)
  })

  it('mittelt die Zeiten der Zeitnehmer, auch über mehrere Zeit-Listen', () => {
    const eineListe = eintragen(basis('401'), 1, '401', { zeit: { zeit1: '81,00', zeit2: '82,00', zeit3: '83,00' } })
    expect(ergebnis(eineListe).laeufe[0].nachNummer[0].zeit).toBe(8200)

    const dreiListen = eintragen(reducer(basis('401'), { type: 'SET_AUFBAU', aufbau: 'alcatrazdm26' }), 1, '401', {
      'zeit-1': { zeit1: '81,00' },
      'zeit-2': { zeit1: '82,00' },
      'zeit-3': { zeit1: '84,00' },
    })
    expect(ergebnis(dreiListen).laeufe[0].nachNummer[0].zeit).toBe(8233)
  })

  it('sortiert nach Startnummer und nach Platz', () => {
    const state = laufMitZeiten(basis('403', '401', '402'), 1, { '401': 90, '402': 70, '403': 80 })
    const { nachNummer, nachPlatz } = ergebnis(state).laeufe[0]
    expect(reihenfolge(nachNummer)).toEqual(['401', '402', '403'])
    expect(nachNummer.map((z) => z.platz)).toEqual([3, 1, 2])
    expect(reihenfolge(nachPlatz)).toEqual(['402', '403', '401'])
    expect(nachPlatz.map((z) => z.platz)).toEqual([1, 2, 3])
  })

  it('gibt bei gleichen Punkten denselben Platz und überspringt den nächsten', () => {
    const state = laufMitZeiten(basis('401', '402', '403', '404'), 1, { '401': 80, '402': 70, '403': 70, '404': 90 })
    const { nachPlatz } = ergebnis(state).laeufe[0]
    expect(nachPlatz.map((z) => [z.nr, z.platz])).toEqual([['402', 1], ['403', 1], ['401', 3], ['404', 4]])
  })

  it('setzt Disqualifizierte ohne Punkte gemeinsam hinter alle anderen', () => {
    let state = laufMitZeiten(basis('401', '402', '403', '404'), 1, { '401': 90, '402': 60, '403': 70, '404': 80 })
    state = eintragen(state, 1, '402', { gate135: { 't1a#0': 'J' } })
    state = eintragen(state, 1, '403', { steg: { disq: 'C' } })
    const { nachPlatz } = ergebnis(state).laeufe[0]
    expect(nachPlatz.map((z) => [z.nr, z.platz, z.gesamt])).toEqual([
      ['404', 1, 8000],
      ['401', 2, 9000],
      ['402', 3, null],
      ['403', 3, null],
    ])
  })

  it('zeigt Punkte und Buchstaben an ihrer Stelle, Disq. aus der Disq-Spalte nur im Schlüssel', () => {
    let state = laufMitZeiten(basis('401'), 1, { '401': 80 })
    state = eintragen(state, 1, '401', {
      gate135: { 't1a#0': '5', 't1a#1': 'J', 'start#0': '5', disq: 'C' },
      gate245: { 'start#0': '10' },
      tor5: { fehler: '2' },
      mueb: { fehler: '17, D' },
    })
    const { gruppen, nachNummer } = ergebnis(state).laeufe[0]
    const zelleVon = (gruppe: string, blatt = 0) => {
      const blaetter = gruppen.flatMap((g) => g.blaetter.map((_, i) => ({ g: g.label, i })))
      return nachNummer[0].zellen[blaetter.findIndex((b) => b.g === gruppe && b.i === blatt)]
    }
    expect(zelleVon('1 H', 0)).toBe('J') // Links
    expect(zelleVon('1 H', 1)).toBe('5') // Rechts
    expect(zelleVon('Start')).toBe('15')
    expect(zelleVon('5', 2)).toBe('5') // Einfahrt: Code 2
    expect(zelleVon('MüB')).toBe('5, D')
    expect(nachNummer[0].zellen.join('|')).not.toContain('C')
    expect(nachNummer[0].disq).toBe(true)
    expect(nachNummer[0].schluessel).toBe('2, 17, C, D, J')
  })

  it('sortiert den Fehler-Schlüssel natürlich und nennt Buchstaben einmal', () => {
    let state = laufMitZeiten(basis('401'), 1, { '401': 80 })
    state = eintragen(state, 1, '401', {
      steg: { fehlerAB: '3', fehlerAN: '7', disq: 'C' },
      mueb: { fehler: '17, 18' },
      parcours: { disq: 'A' },
      gate135: { 't1a#0': 'J', 't1a#1': 'J' },
    })
    expect(ergebnis(state).laeufe[0].nachNummer[0].schluessel).toBe('3, 7, 17, 18, A, C, J')
  })

  it('sortiert einen mehrfachen Code nach dem Code, nicht nach dem Faktor', () => {
    let state = laufMitZeiten(basis('401'), 1, { '401': 80 })
    state = eintragen(state, 1, '401', { steg: { fehlerAB: '3' }, mueb: { fehler: '2x17, 18' } })
    expect(ergebnis(state).laeufe[0].nachNummer[0].schluessel).toBe('3, 2x17, 18')
  })

  it('lässt Starter ohne Zeit ohne Platz am Ende stehen', () => {
    let state = laufMitZeiten(basis('401', '402', '403'), 1, { '402': 80 })
    state = eintragen(state, 1, '401', { gate135: { 't1a#0': '5' } })
    const { nachPlatz } = ergebnis(state).laeufe[0]
    expect(nachPlatz.map((z) => [z.nr, z.platz, z.gesamt])).toEqual([['402', 1, 8000], ['401', null, null], ['403', null, null]])
    expect(zeile(nachPlatz, '401').strafpunkte).toBe(5)
  })

  it('wertet „Nicht gestartet“ ohne Zeit als Disqualifikation', () => {
    let state = laufMitZeiten(basis('401', '402'), 1, { '401': 80 })
    state = eintragen(state, 1, '402', { steg: { disq: 'X' } })
    const z = zeile(ergebnis(state).laeufe[0].nachPlatz, '402')
    expect([z.platz, z.gesamt, z.zeit, z.schluessel]).toEqual([2, null, null, 'X'])
  })

  it('zählt eine Leerzeile unter ihrer handschriftlichen Nummer', () => {
    let state = laufMitZeiten(basis('401'), 1, { '401': 80 })
    state = eintragen(state, 1, '_p0_x0', { zeit: { __nr: '499', zeit1: '70,00' }, gate135: { 't1a#0': '5' } })
    const { nachPlatz } = ergebnis(state).laeufe[0]
    expect(nachPlatz.map((z) => [z.nr, z.gesamt])).toEqual([['499', 7500], ['401', 8000]])
  })

  it('wertet entfernte Startnummern nicht, behält ihre Werte aber', () => {
    const state = laufMitZeiten(basis('401', '402'), 1, { '401': 80, '402': 70 })
    const ohne = reducer(state, { type: 'SET_NUMBERS', klasse: '4', numbers: ['401'] })
    expect(reihenfolge(ergebnis(ohne).laeufe[0].nachNummer)).toEqual(['401'])
    const wieder = reducer(ohne, { type: 'SET_NUMBERS', klasse: '4', numbers: ['401', '402'] })
    expect(zeile(ergebnis(wieder).laeufe[0].nachPlatz, '402').platz).toBe(1)
  })

  it('übernimmt die Namen der Starter', () => {
    let state = laufMitZeiten(basis('401'), 1, { '401': 80 })
    state = reducer(state, { type: 'SET_STARTER', klasse: '4', starter: { '401': { name: 'Muster', vorname: 'Anna Lena' } } })
    expect(ergebnis(state).laeufe[0].nachNummer[0]).toMatchObject({ name: 'Muster', vorname: 'Anna Lena' })
  })

  it('bleibt beim Wechsel des Aufbaus gleich', () => {
    let state = laufMitZeiten(basis('401', '402'), 1, { '401': 80, '402': 70 })
    state = eintragen(state, 1, '401', { gate135: { 't1a#0': '5', 't5#0': '10' }, tor5: { fehler: '1' }, parcours: { disq: 'J' } })
    state = eintragen(state, 1, '402', { gate245: { 't2a#0': '5' }, mueb: { fehler: '13' } })
    const vorher = ergebnis(state)
    for (const aufbau of ['frontal', 'berlin', 'bawue', 'alcatrazdm26', 'alcatraz']) {
      state = reducer(state, { type: 'SET_AUFBAU', aufbau })
      expect(ergebnis(state).laeufe[0].nachNummer).toEqual(vorher.laeufe[0].nachNummer)
    }
  })

  it('hat je Disziplin eigene Ergebnisse', () => {
    const alcatraz = laufMitZeiten(basis('401'), 1, { '401': 80 })
    const parallel = reducer(alcatraz, { type: 'SET_AUFBAU', aufbau: 'parallel' })
    expect(klassenErgebnis(parallel, '4')).toBeNull()
    const mitWert = laufMitZeiten(parallel, 2, { '401': 60 })
    expect(ergebnis(mitWert).laeufe.map((l) => l.lauf)).toEqual([2])
    const zurueck = reducer(mitWert, { type: 'SET_AUFBAU', aufbau: 'alcatraz' })
    expect(ergebnis(zurueck).laeufe.map((l) => l.lauf)).toEqual([1])
  })
})

describe('Gesamtliste', () => {
  /** Die Läufe je Starter; `null` = disqualifiziert. */
  function gefahren(zeiten: Record<string, Array<number | null>>): AppState {
    let state = basis(...Object.keys(zeiten))
    for (const [nr, jeLauf] of Object.entries(zeiten)) {
      jeLauf.forEach((sek, i) => {
        const lauf = (i + 1) as Lauf
        state = eintragen(state, lauf, nr, { zeit: { zeit1: `${sek ?? 80},00` } })
        if (sek === null) state = eintragen(state, lauf, nr, { parcours: { disq: 'J' } })
      })
    }
    return state
  }

  it('streicht genau den schlechtesten Lauf', () => {
    const z = gesamt(gefahren({ '401': [70, 90, 80] }), '401')
    expect(z.gestrichen).toBe(2)
    expect(z.ergebnis).toBe(15000)
    expect(z.gesamt).toBe(15000)
    expect(z.disq).toBe(false)
  })

  it('streicht eine Disqualifikation und wertet den Starter normal', () => {
    const state = gefahren({ '401': [null, 70, 80], '402': [71, 72, 73] })
    const z = gesamt(state, '401')
    expect(z.gestrichen).toBe(1)
    expect(z.ergebnis).toBe(15000)
    expect(z.platz).toBe(2)
    expect(gesamt(state, '402').platz).toBe(1)
  })

  it('streicht bei zwei Disqualifikationen nur eine und setzt den Starter auf den letzten Platz', () => {
    const state = gefahren({ '401': [null, null, 60], '402': [90, 91, 92], '403': [80, 81, null] })
    const z = gesamt(state, '401')
    expect(z.gestrichen).toBe(1)
    expect(z.disq).toBe(true)
    expect(z.ergebnis).toBeNull()
    expect(z.gesamt).toBeNull()
    expect(z.platz).toBe(3)
    expect(reihenfolge(ergebnis(state).gesamt.zeilen)).toEqual(['403', '402', '401'])
  })

  it('setzt auch bei drei Disqualifikationen auf den letzten Platz, ohne mehr zu streichen', () => {
    const state = gefahren({ '401': [null, null, null], '402': [90, 91, 92] })
    expect(gesamt(state, '401')).toMatchObject({ gestrichen: 1, disq: true, platz: 2 })
  })

  it('lässt mehrfach Disqualifizierte sich den letzten Platz teilen, nach Startnummer', () => {
    const state = gefahren({
      '403': [null, 70, null],
      '401': [90, null, null],
      '402': [80, 81, 82],
      '404': [70, 71, 72],
    })
    const { zeilen } = ergebnis(state).gesamt
    expect(zeilen.map((z) => [z.nr, z.platz])).toEqual([['404', 1], ['402', 2], ['401', 3], ['403', 3]])
    // Bei gleich schlechten Läufen ist der frühere gestrichen.
    expect(gesamt(state, '401').gestrichen).toBe(2)
    expect(gesamt(state, '403').gestrichen).toBe(1)
  })

  it('rechnet die Knoten dazu; sie können die Reihenfolge ändern', () => {
    let state = gefahren({ '401': [70, 70, 90], '402': [71, 71, 90] })
    state = eintragen(state, 1, '401', { knoten: { palstek: '5' } })
    const z = gesamt(state, '401')
    expect(z.knoten).toBe(5)
    expect(z.ergebnis).toBe(14000)
    expect(z.gesamt).toBe(14500)
    expect(reihenfolge(ergebnis(state).gesamt.zeilen)).toEqual(['402', '401'])
  })

  it('zählt die Knoten unabhängig vom Lauf des Bogens', () => {
    const state = eintragen(gefahren({ '401': [70, 70, 90] }), 3, '401', { knoten: { palstek: '5', klampe: '5' } })
    expect(gesamt(state, '401').knoten).toBe(10)
  })

  it('streicht bei nur einem Lauf nichts', () => {
    const state = laufMitZeiten(basis('401'), 1, { '401': 80 })
    expect(gesamt(state, '401')).toMatchObject({ gestrichen: null, ergebnis: 8000, platz: 1 })
    const disq = eintragen(state, 1, '401', { steg: { disq: 'C' } })
    expect(gesamt(disq, '401')).toMatchObject({ gestrichen: null, disq: true })
  })

  it('streicht bei zwei Läufen nichts und zählt beide', () => {
    const state = gefahren({ '401': [80, 70] })
    expect(gesamt(state, '401')).toMatchObject({ gestrichen: null, ergebnis: 15000, platz: 1 })
    expect(ergebnis(state).gesamt.laeufe).toEqual([1, 2])
  })

  it('setzt bei zwei Läufen schon eine Disqualifikation auf den letzten Platz', () => {
    const state = gefahren({ '401': [null, 60], '402': [90, 91], '403': [80, 81] })
    expect(gesamt(state, '401')).toMatchObject({ gestrichen: null, disq: true, ergebnis: null, gesamt: null, platz: 3 })
    expect(reihenfolge(ergebnis(state).gesamt.zeilen)).toEqual(['403', '402', '401'])
  })

  it('lässt bei zwei Läufen einen Starter mit leerem Lauf ohne Platz', () => {
    const state = gefahren({ '401': [70, 71], '402': [70] })
    expect(gesamt(state, '402')).toMatchObject({ gestrichen: null, ergebnis: null, gesamt: null, platz: null })
  })

  describe('mit „Schon ab zwei Läufen einen streichen“', () => {
    const abZwei = (state: AppState) => reducer(state, { type: 'SET_STREICHEN_AB_ZWEI', on: true })

    it('streicht bei zwei Läufen den schlechteren', () => {
      const state = abZwei(gefahren({ '401': [80, 70] }))
      expect(gesamt(state, '401')).toMatchObject({ gestrichen: 1, ergebnis: 7000 })
    })

    it('streicht bei zwei Läufen eine Disqualifikation und wertet den Starter normal', () => {
      const state = abZwei(gefahren({ '401': [null, 70], '402': [80, 81] }))
      expect(gesamt(state, '401')).toMatchObject({ gestrichen: 1, disq: false, ergebnis: 7000, platz: 1 })
    })

    it('streicht bei zwei Läufen einen leeren', () => {
      const state = abZwei(gefahren({ '401': [70, 71], '402': [70] }))
      expect(gesamt(state, '402')).toMatchObject({ gestrichen: 2, ergebnis: 7000 })
    })

    it('streicht bei einem Lauf weiterhin nichts', () => {
      expect(gesamt(abZwei(gefahren({ '401': [80] })), '401')).toMatchObject({ gestrichen: null, ergebnis: 8000 })
    })

    it('ändert bei drei Läufen nichts', () => {
      const state = gefahren({ '401': [70, 90, 80], '402': [null, null, 60] })
      expect(ergebnis(abZwei(state)).gesamt).toEqual(ergebnis(state).gesamt)
    })
  })

  it('streicht einen fehlenden Lauf; fehlt mehr, bleibt der Starter ohne Platz', () => {
    let state = gefahren({ '401': [71, 72, 73], '402': [70, 71], '403': [70] } as Record<string, number[]>)
    state = eintragen(state, 1, '404', { steg: { disq: 'C' } })
    state = reducer(state, { type: 'SET_NUMBERS', klasse: '4', numbers: ['401', '402', '403', '404'] })
    expect(gesamt(state, '402')).toMatchObject({ gestrichen: 3, ergebnis: 14100, platz: 1 })
    expect(gesamt(state, '403')).toMatchObject({ gestrichen: 2, ergebnis: null, gesamt: null, platz: null })
    // Disq. plus zwei offene Läufe: Die Disq. ist gestrichen, das Ergebnis noch offen.
    expect(gesamt(state, '404')).toMatchObject({ gestrichen: 1, disq: false, platz: null })
    expect(reihenfolge(ergebnis(state).gesamt.zeilen)).toEqual(['402', '401', '403', '404'])
  })
})

describe('Namen der Starter', () => {
  it('liest Semikolon, Tabulator und Leerzeichen', () => {
    expect(parseStarter('401; Muster; Anna\n402\tBeispiel\tBen Paul\ne03 Test Eva Maria\n\n404')).toEqual({
      '401': { name: 'Muster', vorname: 'Anna' },
      '402': { name: 'Beispiel', vorname: 'Ben Paul' },
      E03: { name: 'Test', vorname: 'Eva Maria' },
    })
  })

  it('schreibt die Namen sortiert und liest sie unverändert wieder', () => {
    const starter = { '410': { name: 'B', vorname: 'Ben' }, '99': { name: 'A', vorname: 'Anna Lena' } }
    expect(formatStarter(starter)).toBe('99; A; Anna Lena\n410; B; Ben')
    expect(parseStarter(formatStarter(starter))).toEqual(starter)
  })

  it('ergänzt neue Nummern bei den Startnummern der Klasse', () => {
    const next = reducer(basis('401'), { type: 'SET_STARTER', klasse: '4', starter: parseStarter('401; A; B\n430; C; D') })
    expect(next.numbers['4']).toEqual(['401', '430'])
  })

  it('sortiert Startnummern natürlich', () => {
    expect(['E10', 'E2', '401', '99'].sort(vergleicheNr)).toEqual(['99', '401', 'E2', 'E10'])
  })
})

describe('Zeitstempel der Listen', () => {
  const zelle = (typeId: string, lauf: Lauf, cell: string, value: string, klasse: ClassId = '4'): Action => ({
    type: 'SET_VALUE',
    bogen: { id: 'x', typeId, klasse, lauf },
    cell,
    value,
  })
  /** Führt eine Aktion zum angegebenen Zeitpunkt aus, so wie es der Store tut. */
  function schritt(state: AppState, action: Action, zeit: number): AppState {
    const neu = reducer(state, action)
    return { ...neu, listenStand: aktuellerListenStand(neu, zeit) }
  }
  const lauf = (state: AppState, nummer: Lauf, klasse = '4') => state.listenStand[`manoevrieren/${klasse}/${nummer}`]?.zeit
  const gesamtZeit = (state: AppState, klasse = '4') => state.listenStand[gesamtSchluessel('manoevrieren', klasse)]?.zeit

  /** Zwei Läufe, zu den Zeitpunkten 100 und 200 eingetragen. */
  function zweiLaeufe(): AppState {
    let s = basis('401', '402')
    s = schritt(s, zelle('zeit', 1, '401:zeit1', '80,00'), 100)
    return schritt(s, zelle('zeit', 2, '401:zeit1', '81,00'), 200)
  }

  it('merkt sich je Liste die Zeit der letzten Änderung', () => {
    const s = zweiLaeufe()
    expect([lauf(s, 1), lauf(s, 2), gesamtZeit(s)]).toEqual([100, 200, 200])
    const danach = schritt(s, zelle('zeit', 1, '402:zeit1', '85,00'), 300)
    expect([lauf(danach, 1), lauf(danach, 2), gesamtZeit(danach)]).toEqual([300, 200, 300])
  })

  it('bleibt stehen, wenn sich auf der Liste nichts ändert', () => {
    const s = zweiLaeufe()
    // Zelle verlassen ohne Änderung, dieselbe Zeit anders getippt, eine Bemerkung
    const gleich = schritt(s, zelle('zeit', 1, '401:zeit1', '80,00'), 300)
    const anders = schritt(gleich, zelle('zeit', 1, '401:zeit1', '1,2000'), 400)
    const bemerkung = schritt(anders, zelle('steg', 1, '401:bemerkung', 'Motor aus'), 500)
    expect([lauf(bemerkung, 1), lauf(bemerkung, 2), gesamtZeit(bemerkung)]).toEqual([100, 200, 200])
  })

  it('ändert bei Knoten und der Streich-Regel nur die Gesamtliste', () => {
    const s = zweiLaeufe()
    const knoten = schritt(s, zelle('knoten', 1, '401:palstek', '5'), 300)
    expect([lauf(knoten, 1), lauf(knoten, 2), gesamtZeit(knoten)]).toEqual([100, 200, 300])
    const streichen = schritt(knoten, { type: 'SET_STREICHEN_AB_ZWEI', on: true }, 400)
    expect([lauf(streichen, 1), lauf(streichen, 2), gesamtZeit(streichen)]).toEqual([100, 200, 400])
  })

  it('lässt die Gesamtliste nie älter aussehen als einen Lauf', () => {
    const aktionen: Action[] = [
      zelle('mueb', 1, '401:fehler', '17'),
      // Anderer Code, gleiche Punkte: Auf der Gesamtliste ist das nicht zu sehen.
      zelle('mueb', 1, '401:fehler', '14'),
      zelle('gate135', 2, '401:t1a#0', '5'),
      zelle('steg', 1, '402:disq', 'C'),
      zelle('zeit', 2, '402:zeit1', '90,00'),
    ]
    let s = zweiLaeufe()
    aktionen.forEach((aktion, i) => {
      s = schritt(s, aktion, 300 + i)
      expect(gesamtZeit(s)).toBe(300 + i)
      expect(gesamtZeit(s)).toBeGreaterThanOrEqual(Math.max(lauf(s, 1)!, lauf(s, 2)!))
    })
  })

  it('trifft bei einem Namen alle Listen der Klasse, aber keine andere Klasse', () => {
    let s = schritt(zweiLaeufe(), zelle('zeit', 1, '301:zeit1', '80,00', '3'), 300)
    s = reducer(s, { type: 'SET_NUMBERS', klasse: '3', numbers: ['301'] })
    s = { ...s, listenStand: aktuellerListenStand(s, 400) }
    const vorher = lauf(s, 1, '3')
    const name = schritt(s, { type: 'SET_STARTER', klasse: '4', starter: { '401': { name: 'Muster', vorname: 'Anna' } } }, 500)
    expect([lauf(name, 1), lauf(name, 2), gesamtZeit(name)]).toEqual([500, 500, 500])
    expect(lauf(name, 1, '3')).toBe(vorher)
  })

  it('übersteht einen Aufbau- und Disziplin-Wechsel unverändert', () => {
    const s = zweiLaeufe()
    const frontal = schritt(s, { type: 'SET_AUFBAU', aufbau: 'frontal' }, 300)
    expect(frontal.listenStand).toEqual(s.listenStand)
    const parallel = schritt(frontal, { type: 'SET_AUFBAU', aufbau: 'parallel' }, 400)
    expect(parallel.listenStand).toEqual(s.listenStand)
    const zurueck = schritt(parallel, { type: 'SET_AUFBAU', aufbau: 'alcatraz' }, 500)
    expect(zurueck.listenStand).toEqual(s.listenStand)
  })

  it('erfasst einen Namen auch für die gerade nicht gewählte Disziplin zum richtigen Zeitpunkt', () => {
    const parallel = schritt(zweiLaeufe(), { type: 'SET_AUFBAU', aufbau: 'parallel' }, 300)
    const name = schritt(parallel, { type: 'SET_STARTER', klasse: '4', starter: { '401': { name: 'Muster', vorname: 'Anna' } } }, 400)
    const zurueck = schritt(name, { type: 'SET_AUFBAU', aufbau: 'alcatraz' }, 500)
    expect(lauf(zurueck, 1)).toBe(400)
  })

  it('vergisst eine Liste, deren Eingaben alle gelöscht sind', () => {
    const s = zweiLaeufe()
    const leer = schritt(s, zelle('zeit', 2, '401:zeit1', ''), 300)
    expect(lauf(leer, 2)).toBeUndefined()
    expect(lauf(leer, 1)).toBe(100)
  })
})

