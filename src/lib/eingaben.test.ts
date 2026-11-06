import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { bundledConfig, getSheetDef, initConfig } from '../config/active'
import { buildInitialState, defaultBoegen, defaultState } from '../state/initState'
import { createStore, reducer } from '../state/store'
import type { AppState, Bogen, ClassId, Lauf } from '../types'
import { bogenLauf, bogenLeser, wkrVon } from './eingaben'
import { NR_SPALTE, columnCellKeys, defFuerKlasse } from './scoring'

beforeEach(() => initConfig(bundledConfig()))

const bogen = (id: string, typeId: string, klasse: ClassId = '3', lauf: Lauf = 1): Bogen => ({ id, typeId, klasse, lauf })

/** Trägt je Position Zellen ein, so wie es die Bögen tun. MüB gibt es erst ab Klasse 4. */
function mitEingaben(
  eingaben: Record<string, Record<string, string>>,
  basis: AppState = defaultState(),
  klasse?: ClassId,
  lauf: Lauf = 1,
): AppState {
  let state = basis
  for (const [typeId, felder] of Object.entries(eingaben)) {
    const b = bogen('x', typeId, klasse ?? (typeId === 'mueb' ? '4' : '3'), lauf)
    for (const [cell, value] of Object.entries(felder)) state = reducer(state, { type: 'SET_VALUE', bogen: b, cell, value })
  }
  return state
}

/** Was eine Liste für diese Klasse und diesen Lauf zeigt. */
function zellen(state: AppState, typeId: string, klasse: ClassId = typeId === 'mueb' ? '4' : '3', lauf: Lauf = 1): Record<string, string> {
  const b = bogen('x', typeId, klasse, lauf)
  const lesen = bogenLeser(state, b)
  const out: Record<string, string> = {}
  for (const zeile of Object.keys(state.eingaben[bogenLauf(state.aufbau, b)] ?? {})) {
    const def = defFuerKlasse(getSheetDef(typeId), klasse)
    const schluessel = def.columns.filter((c) => c.kind !== 'sum').flatMap((c) => columnCellKeys(zeile, c))
    for (const k of [...schluessel, `${zeile}:${NR_SPALTE}`]) if (lesen(k)) out[k] = lesen(k)
  }
  return out
}

const wechsel = (state: AppState, aufbau: string) => reducer(state, { type: 'SET_AUFBAU', aufbau })

