import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildConfig } from '../config/build'
import { kurzformPosition } from '../config/kurzform'
import { validateRawConfig } from '../config/validate'
import { bildSvg, bildVorgabe, ZIFFERN_IDS } from './parcoursbild'
import { erzeugtesBild } from './parcoursbildBrowser'

const QUELLE = '<svg><path id="rect4816" d="M0"/><g id="Tor1"/><g id="Tor2"/><text id="Nummer_Tor1">1</text></svg>'

describe('Parcoursbild aus der Quelle', () => {
  it('entfernt den Rahmen, blendet ab und blendet bei kleinen Bildern die Ziffern aus', () => {
    const { svg, fehlend } = bildSvg(QUELLE, { dim: ['Tor2'], aus: ['Nummer_Tor1'] })
    expect(svg).toBe('<svg><g id="Tor1"/><g id="Tor2" opacity="0.2"/><text id="Nummer_Tor1" opacity="0">1</text></svg>')
    expect(fehlend).toEqual([])
  })

  it('leitet die Vorgabe aus der Position ab', () => {
    const neben = bildVorgabe({ bildNeben: true, abblenden: ['Tor2', 'Nummer_Tor1'], bildQuelle: 'eigen' })
    expect(neben).toEqual({ quelle: 'eigen', dim: ['Tor2'], aus: [...ZIFFERN_IDS] })
    expect(bildVorgabe({ abblenden: ['Tor3', 'Tor1'] })).toEqual({ quelle: 'alcatraz_Parcours', dim: ['Tor1', 'Tor3'], aus: [] })
  })
})

describe('Bild im Browser (bildImBrowser)', () => {
  afterEach(() => vi.unstubAllGlobals())

  const position = kurzformPosition({ id: 'eigen', titel: 'Eigen', blick: 'links', bojen: ['Tor2'], bildImBrowser: true })

  it('braucht keinen Bildordner und nimmt das Quellbild', () => {
    expect(position.bild).toBeUndefined()
    expect(validateRawConfig({ positionen: [position] }).map((i) => i.code)).not.toContain('MISSING_BILD')
    const def = buildConfig({ positionen: [position] }).positions[0]
    expect(def.courseImageDir).toBe('alcatraz_Parcours')
    expect(def.bildErzeugen?.dim).toEqual(bildVorgabe(position).dim)
    expect(def.bildErzeugen?.dim).toContain('Tor1')
  })

  it('erzeugt jedes Bild nur einmal und liefert eine Blob-URL', async () => {
    const fetchMock = vi.fn(async () => new Response(QUELLE))
    vi.stubGlobal('fetch', fetchMock)
    const vorgabe = { dim: ['Tor1'], aus: [] }
    const [a, b] = await Promise.all([erzeugtesBild('/q/Klasse5.svg', vorgabe), erzeugtesBild('/q/Klasse5.svg', vorgabe)])
    expect(a).toBe(b)
    expect(a.startsWith('blob:')).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
