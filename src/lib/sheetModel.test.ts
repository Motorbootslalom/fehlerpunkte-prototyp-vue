import { beforeAll, describe, expect, it } from 'vitest'
import { bundledConfig, initConfig } from '../config/active'
import { buildInitialState } from '../state/initState'
import { buildAllPages } from './sheetModel'
import { cellKey } from './scoring'
import type { AppState } from '../types'

// Testet das headless Sheet-Modell (Basis der Vektor-PDF-Generatoren pdfmake und
// jsPDF): Seiten, Blatt-Spalten, Zeilen und die berechneten Zell-Anzeigen.
describe('buildAllPages (Sheet-Modell für PDF)', () => {
  beforeAll(() => initConfig(bundledConfig()))

  it('erzeugt je Bogen mindestens eine Seite mit Spalten und Zeilen', () => {
    const state = buildInitialState()
    const pages = buildAllPages(state)

    expect(pages.length).toBeGreaterThan(0)
    for (const pg of pages) {
      expect(pg.leaves.length).toBeGreaterThan(0)
      // Startnummern + Leerzeilen
      const nums = state.numbers[pg.klasse as keyof AppState['numbers']] ?? []
      expect(pg.rows.length).toBe(nums.length + state.emptyRows)
      // Jede Zeile hat genau so viele Zellen wie Blatt-Spalten.
      for (const r of pg.rows) expect(r.cells.length).toBe(pg.leaves.length)
    }
  })

  it('berechnet Σ aus eingetragenen Bojenpunkten', () => {
    const state = buildInitialState()
    // Ersten Bogen mit einer Σ-Spalte finden.
    const bogen = state.boegen.find((b) => {
      const pgs = buildAllPages({ ...state, boegen: [b] })
      return pgs[0]?.leaves.some((l) => l.kind === 'sum') && pgs[0]?.leaves.some((l) => l.kind === 'buoy')
    })
    if (!bogen) return // keine passende Position im Default-Aufbau - Test überspringen

    const one = buildAllPages({ ...state, boegen: [bogen] })[0]
    const nr = one.rows.find((r) => r.fixed)!.nr
    const buoy = one.leaves.find((l) => l.kind === 'buoy')!
    const values: AppState['values'] = {
      [bogen.id]: { [cellKey(nr, buoy.colKey, buoy.subIndex)]: '10' },
    }
    const withVal = buildAllPages({ ...state, boegen: [bogen], values })[0]
    const row = withVal.rows.find((r) => r.nr === nr)!
    const sumIdx = withVal.leaves.findIndex((l) => l.kind === 'sum')
    expect(row.cells[sumIdx].display).toBe('10')
  })
})
