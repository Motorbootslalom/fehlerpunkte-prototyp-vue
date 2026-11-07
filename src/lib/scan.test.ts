import { describe, expect, it } from 'vitest'
import type { Bogen } from '../types'
import { scanBoegen } from './scan'
import type { QrZiel } from './qr'

const order = ['zeit', 'steg', 'gate135', 'knoten']
const laufFrei = (t: string) => t === 'knoten'
const erlaubt = (t: string, k: string) => !(t === 'gate135' && k === 'E')
const bogen = (id: string, typeId: string, klasse: Bogen['klasse'], lauf: Bogen['lauf']): Bogen => ({
  id,
  typeId,
  klasse,
  lauf,
})
const ziel = (z: Partial<QrZiel>): QrZiel => ({ regelwerk: 'dm-2026', aufbau: 'alcatraz', klasse: '3', lauf: 1, ...z })

const boegen: Bogen[] = [
  bogen('a', 'gate135', '3', 1),
  bogen('b', 'zeit', '3', 1),
  bogen('c', 'zeit', '3', 2),
  bogen('d', 'steg', '1', 1),
  bogen('e', 'extra', '3', 1),
  bogen('f', 'knoten', '3', 1),
  bogen('g', 'steg', '3', 1),
]

describe('scanBoegen', () => {
  it('Laufzettel: Bögen der Klasse und des Laufs in Aufbau-Reihenfolge, Zusätze am Ende', () => {
    const r = scanBoegen(ziel({}), boegen, order, laufFrei, erlaubt)
    expect(r.ausAufbau).toBe(false)
    expect(r.boegen.map((b) => b.id)).toEqual(['b', 'g', 'a', 'f', 'e'])
  })

  it('Laufzettel ohne passende Bögen: aus dem Aufbau, ohne ungültige Positionen', () => {
    const r = scanBoegen(ziel({ klasse: 'E', lauf: 1 }), boegen, order, laufFrei, erlaubt)
    expect(r.ausAufbau).toBe(true)
    expect(r.boegen.map((b) => b.typeId)).toEqual(['zeit', 'steg', 'knoten'])
    expect(r.boegen.every((b) => b.klasse === 'E' && b.lauf === 1)).toBe(true)
  })

  it('lauf-unabhängige Listen kommen beim Bilden nur in den ersten Lauf', () => {
    const r = scanBoegen(ziel({ klasse: 'E', lauf: 2 }), boegen, order, laufFrei, erlaubt)
    expect(r.boegen.map((b) => b.typeId)).toEqual(['zeit', 'steg'])
  })

  it('Liste: genau dieser Bogen', () => {
    const r = scanBoegen(ziel({ typeId: 'zeit', lauf: 2, seite: 1 }), boegen, order, laufFrei, erlaubt)
    expect(r).toEqual({ boegen: [boegen[2]], ausAufbau: false })
  })

  it('Liste lauf-unabhängig: passt in jedem Lauf', () => {
    const r = scanBoegen(ziel({ typeId: 'knoten', lauf: 3, seite: 1 }), boegen, order, laufFrei, erlaubt)
    expect(r.boegen.map((b) => b.id)).toEqual(['f'])
  })

  it('Liste nicht in der Bögen-Liste: nur zur Anzeige gebildet, mit fester ID', () => {
    const a = scanBoegen(ziel({ typeId: 'steg', lauf: 3, seite: 2 }), boegen, order, laufFrei, erlaubt)
    const b = scanBoegen(ziel({ typeId: 'steg', lauf: 3, seite: 2 }), boegen, order, laufFrei, erlaubt)
    expect(a.ausAufbau).toBe(true)
    expect(a.boegen).toEqual([{ id: 'scan_steg_3_3', typeId: 'steg', klasse: '3', lauf: 3 }])
    expect(b.boegen[0].id).toBe(a.boegen[0].id)
  })
})