describe('Aufbau-Wechsel', () => {
  it('lässt Eingaben auf gemeinsamen Listen stehen', () => {
    const next = wechsel(
      mitEingaben({
        zeit: { '12:zeit1': '1,2345' },
        steg: { '12:fehlerAB': '3, 6', '12:bemerkung': 'Text' },
        tor5: { '12:fehler': '1', '12:disq': 'G' },
      }),
      'frontal',
    )
    expect(zellen(next, 'zeit')).toEqual({ '12:zeit1': '1,2345' })
    expect(zellen(next, 'steg')).toEqual({ '12:fehlerAB': '3, 6', '12:bemerkung': 'Text' })
    expect(zellen(next, 'tor5')).toEqual({ '12:fehler': '1', '12:disq': 'G' })
  })

  it('bleibt bei derselben Boje, auch wenn die Spalten anders sortiert sind', () => {
    // Alcatraz: Tor 1 hin [Rechts, Links]. Frontal: Tor 1 hin [Links, Rechts].
    const start = mitEingaben({ gate135: { '12:t1a#0': '5', '12:t1a#1': '10', '12:disq': 'G' } })
    const next = wechsel(start, 'frontal')
    expect(zellen(next, 'frontal135')).toEqual({ '12:t1a#1': '5', '12:t1a#0': '10', '12:disq': 'G' })
    const zurueck = wechsel(next, 'alcatraz')
    expect(zellen(zurueck, 'gate135')).toEqual({ '12:t1a#0': '5', '12:t1a#1': '10', '12:disq': 'G' })
  })

  it('nimmt den WKR-Namen zur entsprechenden Liste mit', () => {
    const start = reducer(defaultState(), { type: 'SET_WKR', bogen: bogen('x', 'gate135'), name: 'Name' })
    const next = wechsel(start, 'frontal')
    expect(wkrVon(next, bogen('x', 'frontal135'))).toBe('Name')
    expect(wkrVon(next, bogen('x', 'gate135'))).toBe('')
  })

  it('zeigt Bojen und Fehler auf der Liste, die sie im neuen Aufbau führt', () => {
    const start = mitEingaben({
      gate135: { '12:start#0': '5', '12:t1a#0': '10', '12:t5#1': '15', '12:disq': 'G' },
      gate245: { '12:start#0': '20' },
      tor5: { '12:fehler': '1' },
      mueb: { '12:fehler': '13' },
      parcours: { '12:bemerkung': 'nur dort' },
    })
    const next = wechsel(start, 'berlin')
    expect(zellen(next, 'bstartziel')).toEqual({ '12:start#0': '5', '12:start#1': '20' })
    expect(zellen(next, 'brechts')).toEqual({ '12:t1a#0': '10', '12:disq': 'G' })
    expect(zellen(next, 'blinks')).toEqual({ '12:t5#2': '15', '12:fehler': '1' })
    expect(zellen(next, 'brechts', '4')).toEqual({ '12:mueb': '13' })
    // Ohne entsprechende Liste bleibt die Bemerkung gespeichert und kommt beim Zurückwechseln wieder.
    expect(zellen(wechsel(next, 'alcatraz'), 'parcours')).toEqual({ '12:bemerkung': 'nur dort' })
    expect(zellen(wechsel(next, 'alcatraz'), 'gate135')).toEqual(zellen(start, 'gate135'))
  })

  it('findet Tor 5 auch auf zwei Spalten verteilt', () => {
    const next = wechsel(mitEingaben({ gate135: { '12:t5#0': '5', '12:t5#1': '10' } }), 'bawue')
    expect(zellen(next, 'bawuewasser2')).toEqual({ '12:t5a#0': '5', '12:t5b#0': '10' })
  })

  it('zeigt beim Wechsel zu Alcatraz-DM26 Zeit, Start und Parcours richtig', () => {
    const next = wechsel(
      mitEingaben({
        zeit: { '12:zeit1': '1,2345' },
        gate135: { '12:start#0': '5', '12:t1a#0': '10' },
        parcours: { '12:bemerkung': 'Text' },
      }),
      'alcatrazdm26',
    )
    expect(zellen(next, 'zeit-1')).toEqual({ '12:zeit1': '1,2345' })
    expect(zellen(next, 'zeit-2')).toEqual({})
    expect(zellen(next, 'gate135os')).toEqual({ '12:t1a#0': '10' })
    expect(zellen(next, 'parcoursms')).toEqual({ '12:bemerkung': 'Text', '12:start#0': '5' })
  })

  it('zeigt die Startnummer einer Leerzeile auf allen Listen des Laufs', () => {
    const next = wechsel(mitEingaben({ gate135: { '_p0_x0:__nr': '99', '_p0_x0:start#0': '5', '_p0_x0:t1a#0': '10' } }), 'berlin')
    expect(zellen(next, 'brechts')).toEqual({ '_p0_x0:__nr': '99', '_p0_x0:t1a#0': '10' })
    expect(zellen(next, 'bstartziel')).toEqual({ '_p0_x0:__nr': '99', '_p0_x0:start#0': '5' })
  })

  it('zieht Listenfelder auch nach einem Umweg über den Parallelslalom um', () => {
    const start = mitEingaben({ gate135: { '12:disq': 'G' } })
    const next = wechsel(wechsel(start, 'parallel'), 'frontal')
    expect(zellen(next, 'frontal135')).toEqual({ '12:disq': 'G' })
  })

  it('wendet bei der unveränderten Standard-Auswahl die Grundausstattung an', () => {
    const shape = (l: Bogen[]) => l.map((b) => [b.typeId, b.klasse, b.lauf])
    expect(shape(wechsel(defaultState(), 'frontal').boegen)).toEqual(shape(defaultBoegen('frontal')))
    expect(shape(wechsel(defaultState(), 'berlin').boegen)).toEqual(shape(defaultBoegen('berlin')))
  })

  it('behält eine eigene Auswahl an Klassen und Läufen samt Eingaben', () => {
    const start = mitEingaben({ gate135: { '12:t1a#0': '5' } }, { ...defaultState(), boegen: [bogen('a', 'gate135', '5', 2)] }, '5', 2)
    const next = wechsel(start, 'frontal')
    const laeufe = new Set(next.boegen.map((b) => `${b.klasse}:${b.lauf}`))
    expect([...laeufe]).toEqual(['5:2'])
    expect(next.boegen.map((b) => b.typeId)).toContain('mueb')
    expect(zellen(next, 'frontal135', '5', 2)).toEqual({ '12:t1a#1': '5' })
  })

  it('erweitert die Auswahl nicht, nur weil ein anderer Lauf Eingaben hat', () => {
    const start = mitEingaben({ mueb: { '12:fehler': '13' } })
    const next = wechsel(start, 'berlin')
    expect(next.boegen.map((b) => b.typeId)).toEqual(defaultBoegen('berlin').map((b) => b.typeId))
  })

  it('startet ohne Auswahl mit der Grundausstattung', () => {
    expect(wechsel({ ...defaultState(), boegen: [] }, 'frontal').boegen.length).toBe(defaultBoegen('frontal').length)
  })
})

