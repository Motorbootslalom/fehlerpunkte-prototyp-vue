import { describe, expect, it } from 'vitest'
import { exportBaseName, sanitizeFilename, timestampSuffix } from './print'

describe('sanitizeFilename', () => {
  it('entfernt dateisystem-kritische Zeichen', () => {
    expect(sanitizeFilename('Fehlerpunkte - 30. Möwepokal 2026')).toBe(
      'Fehlerpunkte - 30. Möwepokal 2026',
    )
    expect(sanitizeFilename('A/B:C*?"<>|D')).toBe('A B C D')
  })

  it('fällt auf einen Standardnamen zurück', () => {
    expect(sanitizeFilename('   ')).toBe('Fehlerpunkte')
    expect(sanitizeFilename('')).toBe('Fehlerpunkte')
  })
})

describe('timestampSuffix', () => {
  it('formatiert wie die alten Dokumente (YYYY-MM-DD_HH.MM.SSUhr)', () => {
    // Monat ist 0-basiert: 5 = Juni
    expect(timestampSuffix(new Date(2026, 5, 26, 21, 33, 56))).toBe('2026-06-26_21.33.56Uhr')
    expect(timestampSuffix(new Date(2026, 0, 3, 9, 5, 7))).toBe('2026-01-03_09.05.07Uhr')
  })
})

describe('exportBaseName', () => {
  const d = new Date(2026, 6, 9, 17, 31, 45)

  it('setzt Event, Beschreibung und Zeitstempel zusammen', () => {
    expect(exportBaseName('30. Möwepokal 2026', 'Zeit - Klasse 3 - 1. Lauf', d)).toBe(
      'Fehlerpunkte - 30. Möwepokal 2026 - Zeit - Klasse 3 - 1. Lauf - 2026-07-09_17.31.45Uhr',
    )
  })

  it('lässt leere Teile weg', () => {
    expect(exportBaseName('', '', d)).toBe('Fehlerpunkte - 2026-07-09_17.31.45Uhr')
  })

  it('ohne Datum kein Zeitstempel (für die Vorschau)', () => {
    expect(exportBaseName('Cup', 'Klasse 3')).toBe('Fehlerpunkte - Cup - Klasse 3')
  })
})
