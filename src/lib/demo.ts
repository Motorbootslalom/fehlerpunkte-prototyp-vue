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

/** Klasse E nutzt Nummern mit Buchstaben-Präfix (E01, E02, …). */
function formatDemo(klasse: ClassId, n: number): string {
  return klasse === 'E' ? `E${String(n).padStart(2, '0')}` : String(PREFIX[klasse] + n)
}

export function demoNumbers(klasse: ClassId): string[] {
  return [1, 2, 3, 4, 5, 11, 12, 13, 14].map((n) => formatDemo(klasse, n))
}

export function allDemoNumbers(): Partial<Record<ClassId, string[]>> {
  const out: Partial<Record<ClassId, string[]>> = {}
  for (const k of CLASS_IDS) out[k] = demoNumbers(k)
  return out
}

/**
 * Hängt `count` fortlaufende Startnummern an. Fortgesetzt wird die höchste
 * vorhandene Nummer mit Ziffern-Ende; Präfix und führende Nullen bleiben
 * erhalten (E09 → E10, E11; 314 → 315, 316).
 */
export function extendNumbers(nums: string[], count: number, klasse: ClassId): string[] {
  let prefix = ''
  let width = 0
  let next = 1
  let best = -1
  for (const nr of nums) {
    const m = /^(.*?)(\d+)$/.exec(nr)
    if (!m) continue
    const value = parseInt(m[2], 10)
    if (value > best) {
      best = value
      prefix = m[1]
      width = m[2].length
      next = value + 1
    }
  }
  const out = nums.slice()
  for (let i = 0; i < count; i++) {
    out.push(best < 0 ? formatDemo(klasse, next++) : prefix + String(next++).padStart(width, '0'))
  }
  return out
}

/** Entfernt die letzten `count` Startnummern (mindestens 0). */
export function shrinkNumbers(nums: string[], count: number): string[] {
  return nums.slice(0, Math.max(0, nums.length - count))
}

/** Nummern-Textfeld ("301, 302, E01, …") → Liste (Buchstaben großgeschrieben). */
export function parseNumbers(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s !== '')
}

export function formatNumbers(nums: string[]): string {
  return nums.join(', ')
}
