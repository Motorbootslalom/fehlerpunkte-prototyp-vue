import { readdirSync, readFileSync } from 'node:fs'
import { load as yamlLoad } from 'js-yaml'
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
    // Tore 2/4/5 hell → 1/3 gedimmt; zusätzlich Speedboje_unten aus `abblenden`.
    const pos = {
      abblenden: ['Speedboje_unten'],
      spalten: [{ hebt: 'Tor2' }, { hebt: 'Tor4' }, { hebt: 'Tor5' }],
    }
    expect(deriveDimSet(pos).sort()).toEqual(['Speedboje_unten', 'Tor1', 'Tor3'])
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

describe('Berlin-Bilder (positionen.yaml)', () => {
  const { positionen } = yamlLoad(readFileSync('src/config/positionen.yaml', 'utf8')) as {
    positionen: Array<{ id: string; abblenden?: string[]; spalten?: Array<{ hebt?: string }> }>
  }
  const dim = (id: string) => deriveDimSet(positionen.find((p) => p.id === id)!)
  // Die gelben Bojen des Start/Ziel-Tors: die Gruppe und ihre beiden Bojen.
  const GELB = ['StartZiel', 'StartZiel_oben', 'StartZiel_unten']

  it('Start/Ziel: gelbe Bojen und Zeitnahme bleiben sichtbar, alle Tore nicht', () => {
    for (const id of [...GELB, 'Zeitnahme']) expect(dim('bstartziel')).not.toContain(id)
    expect(dim('bstartziel')).toEqual(expect.arrayContaining(['Tor1', 'Tor2', 'Tor3', 'Tor4', 'Tor5']))
  })

  it('Rechts und Links blenden das Start/Ziel-Tor genau einmal ab', () => {
    for (const id of ['brechts', 'blinks']) {
      expect(dim(id).filter((x) => GELB.includes(x))).toEqual(['StartZiel'])
    }
  })
})

describe('IDs in den Quell-SVGs', () => {
  const ORDNER = 'public/parcours/alcatraz_Parcours'
  const svgs = readdirSync(ORDNER).filter((f) => f.endsWith('.svg'))
  const { positionen } = yamlLoad(readFileSync('src/config/positionen.yaml', 'utf8')) as {
    positionen: Array<{ bildGenerator?: boolean; abblenden?: string[]; spalten?: Array<{ hebt?: string }> }>
  }

  it('jede ID aus positionen.yaml gibt es in allen SVGs', () => {
    const ids = new Set(
      positionen
        .filter((p) => p.bildGenerator)
        .flatMap((p) => [...(p.abblenden ?? []), ...(p.spalten ?? []).map((s) => s.hebt ?? '')])
        .filter(Boolean),
    )
    expect(ids.size).toBeGreaterThan(0)
    for (const file of svgs) {
      const svg = readFileSync(`${ORDNER}/${file}`, 'utf8')
      for (const id of ids) expect(svg, `${file}: ${id}`).toContain(`id="${id}"`)
    }
  })

  it('die Zeitnahme bleibt zur Orientierung auf jeder Liste sichtbar', () => {
    const zeitnahme = ['Zeitnahme', 'Zeit_oben', 'Zeit_unten', 'Zeit_oben_Flagge', 'Zeit_unten_Flagge']
    for (const pos of positionen.filter((p) => p.bildGenerator)) {
      for (const id of zeitnahme) expect(deriveDimSet(pos)).not.toContain(id)
    }
  })

  it('die irreführenden alten IDs sind überall ersetzt', () => {
    for (const file of svgs) {
      const svg = readFileSync(`${ORDNER}/${file}`, 'utf8')
      for (const alt of [
        'Tor1_innen-7',
        'Tor1_aussen-3',
        'Start+Ziel',
        'SpeedbojeKlasse7',
        'g3068',
        'text3034',
        'text3038',
        'text3042',
        'text3046',
        'text3050',
        'text3090',
        'g3100',
        'g3111',
      ]) {
        expect(svg, `${file}: ${alt}`).not.toContain(`id="${alt}"`)
      }
    }
  })
})
