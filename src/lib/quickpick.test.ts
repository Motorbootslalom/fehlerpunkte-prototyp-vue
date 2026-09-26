import { describe, expect, it } from 'vitest'
import {
  classAllPositionsItems,
  completeLaufItems,
  formatClassOrder,
  laufLabel,
  normalizeClassOrder,
  parseClassOrder,
  positionAllClassesItems,
  positionButtonLabels,
  withoutLaufRepeats,
} from './quickpick'
import { getAufbau } from '../config/active'
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

  it('hängt nicht genannte Klassen in Standard-Reihenfolge an', () => {
    expect(parseClassOrder('3, 1')).toEqual(['3', '1', 'E', '2', '4', '5', '6', '7'])
  })

  it('ignoriert Unbekanntes und Doppeltes; leer = Standard', () => {
    expect(parseClassOrder('Klasse 3, 9, 10, 3, x')).toEqual(['3', 'E', '1', '2', '4', '5', '6', '7'])
    expect(parseClassOrder('')).toEqual(['E', '1', '2', '3', '4', '5', '6', '7'])
    expect(normalizeClassOrder(['Z', '2', 2, '2'])).toEqual(['2', 'E', '1', '3', '4', '5', '6', '7'])
    expect(normalizeClassOrder(undefined)).toEqual(['E', '1', '2', '3', '4', '5', '6', '7'])
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

  it('Positionen ohne Aufbau stehen jedem Aufbau als Zusatz zur Wahl', () => {
    const { order, zusatz } = getAufbau('alcatraz')
    expect(zusatz).toEqual(expect.arrayContaining(['gate135os', 'gate245os', 'parcoursms']))
    expect(zusatz.some((t) => order.includes(t))).toBe(false)
    expect(getAufbau('berlin').zusatz).toEqual(zusatz)
  })
})