describe('Parallelslalom und Manövrieren', () => {
  it('behalten je ihre Eingaben, auch auf den Listen, die beide nutzen', () => {
    const alcatraz = mitEingaben({ gate135: { '12:t1a#0': '5' }, steg: { '12:fehlerAB': '3', '12:bemerkung': 'Manöver' }, zeit: { '12:zeit1': '1,2345' } })
    const parallel = wechsel(alcatraz, 'parallel')
    expect(zellen(parallel, 'steg')).toEqual({})
    expect(zellen(parallel, 'zeit')).toEqual({})

    const mitWerten = mitEingaben({ parallelparcours: { '12:b1a': '10' }, steg: { '12:fehlerAB': '4' }, zeit: { '12:zeit1': '2,0000' } }, parallel)
    const zurueck = wechsel(mitWerten, 'alcatraz')
    expect(zellen(zurueck, 'gate135')).toEqual({ '12:t1a#0': '5' })
    expect(zellen(zurueck, 'steg')).toEqual({ '12:fehlerAB': '3', '12:bemerkung': 'Manöver' })
    expect(zellen(zurueck, 'zeit')).toEqual({ '12:zeit1': '1,2345' })

    const wieder = wechsel(zurueck, 'parallel')
    expect(zellen(wieder, 'parallelparcours')).toEqual({ '12:b1a': '10' })
    expect(zellen(wieder, 'steg')).toEqual({ '12:fehlerAB': '4' })
    expect(zellen(wieder, 'zeit')).toEqual({ '12:zeit1': '2,0000' })
  })

  it('haben je eigene WKR-Namen', () => {
    const b = bogen('x', 'steg')
    const alcatraz = reducer(defaultState(), { type: 'SET_WKR', bogen: b, name: 'Manöver' })
    const parallel = reducer(wechsel(alcatraz, 'parallel'), { type: 'SET_WKR', bogen: b, name: 'Parallel' })
    expect(wkrVon(wechsel(parallel, 'alcatraz'), b)).toBe('Manöver')
    expect(wkrVon(parallel, b)).toBe('Parallel')
  })
})

