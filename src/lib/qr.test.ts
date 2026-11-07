import { describe, expect, it } from 'vitest'
import { bogenCode, laufzettelCode, leseCode, qrModules, qrSvgDataUri, type QrBekannt } from './qr'

const kontext = { regelwerk: 'dm-2026', aufbau: 'alcatrazdm26' }
const bekannt: QrBekannt = {
  regelwerke: ['dm-2026', 'uim-2026'],
  aufbauten: ['alcatraz', 'alcatrazdm26', 'bawue'],
  positionen: ['zeit', 'zeit-1', 'zeit-2', 'zeit-3', 'steg', 'gate135', 'knoten'],
}

describe('laufzettelCode / bogenCode', () => {
  it('kodiert Regelwerk, Aufbau, Klasse und Lauf', () => {
    expect(laufzettelCode(kontext, '3', 1)).toBe('FP2.DM2026.ALCATRAZDM26.3.1')
  })

  it('hängt bei Listen Position und Seite an', () => {
    expect(bogenCode(kontext, { typeId: 'steg', klasse: 'E', lauf: 2 }, 2)).toBe(
      'FP2.DM2026.ALCATRAZDM26.E.2.STEG.S2',
    )
  })

  it('trennt die Nummer mehrfach vorhandener Positionen ab', () => {
    expect(bogenCode(kontext, { typeId: 'zeit-2', klasse: '3', lauf: 1 }, 1)).toBe(
      'FP2.DM2026.ALCATRAZDM26.3.1.ZEIT.2.S1',
    )
  })

  it('nutzt nur Zeichen, die jede Tastaturbelegung gleich tippt', () => {
    const code = bogenCode(kontext, { typeId: 'zeit-3', klasse: '7', lauf: 3 }, 12)
    expect(code).toMatch(/^[A-Z0-9.]+$/)
  })
})

describe('leseCode', () => {
  it('liest den eigenen Code eines Laufzettels zurück', () => {
    expect(leseCode(laufzettelCode(kontext, '3', 1), bekannt)).toEqual({
      ok: true,
      ziel: { regelwerk: 'dm-2026', aufbau: 'alcatrazdm26', klasse: '3', lauf: 1 },
    })
  })

  it('liest Listen mit Nummer und Seite zurück', () => {
    for (const typeId of ['zeit-2', 'steg', 'gate135']) {
      const code = bogenCode(kontext, { typeId, klasse: 'E', lauf: 3 }, 4)
      expect(leseCode(code, bekannt)).toEqual({
        ok: true,
        ziel: { regelwerk: 'dm-2026', aufbau: 'alcatrazdm26', klasse: 'E', lauf: 3, typeId, seite: 4 },
      })
    }
  })

  it('unterscheidet die einfache Position von nummerierten', () => {
    const lesung = leseCode('FP2.DM2026.ALCATRAZ.3.1.ZEIT.S1', bekannt)
    expect(lesung.ok && lesung.ziel.typeId).toBe('zeit')
  })

  it('ist unempfindlich gegen Kleinschreibung und Leerraum', () => {
    expect(leseCode('  fp2.dm2026.bawue.3.1\n', bekannt).ok).toBe(true)
  })

  it('verkraftet vertauschtes Y/Z (Scanner und PC mit anderer Tastatur)', () => {
    // Der Scanner vertauscht dann JEDES Y und Z, auch im Aufbau.
    const lesung = leseCode('FP2.DM2026.ALCATRAYDM26.3.1.YEIT.2.S1', bekannt)
    expect(lesung.ok && lesung.ziel.typeId).toBe('zeit-2')
  })

  it('nennt den Grund, wenn ein Code nicht passt', () => {
    const fehler = (code: string) => {
      const l = leseCode(code, bekannt)
      return l.ok ? '' : l.fehler
    }
    expect(fehler('')).toMatch(/Kein Code/)
    expect(fehler('FP1;e=x;t=zeit;k=3;l=1')).toMatch(/alten Format/)
    expect(fehler('4006381333931')).toMatch(/Kein Code dieser App/)
    expect(fehler('FP2.DM2026.ALCATRAZ.3')).toMatch(/unvollständig/)
    expect(fehler('FP2.DM2030.ALCATRAZ.3.1')).toMatch(/Regelwerk „DM2030“/)
    expect(fehler('FP2.DM2026.BERLIN.3.1')).toMatch(/Aufbau „BERLIN“/)
    expect(fehler('FP2.DM2026.ALCATRAZ.A.1')).toMatch(/Klasse „A“/)
    expect(fehler('FP2.DM2026.ALCATRAZ.3.4')).toMatch(/Lauf „4“/)
    expect(fehler('FP2.DM2026.ALCATRAZ.3.1.TOR9.S1')).toMatch(/Position „TOR9“/)
    expect(fehler('FP2.DM2026.ALCATRAZ.3.1.STEG')).toMatch(/unvollständig/)
    expect(fehler('FP2.DM2026.ALCATRAZ.3.1.STEG.S0')).toMatch(/unvollständig/)
    expect(fehler('FP2.DM2026.ALCATRAZ.3.1.STEG.S1.X')).toMatch(/unvollständig/)
  })
})

describe('QR-Bild', () => {
  it('nutzt für unsere Codes den kompakten alphanumerischen Modus', () => {
    // 25 × 25 Kästchen (Version 2) statt 29 × 29 im Byte-Modus.
    expect(qrModules('FP2.DM2026.ALCATRAZDM26.3.1.ZEIT.2.S1')).toHaveLength(25)
  })

  it('erzeugt eine SVG-data-URI', () => {
    const uri = qrSvgDataUri('FP2.DM2026.ALCATRAZ.3.1')
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true)
    const svg = atob(uri.slice('data:image/svg+xml;base64,'.length))
    expect(svg).toContain('<svg')
    expect(svg).toContain('<path')
  })
})
