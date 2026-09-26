import { describe, expect, it } from 'vitest'
import { buildLaufzettel } from './laufzettel'
import type { Bogen, ClassId, Lauf } from '../types'

const TITLES: Record<string, string> = { zeit: 'Zeit', vorsteg: 'Vorsteg', steg: 'Steg', gate135os: 'Tor 1 / 3 / 5' }
const titleOf = (t: string) => TITLES[t] ?? t
const bogen = (id: string, typeId: string, klasse: ClassId = '3', lauf: Lauf = 1): Bogen => ({ id, typeId, klasse, lauf })
const labels = (z: { zeilen: { label: string }[] }) => z.zeilen.map((r) => r.label)

describe('Laufzettel', () => {
  it('eine Zeile je Seite: eine Seite = nur der Name, sonst „Seite n von X“', () => {
    const [z] = buildLaufzettel(
      [bogen('a', 'zeit'), bogen('b', 'steg')],
      ['zeit', 'steg'],
      titleOf,
      (id) => (id === 'b' ? 2 : 1),
    )
    expect(labels(z)).toEqual(['Zeit', 'Steg (Seite 1 von 2)', 'Steg (Seite 2 von 2)'])
  })

  it('sortiert nach dem Aufbau; mehrfache Positionen (3× Zeit) bleiben erhalten', () => {
    const order = ['zeit', 'zeit', 'zeit', 'vorsteg', 'steg']
    const [z] = buildLaufzettel(
      [bogen('s', 'steg'), bogen('z1', 'zeit'), bogen('v', 'vorsteg'), bogen('z2', 'zeit'), bogen('z3', 'zeit')],
      order,
      titleOf,
      () => 1,
    )
    expect(z.zeilen.map((r) => r.key)).toEqual(['z1', 'z2', 'z3', 'v', 's'])
  })

  it('Positionen außerhalb des Aufbaus kommen ans Ende', () => {
    const [z] = buildLaufzettel([bogen('x', 'gate135os'), bogen('a', 'zeit')], ['zeit'], titleOf, () => 1)
    expect(labels(z)).toEqual(['Zeit', 'Tor 1 / 3 / 5'])
  })

  it('ein Laufzettel je Klasse/Lauf in der Reihenfolge des ersten Auftretens', () => {
    const zettel = buildLaufzettel(
      [bogen('a', 'zeit', '5', 1), bogen('b', 'zeit', '3', 1), bogen('c', 'steg', '5', 1), bogen('d', 'zeit', '5', 2)],
      ['zeit', 'steg'],
      titleOf,
      () => 1,
    )
    expect(zettel.map((z) => `${z.klasse}/${z.lauf}: ${labels(z).join(', ')}`)).toEqual([
      '5/1: Zeit, Steg',
      '3/1: Zeit',
      '5/2: Zeit',
    ])
  })

  it('unbekannte Seitenzahl zählt als eine Seite', () => {
    const [z] = buildLaufzettel([bogen('a', 'zeit')], ['zeit'], titleOf, () => 0)
    expect(labels(z)).toEqual(['Zeit'])
  })
})
