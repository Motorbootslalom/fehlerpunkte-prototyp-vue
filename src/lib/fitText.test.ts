import { describe, expect, it } from 'vitest'
import { FIT_MIN, fitFactor } from './fitText'

describe('fitFactor', () => {
  it('lässt die Schrift voll, solange der Text passt', () => {
    expect(fitFactor(90, 100)).toBe(1)
    expect(fitFactor(100, 100)).toBe(1)
  })

  it('verkleinert so weit wie nötig und rundet ab, damit der Text sicher passt', () => {
    expect(fitFactor(120, 100)).toBe(0.83)
    expect(120 * fitFactor(120, 100)).toBeLessThanOrEqual(100)
  })

  it('geht nicht unter das Minimum', () => {
    expect(fitFactor(1000, 100)).toBe(FIT_MIN)
  })

  it('ändert ohne Text oder ohne Layout nichts', () => {
    expect(fitFactor(0, 100)).toBe(1)
    expect(fitFactor(100, 0)).toBe(1)
  })
})
