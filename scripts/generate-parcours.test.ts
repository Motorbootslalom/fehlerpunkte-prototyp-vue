import { describe, it, expect } from 'vitest'
import { deriveDimSet, applyDimming, DIM_UNIVERSE, DIM_OPACITY } from './generate-parcours.ts'

describe('deriveDimSet', () => {
  it('leitet aus Spalten-`hebt` die Gegenmenge des DIM_UNIVERSE ab', () => {
    // Tore 1/3/5 hervorgehoben → 2/4 abgeblendet.
    const pos = {
      spalten: [
        { hebt: 'Tor1' },
        { hebt: 'Tor3' },
        { hebt: 'Tor5' },
        { hebt: 'Tor1' }, // Duplikat schadet nicht
        {},
      ],
    }
    expect(deriveDimSet(pos).sort()).toEqual(['Tor2', 'Tor4'])
  })

  it('nutzt `abblenden` als Fallback, wenn keine Spalte `hebt` setzt', () => {
    const pos = { abblenden: ['Tor1', 'Tor3'], spalten: [{}, {}] }
    expect(deriveDimSet(pos).sort()).toEqual(['Tor1', 'Tor3'])
  })

  it('vereint `abblenden` mit der aus `hebt` abgeleiteten Menge', () => {
    // Tore 2/4/5 hell → 1/3 gedimmt; zusätzlich SpeedbojeKlasse7 aus `abblenden`.
    const pos = {
      abblenden: ['SpeedbojeKlasse7'],
      spalten: [{ hebt: 'Tor2' }, { hebt: 'Tor4' }, { hebt: 'Tor5' }],
    }
    expect(deriveDimSet(pos).sort()).toEqual(['SpeedbojeKlasse7', 'Tor1', 'Tor3'])
  })

  it('gibt nichts zurück, wenn weder `hebt` noch `abblenden` gesetzt sind', () => {
    expect(deriveDimSet({ spalten: [{}, {}] })).toEqual([])
  })

  it('blendet bei vollständiger Hervorhebung nichts ab', () => {
    const pos = { spalten: DIM_UNIVERSE.map((g) => ({ hebt: g })) }
    expect(deriveDimSet(pos)).toEqual([])
  })
})

describe('applyDimming', () => {
  const svg =
    '<svg><g id="Tor1"><circle/></g><g id="Tor2" style="fill:#ff6600"><circle/></g></svg>'

  it('fügt genau den Ziel-Elementen ein opacity-Attribut hinzu', () => {
    const { svg: out, missing } = applyDimming(svg, ['Tor2'])
    expect(out).toContain(`id="Tor2" opacity="${DIM_OPACITY}"`)
    expect(out).not.toContain('id="Tor1" opacity') // Tor1 unangetastet
    expect(missing).toEqual([])
  })

  it('meldet nicht gefundene IDs, ohne die SVG zu verändern', () => {
    const { svg: out, missing } = applyDimming(svg, ['Tor9'])
    expect(out).toBe(svg)
    expect(missing).toEqual(['Tor9'])
  })

  it('akzeptiert eine eigene Deckkraft', () => {
    const { svg: out } = applyDimming(svg, ['Tor1'], 0.5)
    expect(out).toContain('id="Tor1" opacity="0.5"')
  })
})
