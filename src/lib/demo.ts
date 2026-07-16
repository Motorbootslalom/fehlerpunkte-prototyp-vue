import type { ClassId } from '../types'
import { CLASS_IDS } from '../types'

// Demo-Startnummern in Anlehnung an die alten Listen (z. B. Klasse 3 → 301…314).
// Es sind KEINE echten personenbezogenen Daten - nur Nummern zum Ausprobieren
// der Eingabemaske. Zwei kleine Gruppen je Klasse (…01-…05 und …11-…14) bilden
// die typische Verzahnungs-Aufteilung nach.

const PREFIX: Record<ClassId, number> = {
  E: 0,
  '1': 100,
  '2': 200,
  '3': 300,
  '4': 400,
  '5': 500,
  '6': 600,
  '7': 700,
}

export function demoNumbers(klasse: ClassId): number[] {
  const base = PREFIX[klasse]
  return [1, 2, 3, 4, 5, 11, 12, 13, 14].map((n) => base + n)
}

export function allDemoNumbers(): Partial<Record<ClassId, number[]>> {
  const out: Partial<Record<ClassId, number[]>> = {}
  for (const k of CLASS_IDS) out[k] = demoNumbers(k)
  return out
}

/** Hängt `count` fortlaufende Startnummern an (setzt die höchste vorhandene fort). */
export function extendNumbers(nums: number[], count: number, klasse: ClassId): number[] {
  let next = nums.length > 0 ? Math.max(...nums) + 1 : PREFIX[klasse] + 1
  const out = nums.slice()
  for (let i = 0; i < count; i++) out.push(next++)
  return out
}

/** Entfernt die letzten `count` Startnummern (mindestens 0). */
export function shrinkNumbers(nums: number[], count: number): number[] {
  return nums.slice(0, Math.max(0, nums.length - count))
}

/** Nummern-Textfeld ("301, 302, …") → Zahlenliste. */
export function parseNumbers(raw: string): number[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n))
}

export function formatNumbers(nums: number[]): string {
  return nums.join(', ')
}
