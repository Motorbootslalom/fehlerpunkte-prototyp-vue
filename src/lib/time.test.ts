import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatSeconds,
  formatTimeDisplay,
  parseTime,
  sanitizeTimeInput,
} from './time'

describe('parseTime', () => {
  it('deutet Zahl > 20 vor dem Trenner als Sekunden,Hundertstel', () => {
    expect(parseTime('45,67')?.centis).toBe(4567)
    expect(parseTime('45.67')?.centis).toBe(4567) // Punkt = Komma
    expect(parseTime('21,00')?.centis).toBe(2100)
  })

  it('deutet Zahl ≤ 20 vor dem Trenner als Minuten,ssHH', () => {
    expect(parseTime('1,2345')?.centis).toBe(1 * 6000 + 23 * 100 + 45)
    expect(parseTime('2,3456')?.centis).toBe(2 * 6000 + 34 * 100 + 56)
  })

  it('füllt fehlende Nachkommastellen rechts mit Null auf', () => {
    expect(parseTime('45,6')?.centis).toBe(4560) // ss,c → Hundertstel
    expect(parseTime('1,23')?.centis).toBe(1 * 6000 + 23 * 100) // mm,ss
    expect(parseTime('1,2')?.centis).toBe(1 * 6000 + 20 * 100) // mm,s → ss=20
  })

  it('interpretiert reine Ziffern ohne Trenner als Sekunden', () => {
    expect(parseTime('47')?.centis).toBe(4700)
  })

  it('behandelt führenden Trenner wie eine 0 (",354" = "0,354")', () => {
    expect(parseTime(',354')?.centis).toBe(parseTime('0,354')?.centis)
    expect(parseTime(',354')?.centis).toBe(3540) // 0 min, ss=35, hh=40
    expect(parseTime('.5')?.centis).toBe(5000) // 0 min, ss=50
  })

  it('gibt null für leere/ungültige Eingaben', () => {
    expect(parseTime('')).toBeNull()
    expect(parseTime('   ')).toBeNull()
    expect(parseTime('abc')).toBeNull()
  })
})

describe('Formatierung', () => {
  it('formatClock → mm:ss,cc', () => {
    expect(formatClock(8345)).toBe('01:23,45')
    expect(formatClock(4567)).toBe('00:45,67')
  })

  it('formatSeconds → ss,cc (ohne Minuten-Umbruch)', () => {
    expect(formatSeconds(8345)).toBe('83,45')
    expect(formatSeconds(4567)).toBe('45,67')
  })

  it('formatTimeDisplay → "mm:ss,00 (ss,00)"', () => {
    expect(formatTimeDisplay(8345)).toBe('01:23,45 (83,45)')
  })
})

describe('sanitizeTimeInput', () => {
  it('lässt nur Ziffern und einen Trenner zu', () => {
    expect(sanitizeTimeInput('1,2a3.4')).toBe('1,234')
    expect(sanitizeTimeInput('12.34')).toBe('12,34')
  })
})
