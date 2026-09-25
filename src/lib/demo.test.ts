import { describe, expect, it } from 'vitest'
import { demoNumbers, extendNumbers, parseNumbers, shrinkNumbers } from './demo'

describe('extendNumbers', () => {
  it('setzt die höchste vorhandene Nummer fort', () => {
    expect(extendNumbers(['301', '302', '314'], 3, '3')).toEqual(['301', '302', '314', '315', '316', '317'])
  })
  it('startet bei leerer Liste am Klassen-Präfix', () => {
    expect(extendNumbers([], 3, '3')).toEqual(['301', '302', '303'])
    expect(extendNumbers([], 2, 'E')).toEqual(['E01', 'E02'])
  })
  it('behält Buchstaben-Präfix und führende Nullen bei', () => {
    expect(extendNumbers(['E01', 'E09'], 2, 'E')).toEqual(['E01', 'E09', 'E10', 'E11'])
  })
})

describe('shrinkNumbers', () => {
  it('entfernt die letzten n', () => {
    expect(shrinkNumbers(['301', '302', '303', '304'], 3)).toEqual(['301'])
  })
  it('geht nicht unter 0', () => {
    expect(shrinkNumbers(['301'], 3)).toEqual([])
  })
})

describe('parseNumbers', () => {
  it('erlaubt Nummern mit Buchstaben (E01, E02, …)', () => {
    expect(parseNumbers('e01, E02;301  302')).toEqual(['E01', 'E02', '301', '302'])
  })
})

describe('demoNumbers', () => {
  it('liefert für Klasse E Nummern mit Präfix', () => {
    expect(demoNumbers('E').slice(0, 2)).toEqual(['E01', 'E02'])
  })
})
