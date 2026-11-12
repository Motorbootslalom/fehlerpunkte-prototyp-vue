import { beforeEach, describe, expect, it } from 'vitest'
import { bundledConfig, initConfig } from '../config/active'
import { defaultState } from '../state/initState'
import { reducer } from '../state/store'
import type { AppState, Bogen, ClassId, Lauf } from '../types'
import { parcoursImKopf, wkrAusEinteilung, wkrVon } from './eingaben'
import { klasseWechseln, leereEinteilung, nameAusEinteilung, normalisiereEinteilung, parcoursVon, setzeName } from './einteilung'

beforeEach(() => initConfig(bundledConfig()))

const bogen = (typeId: string, klasse: ClassId = '3', lauf: Lauf = 1): Bogen => ({ id: 'x', typeId, klasse, lauf })

/** Steg: Huber auf Parcours 1, Kraus auf Parcours 2; Klassen 4 bis 7 auf Parcours 2. */
function zweiParcours(): AppState {
  let e = setzeName(leereEinteilung(), 1, 'steg', 'Huber')
  e = setzeName(e, 2, 'steg', 'Kraus')
  for (const k of ['4', '5', '6', '7'] as ClassId[]) e = klasseWechseln(e, k)
  return reducer(defaultState(), { type: 'SET_EINTEILUNG', einteilung: { ...e, zweiParcours: true } })
}

describe('WKR-Einteilung', () => {
  it('ein Parcours: ein Name je Liste für alle Klassen und Läufe', () => {
    const einteilung = setzeName(leereEinteilung(), 1, 'steg', 'Huber')
    const state = reducer(defaultState(), { type: 'SET_EINTEILUNG', einteilung })
    expect(wkrVon(state, bogen('steg', 'E', 1))).toBe('Huber')
    expect(wkrVon(state, bogen('steg', '7', 3))).toBe('Huber')
    expect(wkrVon(state, bogen('zeit'))).toBe('')
    expect(parcoursImKopf(state, bogen('steg'))).toBeUndefined()
  })

  it('zwei Parcours: der Name folgt aus der Klasse', () => {
    const state = zweiParcours()
    expect(wkrVon(state, bogen('steg', '3'))).toBe('Huber')
    expect(wkrVon(state, bogen('steg', '4'))).toBe('Kraus')
    expect(parcoursImKopf(state, bogen('steg', '3'))).toBe(1)
    expect(parcoursImKopf(state, bogen('steg', '7'))).toBe(2)
  })

  it('ohne Haken gilt Parcours 1, auch wenn Klassen auf Parcours 2 stehen', () => {
    const state = zweiParcours()
    const einer = reducer(state, { type: 'SET_EINTEILUNG', einteilung: { ...state.einteilung, zweiParcours: false } })
    expect(wkrVon(einer, bogen('steg', '4'))).toBe('Huber')
    expect(parcoursImKopf(einer, bogen('steg', '4'))).toBeUndefined()
  })

  it('ein Name auf dem Bogen geht vor; geleert gilt wieder die Einteilung', () => {
    const state = zweiParcours()
    const b = bogen('steg', '4', 2)
    const vertretung = reducer(state, { type: 'SET_WKR', bogen: b, name: 'Vertretung' })
    expect(wkrVon(vertretung, b)).toBe('Vertretung')
    expect(wkrAusEinteilung(vertretung, b)).toBe(false)
    expect(wkrVon(vertretung, bogen('steg', '4', 1))).toBe('Kraus')
    const geleert = reducer(vertretung, { type: 'SET_WKR', bogen: b, name: '' })
    expect(wkrVon(geleert, b)).toBe('Kraus')
    expect(wkrAusEinteilung(geleert, b)).toBe(true)
    expect(Object.keys(geleert.wkr)).toHaveLength(0)
  })

  it('ein leerer Name entfernt den Eintrag', () => {
    const e = setzeName(setzeName(leereEinteilung(), 1, 'steg', 'Huber'), 1, 'steg', '  ')
    expect(e.namen[1]).toEqual({})
    expect(nameAusEinteilung(e, 'steg', '3')).toBe('')
  })

  it('Klassen wechseln hin und zurück, in fester Reihenfolge', () => {
    let e = { ...leereEinteilung(), zweiParcours: true }
    e = klasseWechseln(klasseWechseln(e, '7'), '4')
    expect(e.parcours2).toEqual(['4', '7'])
    expect(parcoursVon(e, '7')).toBe(2)
    e = klasseWechseln(e, '7')
    expect(e.parcours2).toEqual(['4'])
    expect(parcoursVon(e, '7')).toBe(1)
  })

  it('bereinigt gespeicherte Einteilungen', () => {
    expect(normalisiereEinteilung(undefined)).toEqual(leereEinteilung())
    expect(normalisiereEinteilung('kaputt')).toEqual(leereEinteilung())
    expect(
      normalisiereEinteilung({ zweiParcours: true, parcours2: ['7', 'X', '4'], namen: { 1: { steg: 'A', zeit: 5 }, 2: null } }),
    ).toEqual({ zweiParcours: true, parcours2: ['4', '7'], namen: { 1: { steg: 'A' }, 2: {} } })
  })

  it('„Alles zurücksetzen“ leert die Einteilung', () => {
    const state = reducer(zweiParcours(), { type: 'RESET_ALL' })
    expect(state.einteilung).toEqual(leereEinteilung())
  })
})