describe('Eingaben je Klasse, Lauf und Startnummer', () => {
  it('trennt Läufe, Klassen und Startnummern', () => {
    let state = mitEingaben({ zeit: { '12:zeit1': '1,0000', '13:zeit1': '1,1000' } }, defaultState(), '3', 1)
    state = mitEingaben({ zeit: { '12:zeit1': '2,0000' } }, state, '3', 2)
    state = mitEingaben({ zeit: { '12:zeit1': '3,0000' } }, state, '4', 1)
    expect(zellen(state, 'zeit', '3', 1)).toEqual({ '12:zeit1': '1,0000', '13:zeit1': '1,1000' })
    expect(zellen(state, 'zeit', '3', 2)).toEqual({ '12:zeit1': '2,0000' })
    expect(zellen(state, 'zeit', '4', 1)).toEqual({ '12:zeit1': '3,0000' })
    expect(zellen(state, 'zeit', '4', 2)).toEqual({})
  })

  it('verliert nichts, wenn ein Bogen entfernt und wieder hinzugefügt wird', () => {
    const start = mitEingaben({ steg: { '12:fehlerAB': '3', '12:bemerkung': 'Text' } })
    const b = start.boegen.find((x) => x.typeId === 'steg')!
    const benannt = reducer(start, { type: 'SET_WKR', bogen: b, name: 'Name' })
    const leer = reducer(benannt, { type: 'CLEAR_BOEGEN' })
    expect(leer.boegen).toEqual([])
    const wieder = reducer(leer, { type: 'ADD_BOGEN', typeId: 'steg', klasse: '3', lauf: 1 })
    const neu = wieder.boegen[0]
    expect(neu.id).not.toBe(b.id)
    expect(zellen(wieder, 'steg')).toEqual({ '12:fehlerAB': '3', '12:bemerkung': 'Text' })
    expect(wkrVon(wieder, neu)).toBe('Name')
  })

  it('nimmt die Werte nicht mit, wenn ein Bogen auf einen anderen Lauf gestellt wird', () => {
    const start = mitEingaben({ steg: { '12:fehlerAB': '3' } })
    const b = start.boegen.find((x) => x.typeId === 'steg')!
    const next = reducer(start, { type: 'UPDATE_BOGEN', id: b.id, patch: { lauf: 2 } })
    expect(zellen(next, 'steg', '3', 2)).toEqual({})
    expect(zellen(next, 'steg', '3', 1)).toEqual({ '12:fehlerAB': '3' })
  })

  it('führt Knoten ohne Lauf', () => {
    const start = mitEingaben({ knoten: { '12:palstek': '5' } }, defaultState(), '3', 1)
    expect(zellen(start, 'knoten', '3', 2)).toEqual({ '12:palstek': '5' })
  })
})

