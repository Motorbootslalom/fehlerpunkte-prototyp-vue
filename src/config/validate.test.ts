import { describe, expect, it } from 'vitest'
import { validateConfigTexts, validateRawConfig, type ConfigIssue } from './validate'
// Gebündelte Standard-Konfiguration (dieselben Dateien, die die App bündelt).
import bundledFehler from './fehlerpunkte.yaml?raw'
import bundledPositionen from './positionen.yaml?raw'

const errors = (issues: ConfigIssue[]) => issues.filter((i) => i.severity === 'error')

describe('Konfigurations-Validierung', () => {
  it('die gebündelte Konfiguration ist fehlerfrei', () => {
    const issues = validateConfigTexts(bundledFehler, bundledPositionen)
    // Bei einem Treffer die Meldungen sichtbar machen (erleichtert die Suche).
    expect(errors(issues), errors(issues).map((i) => `${i.where}: ${i.message}`).join('\n')).toEqual([])
  })

  it('findet doppelte Positions-IDs', () => {
    const raw = { positionen: [{ id: 'zeit', spalten: [] }, { id: 'zeit', spalten: [] }] }
    expect(validateRawConfig(raw).map((i) => i.code)).toContain('DUP_POSITION_ID')
  })

  it('findet doppelte Spalten-Keys innerhalb einer Position', () => {
    const raw = {
      positionen: [
        {
          id: 'p',
          spalten: [
            { key: 'a', label: 'A', typ: 'boje' as const },
            { key: 'a', label: 'A2', typ: 'boje' as const },
          ],
        },
      ],
    }
    expect(validateRawConfig(raw).map((i) => i.code)).toContain('DUP_SPALTE_KEY')
  })

  it('findet einen Aufbau, der eine unbekannte Position referenziert', () => {
    const raw = {
      aufbauten: [{ id: 'x', name: 'X', positionen: ['zeit', 'gibtsnicht'] }],
      positionen: [{ id: 'zeit', spalten: [] }],
    }
    const codes = validateRawConfig(raw).map((i) => i.code)
    expect(codes).toContain('UNKNOWN_POSITION_REF')
  })

  it('findet punkteSpalte / summeSpalte, die nicht existiert oder keine Summe ist', () => {
    const raw = {
      positionen: [
        {
          id: 'p',
          summeSpalte: 'fehlt',
          spalten: [
            { key: 'f', label: 'F', typ: 'code' as const, punkteSpalte: 'gibtsnicht' },
            { key: 'b', label: 'B', typ: 'boje' as const },
          ],
        },
      ],
    }
    const codes = validateRawConfig(raw).map((i) => i.code)
    expect(codes).toContain('UNKNOWN_SUMME_SPALTE')
    expect(codes).toContain('UNKNOWN_PUNKTE_SPALTE')
  })

  it('meldet einen Verweis auf einen unbekannten Katalog', () => {
    const raw = {
      positionen: [{ id: 'p', katalog: 'gibtsnicht', spalten: [{ key: 'x', label: 'X', typ: 'boje' as const }] }],
    }
    expect(validateRawConfig(raw).map((i) => i.code)).toContain('UNKNOWN_KATALOG')
  })

  it('akzeptiert eine korrekte Minimal-Konfiguration ohne Befund', () => {
    const raw = {
      kataloge: { k: { fehler: [{ code: 1, text: 'x', punkte: 5 }] } },
      aufbauten: [{ id: 'a', name: 'A', positionen: ['p'] }],
      positionen: [
        {
          id: 'p',
          katalog: 'k',
          summeSpalte: 'sum',
          spalten: [
            { key: 'f', label: 'F', typ: 'code' as const, punkteSpalte: 'sum' },
            { key: 'sum', label: 'Σ', typ: 'summe' as const },
          ],
        },
      ],
    }
    expect(validateRawConfig(raw)).toEqual([])
  })
})
