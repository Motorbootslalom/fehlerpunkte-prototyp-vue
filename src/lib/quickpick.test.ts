import { describe, expect, it } from 'vitest'
import {
  allClassesAllPositionsItems,
  classAllPositionsItems,
  completeLaufItems,
  formatClassOrder,
  laufLabel,
  missingClasses,
  normalizeClassOrder,
  parseClassOrder,
  positionAllClassesItems,
  positionButtonLabels,
  withMissingClasses,
  withoutLaufRepeats,
} from './quickpick'
import { getAufbau } from '../config/active'
import { buildConfig } from '../config/build'
import type { ClassId } from '../types'

const ORDER: ClassId[] = ['1', '3', 'E', '2', '5', '7', '4', '6']
const kurz = (items: { klasse: ClassId; lauf: number; typeId?: string }[]) =>
  items.map((it) => `${it.lauf}:${it.klasse}`)

describe('Klassen-Reihenfolge', () => {
  it('liest die Reihenfolge aus Text – mit Trennzeichen oder kompakt', () => {
    expect(parseClassOrder('1, 3, E, 2, 5, 7, 4, 6')).toEqual(ORDER)
    expect(parseClassOrder('1 3 e 2;5-7/4 6')).toEqual(ORDER)
    expect(parseClassOrder('13E25746')).toEqual(ORDER)
  })

  it('lässt nicht genannte Klassen weg', () => {
    expect(parseClassOrder('3, 1')).toEqual(['3', '1'])
  })

  it('ignoriert Unbekanntes und Doppeltes; leer = alle', () => {
    expect(parseClassOrder('Klasse 3, 9, 10, 3, x')).toEqual(['3'])
    expect(parseClassOrder('')).toEqual(['E', '1', '2', '3', '4', '5', '6', '7'])
    expect(normalizeClassOrder(['Z', '2', 2, '2'])).toEqual(['2'])
    expect(normalizeClassOrder(undefined)).toEqual(['E', '1', '2', '3', '4', '5', '6', '7'])
  })

  it('↻: fehlende Klassen in Standard-Reihenfolge hinten anhängen', () => {
    const order: ClassId[] = ['5', '1', '3']
    expect(missingClasses(order)).toEqual(['E', '2', '4', '6', '7'])
    expect(withMissingClasses(order)).toEqual(['5', '1', '3', 'E', '2', '4', '6', '7'])
    expect(missingClasses(ORDER)).toEqual([])
  })

  it('formatiert für die Anzeige', () => {
    expect(formatClassOrder(ORDER)).toBe('1, 3, E, 2, 5, 7, 4, 6')
  })
})