describe('Regelwerk-Wechsel', () => {
  const zuUim = (state: AppState) => reducer(state, { type: 'SET_REGELWERK', regelwerk: 'uim-2026' })

  it('lässt gültige Eingaben stehen und löscht ungültige', () => {
    const next = zuUim(
      mitEingaben({
        zeit: { '12:zeit1': '1,2345' },
        steg: { '12:fehlerAB': '4', '12:fehlerAN': '8, 9', '12:bemerkung': 'Text' },
        gate135: { '12:t1a#0': '5', '12:t1a#1': 'G', '12:t3a#0': 'J', '12:disq': 'D, G' },
      }),
    )
    expect(zellen(next, 'zeit')).toEqual({ '12:zeit1': '1,2345' })
    // Code 4 und 8 kennt die UIM nicht, Code 9 schon.
    expect(zellen(next, 'steg')).toEqual({ '12:fehlerAN': '9', '12:bemerkung': 'Text' })
    // Disqualifikation G kennt die UIM nicht, D und J schon.
    expect(zellen(next, 'gate135')).toEqual({ '12:t1a#0': '5', '12:t3a#0': 'J', '12:disq': 'D' })
  })

  it('bereinigt auch Läufe und Disziplinen, die gerade nicht zu sehen sind', () => {
    const alcatraz = mitEingaben({ steg: { '12:fehlerAB': '4' } }, { ...defaultState(), boegen: [] }, '3', 2)
    const parallel = mitEingaben({ steg: { '12:fehlerAB': '4' } }, wechsel(alcatraz, 'parallel'))
    const next = zuUim(parallel)
    expect(next.eingaben).toEqual({})
  })

  it('stellt Gelöschtes beim Zurückwechseln nicht wieder her', () => {
    const start = mitEingaben({ steg: { '12:fehlerAN': '8, 9' } })
    const zurueck = reducer(zuUim(start), { type: 'SET_REGELWERK', regelwerk: 'dm-2026' })
    expect(zellen(zurueck, 'steg')).toEqual({ '12:fehlerAN': '9' })
  })

  it('löscht Spalten, die das Regelwerk nicht hat', () => {
    const start = mitEingaben({ knoten: { '12:schotstek': '5', '12:palstek': '5' } })
    expect(zellen(zuUim(start), 'knoten')).toEqual({ '12:palstek': '5' })
  })

  it('löscht Eingaben und WKR-Namen wegfallender Klassen', () => {
    let start = mitEingaben({ steg: { '12:bemerkung': 'bleibt' } }, defaultState(), '5')
    start = mitEingaben({ steg: { '12:bemerkung': 'weg' } }, start, '7')
    start = reducer(start, { type: 'SET_WKR', bogen: bogen('x', 'steg', '5'), name: 'bleibt' })
    start = reducer(start, { type: 'SET_WKR', bogen: bogen('x', 'steg', '7'), name: 'weg' })
    const next = zuUim(start)
    expect(zellen(next, 'steg', '5')).toEqual({ '12:bemerkung': 'bleibt' })
    expect(zellen(next, 'steg', '7')).toEqual({})
    expect(Object.values(next.wkr)).toEqual(['bleibt'])
  })

  it('beachtet die Klassen-Spalten der Position', () => {
    // Berlin Rechts: Klasse 3 hat kein MüB, weder die Spalte noch den MüB-Buchstaben L.
    const eingaben = { 'disq@brechts': 'A, L', 't1a|hin seiteA': '5', 'katalog:mueb': '13' }
    const start: AppState = {
      ...defaultState(),
      aufbau: 'berlin',
      eingaben: { 'manoevrieren/3/1': { '12': eingaben }, 'manoevrieren/4/1': { '12': eingaben } },
    }
    const next = reducer(start, { type: 'SET_REGELWERK', regelwerk: 'dm-2026' })
    expect(next.eingaben['manoevrieren/3/1']['12']).toEqual({ 'disq@brechts': 'A', 't1a|hin seiteA': '5' })
    expect(next.eingaben['manoevrieren/4/1']['12']).toEqual(eingaben)
  })
})

describe('Tor 5 mit Parcoursüberwachung', () => {
  const schalter = (state: AppState, on: boolean) => reducer(state, { type: 'SET_TOR5_MIT_PARCOURS', on })

  it('behält Tor 5 hin und zurück', () => {
    let start = mitEingaben({ tor5: { '12:fehler': '1', '12:disq': 'G' }, parcours: { '12:disq': 'J' } })
    start = reducer(start, { type: 'SET_WKR', bogen: bogen('x', 'tor5'), name: 'Name' })
    const an = schalter(start, true)
    expect(zellen(an, 'tor5pue')).toEqual({ '12:fehler': '1', '12:disq': 'G' })
    expect(wkrVon(an, bogen('x', 'tor5pue'))).toBe('Name')
    const aus = schalter(an, false)
    expect(zellen(aus, 'tor5')).toEqual({ '12:fehler': '1', '12:disq': 'G' })
    expect(zellen(aus, 'parcours')).toEqual({ '12:disq': 'J' })
    expect(wkrVon(aus, bogen('x', 'tor5'))).toBe('Name')
  })

  it('zeigt Start und Ziel der Parcoursliste, ohne Tor 5 zu überschreiben', () => {
    const start = mitEingaben(
      { tor5: { '12:fehler': '1', '12:disq': 'G' }, parcoursms: { '12:start#0': '5', '12:disq': 'J' } },
      wechsel(defaultState(), 'alcatrazdm26'),
    )
    expect(zellen(schalter(start, true), 'tor5puems')).toEqual({ '12:fehler': '1', '12:disq': 'G', '12:start#0': '5' })
  })
})

