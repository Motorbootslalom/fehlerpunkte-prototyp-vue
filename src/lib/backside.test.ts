import { describe, expect, it } from 'vitest'
import { backNeedsFlip, hasDescription } from './backside'
import { getSheetDef } from '../config/active'

describe('Anne-Feature (Beschreibung auf der Rückseite)', () => {
  it('Hochformat wird für das Nach-oben-Klappen um 180° gedreht, Querformat nicht', () => {
    expect(backNeedsFlip('portrait')).toBe(true)
    expect(backNeedsFlip('landscape')).toBe(false)
  })

  it('erkennt Bögen ohne Beschreibung (Rückseite bleibt leer)', () => {
    expect(hasDescription(getSheetDef('zeit'))).toBe(false)
    expect(hasDescription(getSheetDef('gate135'))).toBe(true)
    expect(hasDescription(getSheetDef('knoten'))).toBe(true)
  })
})
