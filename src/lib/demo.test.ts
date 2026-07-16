import { describe, expect, it } from 'vitest'
import { extendNumbers, shrinkNumbers } from './demo'

describe('extendNumbers', () => {
  it('setzt die höchste vorhandene Nummer fort', () => {
    expect(extendNumbers([301, 302, 314], 3, '3')).toEqual([301, 302, 314, 315, 316, 317])
  })
  it('startet bei leerer Liste am Klassen-Präfix', () => {
    expect(extendNumbers([], 3, '3')).toEqual([301, 302, 303])
    expect(extendNumbers([], 2, 'E')).toEqual([1, 2])
  })
})

describe('shrinkNumbers', () => {
  it('entfernt die letzten n', () => {
    expect(shrinkNumbers([301, 302, 303, 304], 3)).toEqual([301])
  })
  it('geht nicht unter 0', () => {
    expect(shrinkNumbers([301], 3)).toEqual([])
  })
})
