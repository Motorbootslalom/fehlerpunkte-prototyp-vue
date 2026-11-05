import { describe, expect, it } from 'vitest'
import { getAufbau } from '../config/active'
import { reducer } from '../state/store'
import { defaultState } from '../state/initState'
import { trennen, zusammenlegen } from './kombi'
import type { Bogen, ClassId, Lauf } from '../types'

const bogen = (id: string, typeId: string, klasse: ClassId = '3', lauf: Lauf = 1): Bogen => ({ id, typeId, klasse, lauf })
const KOMBI = { positionId: 'tor5pue', ersetzt: ['tor5', 'parcours'] }

describe('Tor 5 und Parcours zusammenlegen', () => {
  it('macht Tor 5 zur Kombi-Liste mit gleicher ID, der Parcours entfällt', () => {
    const out = zusammenlegen([bogen('a', 'steg'), bogen('b', 'tor5'), bogen('c', 'mueb'), bogen('d', 'parcours')], KOMBI)
    expect(out.map((b) => [b.id, b.typeId])).toEqual([['a', 'steg'], ['b', 'tor5pue'], ['c', 'mueb']])
  })

  it('arbeitet je Klasse und Lauf', () => {
    const out = zusammenlegen(
      [bogen('a', 'tor5', '3', 1), bogen('b', 'parcours', '3', 1), bogen('c', 'tor5', '4', 1), bogen('d', 'parcours', '4', 1), bogen('e', 'tor5', '3', 2)],
      KOMBI,
    )
    expect(out.map((b) => b.id)).toEqual(['a', 'c', 'e'])
    expect(out.every((b) => b.typeId === 'tor5pue')).toBe(true)
  })

  it('stellt beim Trennen Tor 5 wieder her und hängt den Parcours ans Ende des Blocks', () => {
    let n = 0
    const out = trennen(
      [bogen('a', 'tor5pue', '3', 1), bogen('b', 'mueb', '3', 1), bogen('c', 'tor5pue', '4', 1)],
      KOMBI,
      () => `neu${++n}`,
    )
    expect(out.map((b) => [b.id, b.typeId, b.klasse])).toEqual([
      ['a', 'tor5', '3'],
      ['b', 'mueb', '3'],
      ['neu1', 'parcours', '3'],
      ['c', 'tor5', '4'],
      ['neu2', 'parcours', '4'],
    ])
  })

  it('Alcatraz nutzt die einfache Liste, DM26 die mit Start und Ziel, Berlin keine', () => {
    expect(getAufbau('alcatraz').kombi?.positionId).toBe('tor5pue')
    expect(getAufbau('alcatraz').kombi?.order).toEqual(['zeit', 'vorsteg', 'steg', 'gate135', 'gate245', 'tor5pue', 'mueb'])
    expect(getAufbau('frontal').kombi?.positionId).toBe('tor5pue')
    expect(getAufbau('alcatrazdm26').kombi?.positionId).toBe('tor5puems')
    expect(getAufbau('alcatrazdm26').kombi?.order).toEqual(['zeit-1', 'zeit-2', 'zeit-3', 'vorsteg', 'steg', 'gate135os', 'gate245os', 'tor5puems', 'mueb'])
    expect(getAufbau('berlin').kombi).toBeUndefined()
    expect(getAufbau('bawue').kombi).toBeUndefined()
  })

  it('der Schalter ändert die Bögen hin und zurück, ohne Aufbau-Möglichkeit bleiben sie', () => {
    const start = { ...defaultState(), aufbau: 'alcatraz', boegen: [bogen('a', 'tor5'), bogen('b', 'parcours')] }
    const an = reducer(start, { type: 'SET_TOR5_MIT_PARCOURS', on: true })
    expect(an.tor5MitParcours).toBe(true)
    expect(an.boegen.map((b) => b.typeId)).toEqual(['tor5pue'])
    const aus = reducer(an, { type: 'SET_TOR5_MIT_PARCOURS', on: false })
    expect(aus.boegen.map((b) => b.typeId)).toEqual(['tor5', 'parcours'])

    const berlin = { ...defaultState(), aufbau: 'berlin', boegen: [bogen('a', 'steg')] }
    expect(reducer(berlin, { type: 'SET_TOR5_MIT_PARCOURS', on: true }).boegen).toEqual(berlin.boegen)
  })

  it('ein Aufbau-Wechsel berücksichtigt den Schalter', () => {
    const an = { ...defaultState(), tor5MitParcours: true }
    const typen = reducer(an, { type: 'SET_AUFBAU', aufbau: 'frontal' }).boegen.map((b) => b.typeId)
    expect(typen).toContain('tor5pue')
    expect(typen).not.toContain('tor5')
    expect(typen).not.toContain('parcours')
  })
})