describe('Speicher im Browser', () => {
  let speicher: Map<string, string>

  beforeEach(() => {
    speicher = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => speicher.get(k) ?? null,
      setItem: (k: string, v: string) => void speicher.set(k, v),
      removeItem: (k: string) => void speicher.delete(k),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('hat die Eingaben nach Aufbau-Wechsel und Neuladen wieder', async () => {
    const { store } = createStore()
    store.dispatch({ type: 'SET_VALUE', bogen: bogen('x', 'gate135'), cell: '12:t1a#0', value: '5' })
    store.dispatch({ type: 'SET_AUFBAU', aufbau: 'frontal' })
    await nextTick()

    const neu = createStore().store.state
    expect(neu.aufbau).toBe('frontal')
    expect(zellen(neu, 'frontal135')).toEqual({ '12:t1a#1': '5' })
  })

  it('ist nach „Alles zurücksetzen“ leer und speichert erst bei der nächsten Änderung wieder', async () => {
    const { store } = createStore()
    store.dispatch({ type: 'SET_VALUE', bogen: bogen('x', 'zeit'), cell: '12:zeit1', value: '1,2345' })
    await nextTick()
    expect(speicher.size).toBe(1)

    store.dispatch({ type: 'RESET_ALL' })
    await nextTick()
    expect(speicher.size).toBe(0)
    expect(store.state.eingaben).toEqual({})

    store.dispatch({ type: 'SET_EVENT', eventName: 'Neu' })
    await nextTick()
    expect(speicher.size).toBe(1)
  })

  it('startet nach dem Zurücksetzen und Neuladen ohne Eingaben', async () => {
    const { store } = createStore()
    store.dispatch({ type: 'SET_VALUE', bogen: bogen('x', 'zeit'), cell: '12:zeit1', value: '1,2345' })
    store.dispatch({ type: 'RESET_ALL' })
    await nextTick()
    expect(createStore().store.state.eingaben).toEqual({})
  })

  it('übernimmt einen früheren Stand mit Werten je Bogen', () => {
    speicher.set(
      'fehlerpunkte-prototyp:v1',
      JSON.stringify({
        aufbau: 'alcatraz',
        boegen: [bogen('a', 'gate135', '3', 2), bogen('b', 'zeit', '3', 2), bogen('c', 'knoten', '3', 1)],
        values: {
          a: { '12:t1a#0': '5', '12:disq': 'G' },
          b: { '12:zeit1': '1,2345' },
          c: { '12:palstek': '5' },
          weg: { '12:zeit1': '9,9999' },
        },
        wkr: { a: 'Name', weg: 'Weg' },
      }),
    )
    const state = buildInitialState()
    expect(zellen(state, 'gate135', '3', 2)).toEqual({ '12:t1a#0': '5', '12:disq': 'G' })
    expect(zellen(state, 'zeit', '3', 2)).toEqual({ '12:zeit1': '1,2345' })
    expect(zellen(state, 'knoten', '3', 2)).toEqual({ '12:palstek': '5' })
    expect(wkrVon(state, bogen('x', 'gate135', '3', 2))).toBe('Name')
    expect(Object.keys(state.wkr)).toHaveLength(1)
    expect('values' in state).toBe(false)
  })
})
