import { describe, expect, it } from 'vitest'
import { decodeShareConfig, encodeShareConfig, toShareConfig, type ShareConfig } from './sharelink'
import type { AppState } from '../types'

function stateFixture(): AppState {
  return {
    eventName: '30. Möwepokal 2026',
    aufbau: 'bawue',
    beschriftung: 'ls',
    emptyRows: 5,
    rowsPerPage: 12,
    numbers: { '2': [1, 2, 3] },
    wkr: { bg_1: 'Max' },
    boegen: [
      { id: 'bg_1', typeId: 'bawuewasser2', klasse: '2', lauf: 1 },
      { id: 'bg_2', typeId: 'bawuewasser2', klasse: '2', lauf: 2 },
    ],
    values: { bg_1: { '1:sum': '5' } },
    initialized: true,
  }
}

describe('sharelink', () => {
  it('kodiert und dekodiert die Konfiguration verlustfrei (ohne Werte/WKR)', () => {
    const cfg = toShareConfig(stateFixture())
    const round = decodeShareConfig(encodeShareConfig(cfg))
    expect(round).toEqual<ShareConfig>({
      eventName: '30. Möwepokal 2026',
      aufbau: 'bawue',
      beschriftung: 'ls',
      emptyRows: 5,
      rowsPerPage: 12,
      numbers: { '2': [1, 2, 3] },
      boegen: [
        { typeId: 'bawuewasser2', klasse: '2', lauf: 1 },
        { typeId: 'bawuewasser2', klasse: '2', lauf: 2 },
      ],
    })
  })

  it('überträgt keine eingetragenen Werte oder WKR-Namen', () => {
    const cfg = toShareConfig(stateFixture())
    const json = JSON.stringify(cfg)
    expect(json).not.toContain('Max')
    expect(json).not.toContain('1:sum')
  })

  it('verwirft ungültige Bogen-Einträge (unbekannte Klasse/Lauf) defensiv', () => {
    const cfg: ShareConfig = {
      eventName: 'X',
      aufbau: 'a',
      beschriftung: 'b',
      emptyRows: 0,
      rowsPerPage: 0,
      numbers: {},
      boegen: [
        { typeId: 'zeit', klasse: '2', lauf: 1 },
        { typeId: 'zeit', klasse: 'Z' as never, lauf: 1 },
        { typeId: 'zeit', klasse: '2', lauf: 9 as never },
      ],
    }
    const round = decodeShareConfig(encodeShareConfig(cfg))
    expect(round?.boegen).toEqual([{ typeId: 'zeit', klasse: '2', lauf: 1 }])
  })

  it('überträgt die Startnummern je Klasse und filtert unbekannte Klassen/Nicht-Zahlen', () => {
    const cfg: ShareConfig = {
      eventName: 'X',
      aufbau: 'a',
      beschriftung: 'b',
      emptyRows: 0,
      rowsPerPage: 0,
      // Absichtlich ungültige Einträge (unbekannte Klasse Z, Nicht-Zahl) - müssen
      // beim Dekodieren herausgefiltert werden.
      numbers: { '2': [7, 8], Z: [1], '4': ['x', 9] } as unknown as ShareConfig['numbers'],
      boegen: [],
    }
    const round = decodeShareConfig(encodeShareConfig(cfg))
    expect(round?.numbers).toEqual({ '2': [7, 8], '4': [9] })
  })

  it('liefert null bei kaputtem Parameter', () => {
    expect(decodeShareConfig('nicht-base64-!!')).toBeNull()
  })
})
