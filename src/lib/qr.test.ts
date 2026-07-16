import { describe, expect, it } from 'vitest'
import { bogenPayload, qrSvgDataUri } from './qr'
import type { Bogen } from '../types'

describe('bogenPayload', () => {
  it('kodiert Listentyp, Klasse und Lauf eindeutig', () => {
    const b: Bogen = { id: 'x', typeId: 'gate135', klasse: '3', lauf: 1 }
    expect(bogenPayload('30. Möwepokal 2026', b)).toBe(
      'FP1;e=30-moewepokal-2026;t=gate135;k=3;l=1',
    )
  })
})

describe('qrSvgDataUri', () => {
  it('erzeugt eine SVG-data-URI', () => {
    const uri = qrSvgDataUri('FP1;t=zeit;k=3;l=1')
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true)
    const svg = atob(uri.slice('data:image/svg+xml;base64,'.length))
    expect(svg).toContain('<svg')
    expect(svg).toContain('<path')
  })
})
