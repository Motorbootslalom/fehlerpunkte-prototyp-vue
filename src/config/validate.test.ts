import { describe, expect, it } from 'vitest'
import { validateConfigTexts, validateRawConfig, type ConfigIssue } from './validate'
// Gebündelte Standard-Konfiguration (dieselben Dateien, die die App bündelt).
import bundledListe from './regelwerke.yaml?raw'
import bundledPositionen from './positionen.yaml?raw'

const bundledRegelwerke = Object.fromEntries(
  Object.entries(
    import.meta.glob('./regelwerke/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  ).map(([pfad, text]) => [pfad.replace('./regelwerke/', '').replace('.yaml', ''), text]),
)
const texte = { liste: bundledListe, regelwerke: bundledRegelwerke, positionen: bundledPositionen }

const errors = (issues: ConfigIssue[]) => issues.filter((i) => i.severity === 'error')

describe('Konfigurations-Validierung', () => {
  it('die gebündelte Konfiguration ist fehlerfrei', () => {
    const issues = validateConfigTexts(texte)
    // Bei einem Treffer die Meldungen sichtbar machen (erleichtert die Suche).
    expect(errors(issues), errors(issues).map((i) => `${i.where}: ${i.message}`).join('\n')).toEqual([])
  })

  it('meldet ein gelistetes Regelwerk ohne Datei und eine Datei ohne Listeneintrag', () => {
    const codes = validateConfigTexts({
      ...texte,
      liste: 'regelwerke: [dm-2026, gibtsnicht]',
    }).map((i) => i.code)
    expect(codes).toContain('MISSING_REGELWERK')
    expect(codes).toContain('ORPHAN_REGELWERK') // uim-2026 steht nicht mehr in der Liste
  })

  it('meldet eine Regelwerk-ID, die nicht zum Dateinamen passt', () => {
    const codes = validateConfigTexts({
      ...texte,
      regelwerke: { 'dm-2026': bundledRegelwerke['uim-2026'] },
      liste: 'regelwerke: [dm-2026]',
    }).map((i) => i.code)
    expect(codes).toContain('BAD_REGELWERK_ID')
  })

  it('prüft die Positionen gegen jedes Regelwerk: fehlender Katalog in einem genügt', () => {
    const ohneTor5 = bundledRegelwerke['uim-2026'].replace('  tor5:', '  tor5x:')
    const issues = validateConfigTexts({ ...texte, regelwerke: { ...bundledRegelwerke, 'uim-2026': ohneTor5 } })
    expect(errors(issues).map((i) => i.code)).toContain('UNKNOWN_KATALOG')
    expect(errors(issues).find((i) => i.code === 'UNKNOWN_KATALOG')?.where).toContain('uim-2026')
  })

  it('meldet fehlende Übersetzungen, wenn das Regelwerk Englisch anbietet', () => {
    const ohneEn = bundledRegelwerke['uim-2026'].replace(', en: "Additional touch of the starting pontoon"', '')
    const issues = errors(validateConfigTexts({ ...texte, regelwerke: { ...bundledRegelwerke, 'uim-2026': ohneEn } }))
    expect(issues.map((i) => i.code)).toContain('MISSING_EN')
    const ohneWort = bundledPositionen.replace('"Bemerkung": "Remarks"', '')
    const issues2 = errors(validateConfigTexts({ ...texte, positionen: ohneWort }))
    expect(issues2.find((i) => i.code === 'MISSING_EN')?.message).toContain('Bemerkung')
  })

  it('meldet unbekannte Bereiche, Buchstaben-Listen und ungültige Codes', () => {
    const raw = {
      disqualifikationen: [
        { code: 'AB', text: 'x' },
        { code: 'C', text: 'x', bereiche: ['gibtsnicht'] },
      ],
      kataloge: { k: { fehler: [{ code: 'x1', text: 'x', punkte: 5 }] } },
      klassen: ['9'],
      ohneSpalten: { p: ['fehlt'] },
      positionen: [
        { id: 'p', disq: 'tippfehler', spalten: [] },
        { id: 'q', disq: ['A'] as unknown as string, spalten: [] },
      ],
    }
    const codes = validateRawConfig(raw).map((i) => i.code)
    expect(codes).toEqual(
      expect.arrayContaining(['BAD_DISQ_CODE', 'UNKNOWN_DISQ_BEREICH', 'BAD_DISQ', 'BAD_FEHLER_CODE', 'BAD_KLASSE', 'UNKNOWN_SPALTE']),
    )
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