describe('Schnellauswahl', () => {
  it('eine Position · alle Klassen: Klassen in gewählter Reihenfolge', () => {
    const items = positionAllClassesItems('tor1', ORDER, 2)
    expect(kurz(items)).toEqual(['2:1', '2:3', '2:E', '2:2', '2:5', '2:7', '2:4', '2:6'])
    expect(items.every((it) => it.typeId === 'tor1')).toBe(true)
  })

  it('eine Position · alle Läufe: erst Lauf 1 komplett, dann Lauf 2, dann Lauf 3', () => {
    const items = positionAllClassesItems('tor1', ORDER, 'alle')
    expect(items).toHaveLength(24)
    expect(kurz(items).slice(0, 9)).toEqual(['1:1', '1:3', '1:E', '1:2', '1:5', '1:7', '1:4', '1:6', '2:1'])
    expect(kurz(items).slice(16)).toEqual(['3:1', '3:3', '3:E', '3:2', '3:5', '3:7', '3:4', '3:6'])
  })

  it('eine Klasse · alle Listen · alle Läufe: je Lauf alle Positionen', () => {
    const items = classAllPositionsItems('E', ['zeit', 'steg'], 'alle')
    expect(items.map((it) => `${it.lauf}:${it.typeId}`)).toEqual([
      '1:zeit', '1:steg', '2:zeit', '2:steg', '3:zeit', '3:steg',
    ])
  })

  it('kompletter Lauf: Klassen in gewählter Reihenfolge × Positionen', () => {
    const items = completeLaufItems(['zeit', 'steg'], ['3', 'E'] as ClassId[], 1)
    expect(items.map((it) => `${it.klasse}:${it.typeId}`)).toEqual(['3:zeit', '3:steg', 'E:zeit', 'E:steg'])
  })

  it('lauf-unabhängige Liste (Knoten) bei „Alle Läufe" nur einmal je Klasse', () => {
    const laufFree = (t: string) => t === 'knoten'
    const alle = positionAllClassesItems('knoten', ['3', 'E'] as ClassId[], 'alle')
    const items = withoutLaufRepeats(alle, laufFree)
    expect(items.map((it) => `${it.lauf}:${it.klasse}:${it.typeId}`)).toEqual(['1:3:knoten', '1:E:knoten'])

    const klasse = withoutLaufRepeats(classAllPositionsItems('E', ['zeit', 'knoten'], 'alle'), laufFree)
    expect(klasse.map((it) => `${it.lauf}:${it.typeId}`)).toEqual(['1:zeit', '1:knoten', '2:zeit', '3:zeit'])
  })

  it('lauf-unabhängige Liste: schon vorhandene Bögen nicht noch einmal anlegen', () => {
    const laufFree = (t: string) => t === 'knoten'
    const existing = [{ typeId: 'knoten', klasse: '3' as ClassId }, { typeId: 'zeit', klasse: 'E' as ClassId }]
    const lauf2 = completeLaufItems(['zeit', 'knoten'], ['3', 'E'] as ClassId[], 2)
    const items = withoutLaufRepeats(lauf2, laufFree, existing)
    expect(items.map((it) => `${it.klasse}:${it.typeId}`)).toEqual(['3:zeit', 'E:zeit', 'E:knoten'])
  })

  it('„Alle“: alle Klassen in gewählter Reihenfolge × Positionen, Lauf für Lauf', () => {
    const items = allClassesAllPositionsItems(['3', 'E'] as ClassId[], ['zeit', 'steg'], 'alle')
    expect(items.slice(0, 5).map((it) => `${it.lauf}:${it.klasse}:${it.typeId}`)).toEqual([
      '1:3:zeit',
      '1:3:steg',
      '1:E:zeit',
      '1:E:steg',
      '2:3:zeit',
    ])
    expect(items).toHaveLength(12)
    expect(allClassesAllPositionsItems(['3', 'E'] as ClassId[], ['zeit'], 2).map((it) => `${it.lauf}:${it.klasse}`)).toEqual([
      '2:3',
      '2:E',
    ])
  })

  it('beschriftet den Lauf', () => {
    expect(laufLabel(2)).toBe('2. Lauf')
    expect(laufLabel('alle')).toBe('alle Läufe')
  })

  it('Positions-Knöpfe: Kurzname, bei gleichem Kurznamen der Menü-Name', () => {
    const labels = positionButtonLabels([
      { typeId: 'gate135', title: 'Tor 1 / 3 / 5', menuLabel: 'Tore 1 / 3 / 5' },
      { typeId: 'gate135os', title: 'Tor 1 / 3 / 5', menuLabel: 'Tore 1 / 3 / 5 ohne Start/Ziel' },
      { typeId: 'zeit', title: 'Zeit', menuLabel: 'Zeitnahme' },
    ])
    expect(labels).toEqual({ gate135: 'Tore 1 / 3 / 5', gate135os: 'Tore 1 / 3 / 5 ohne Start/Ziel', zeit: 'Zeit' })
  })

  it('Positionen mit „schnellauswahl: true“ stehen jedem Aufbau als Zusatz zur Wahl', () => {
    const { order, zusatz } = getAufbau('alcatraz')
    expect(zusatz).toEqual(expect.arrayContaining(['gate135os', 'gate245os', 'parcoursms']))
    expect(zusatz.some((t) => order.includes(t))).toBe(false)
    // Positionen anderer Aufbauten ohne den Schalter bleiben dort.
    expect(zusatz).not.toContain('frontal135')
    expect(getAufbau('berlin').zusatz).not.toContain('gate135')
  })

  it('mehrfache Position im Aufbau wird nummeriert (3× Zeit → Zeit (1) … (3))', () => {
    const spalten = [{ key: 'x', label: 'X', typ: 'boje' as const }]
    const cfg = buildConfig({
      aufbauten: [
        { id: 'a', name: 'A', positionen: ['z', 'p', 'z', 'z'] },
        { id: 'b', name: 'B', positionen: ['z', 'p'] },
      ],
      positionen: [
        { id: 'z', titel: 'Zeit', menue: 'Zeitnahme', spalten },
        { id: 'p', titel: 'P', spalten },
      ],
    })
    expect(cfg.aufbauten[0].order).toEqual(['z-1', 'p', 'z-2', 'z-3'])
    expect(cfg.aufbauten[1].order).toEqual(['z', 'p']) // einfach vorhanden → unverändert
    expect(cfg.positions.map((p) => p.typeId)).toEqual(['z', 'z-1', 'z-2', 'z-3', 'p'])
    const z2 = cfg.positions.find((p) => p.typeId === 'z-2')!
    expect([z2.title, z2.menuLabel]).toEqual(['Zeit (2)', 'Zeitnahme (2)'])
    expect(z2.columns).toEqual(cfg.positions[0].columns)
  })

  it('Zusatz-Position, die schon im Aufbau steht, erscheint nicht doppelt', () => {
    const spalten = [{ key: 'x', label: 'X', typ: 'boje' as const }]
    const cfg = buildConfig({
      aufbauten: [
        { id: 'a', name: 'A', positionen: ['p', 'v'] },
        { id: 'b', name: 'B', positionen: ['p'] },
      ],
      positionen: [
        { id: 'p', titel: 'P', spalten },
        { id: 'v', titel: 'V', schnellauswahl: true, spalten },
        { id: 'w', titel: 'W', spalten },
      ],
    })
    expect(cfg.aufbauten.map((a) => [a.id, a.order, a.zusatz])).toEqual([
      ['a', ['p', 'v'], []],
      ['b', ['p'], ['v']],
    ])
  })
})
