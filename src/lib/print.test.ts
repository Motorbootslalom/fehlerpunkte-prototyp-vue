import { describe, expect, it } from 'vitest'
import { ergebnisDateiname, exportBaseName, klassenText, laeufeText, sanitizeFilename, timestampSuffix } from './print'

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

describe('Dateiname der Ergebnislisten', () => {
  const alle = ['E', '1', '2', '3', '4', '5', '6', '7']
  const datum = new Date(2026, 10, 8, 1, 51, 40)

  it('nennt Veranstaltung, Klasse und Lauf, ohne „Fehlerpunkte“ und „Ergebnislisten“', () => {
    expect(ergebnisDateiname('30. Möwepokal 2026', { klassen: ['7'], alleKlassen: alle, laeufe: [1], gesamt: false }, datum)).toBe(
      '30. Möwepokal 2026 - Klasse 7 - 1. Lauf - 2026-11-08_01.51.40Uhr',
    )
  })

  it('fasst mehrere Klassen und Läufe zusammen, mit Gesamtliste', () => {
    expect(ergebnisDateiname('Pokal', { klassen: ['5', '6', '7'], alleKlassen: alle, laeufe: [1, 2, 3, 1, 2], gesamt: true })).toBe(
      'Pokal - Klassen 5, 6 und 7 - 1. bis 3. Lauf - Gesamtliste',
    )
    expect(ergebnisDateiname('', { klassen: alle, alleKlassen: alle, laeufe: [1, 3], gesamt: false })).toBe(
      'Ergebnisliste - alle Klassen - 1. und 3. Lauf',
    )
  })

  it('nennt bei nur der Gesamtliste keinen Lauf', () => {
    expect(ergebnisDateiname('Pokal', { klassen: ['7'], alleKlassen: alle, laeufe: [], gesamt: true })).toBe('Pokal - Klasse 7 - Gesamtliste')
  })

  it('zählt Klassen und Läufe lesbar auf', () => {
    expect(klassenText(['E', '1'], alle)).toBe('Klassen E und 1')
    expect(laeufeText([2])).toBe('2. Lauf')
    expect(laeufeText([2, 1])).toBe('1. und 2. Lauf')
  })
})
