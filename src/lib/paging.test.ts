import { describe, expect, it } from 'vitest'
import { pageChunks } from './paging'

const nums = (n: number) => Array.from({ length: n }, (_, i) => String(301 + i))
const sizes = (chunks: string[][]) => chunks.map((c) => c.length)

describe('pageChunks', () => {
  it('ohne Zeilen/Seite bleibt alles auf einer Seite', () => {
    expect(sizes(pageChunks(nums(40), 0))).toEqual([40])
  })

  it('teilt nach Zeilen/Seite auf (ohne Schwelle wie bisher)', () => {
    expect(sizes(pageChunks(nums(25), 15))).toEqual([15, 10])
    expect(sizes(pageChunks(nums(16), 15))).toEqual([15, 1])
    expect(sizes(pageChunks(nums(15), 15))).toEqual([15])
  })

  it('mit Schwelle: erst ab so vielen Startern aufteilen', () => {
    // Beispiel: ab 25 Startern je 15 pro Seite, 16-24 bleiben eine Seite.
    expect(sizes(pageChunks(nums(25), 15, 25))).toEqual([15, 10])
    expect(sizes(pageChunks(nums(30), 15, 25))).toEqual([15, 15])
    expect(sizes(pageChunks(nums(24), 15, 25))).toEqual([24])
    expect(sizes(pageChunks(nums(16), 15, 25))).toEqual([16])
  })

  it('liefert für eine leere Klasse genau einen leeren Block', () => {
    expect(pageChunks([], 15, 25)).toEqual([[]])
    expect(pageChunks([], 0)).toEqual([[]])
  })
})
