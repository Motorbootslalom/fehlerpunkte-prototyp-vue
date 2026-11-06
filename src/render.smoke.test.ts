import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'
import { bundledConfig, initConfig } from './config/active'
import { ergebnisKlasse, showErgebnisse, showGesamtliste, showLegende } from './state/laufzettel'
import { createStore } from './state/store'

// Render-Smoke-Test (ersetzt den React-Render-Test): stellt sicher, dass die
// Komponenten mit dem Vue-Store tatsächlich zu HTML rendern - inkl.
// Bedienleiste, Bogen-Tabelle, Legende und Σ-Spalte.
describe('App-Render', () => {
  it('rendert Bedienleiste und mindestens einen Bogen', async () => {
    initConfig(bundledConfig())
    const app = createSSRApp(App)
    app.use(createStore())
    const html = await renderToString(app)

    expect(html).toContain('control-panel') // Bedienleiste
    expect(html).toContain('sheet-table') // WYSIWYG-Bogen
    expect(html).toContain('legend') // Fuß-Legende
    expect(html).toContain('Unterschrift WKR') // Unterschriftszeile
    expect(html).toContain('DM 2026') // Regelwerk im Menü
    expect(html).toContain('wkr-caption') // Bezeichnung unter der WKR-Linie (Druck)
    expect(html).not.toContain('legende-sheet') // A4-Legende nur auf Wunsch
  })

  it('rendert die A4-Legende mit Codes und Disqualifikationen des Regelwerks', async () => {
    initConfig(bundledConfig())
    showLegende.value = true
    const app = createSSRApp(App)
    app.use(createStore())
    const html = await renderToString(app)
    showLegende.value = false

    expect(html).toContain('legende-sheet')
    expect(html).toContain('Rettungsring nicht sichtbar über Mittelsäule gehoben')
    expect(html).toContain('Vollkreis vor Tor 5')
    expect(html).toContain('Fehler sind kombinierbar')
  })

  it('rendert je Lauf zwei Ergebnislisten und die Gesamtliste nur auf Wunsch', async () => {
    initConfig(bundledConfig())
    const { store, install } = createStore()
    for (const lauf of [1, 2, 3] as const) {
      const bogen = { id: 'x', typeId: 'zeit', klasse: '4' as const, lauf }
      store.dispatch({ type: 'SET_VALUE', bogen, cell: '401:zeit1', value: '1,1000' })
      store.dispatch({ type: 'SET_VALUE', bogen, cell: '402:zeit1', value: '1,2000' })
    }
    store.dispatch({ type: 'SET_VALUE', bogen: { id: 'x', typeId: 'steg', klasse: '4', lauf: 2 }, cell: '402:disq', value: 'C' })
    store.dispatch({ type: 'SET_STARTER', klasse: '4', starter: { '401': { name: 'Muster', vorname: 'Anna' } } })
    showErgebnisse.value = true
    ergebnisKlasse.value = '4'
    const rendern = async () => {
      const app = createSSRApp(App)
      app.use({ install })
      return renderToString(app)
    }
    const ohneGesamt = await rendern()
    showGesamtliste.value = true
    const html = await rendern()
    showGesamtliste.value = false
    showErgebnisse.value = false
    ergebnisKlasse.value = ''

    expect(ohneGesamt.match(/ergebnis-sheet/g)).toHaveLength(6)
    expect(ohneGesamt).not.toContain('erg-gestrichen')
    expect(html.match(/ergebnis-sheet/g)).toHaveLength(7)
    expect(html).toContain('erg-gestrichen')
    expect(html).toContain('Schon ab zwei Läufen einen streichen')
    expect(html).toContain('Fehler-Schlüssel')
    expect(html).toContain('Muster')
    expect(html).not.toContain('999,00')
    expect(html).toMatch(/erg-disq[^>]*>\s*disq\.\s*</)
    expect(html).toContain('Knoten')
  })

  describe('Zeitstempel der Ergebnislisten', () => {
    afterEach(() => vi.useRealTimers())

    it('zeigt je Liste, wann sie sich zuletzt geändert hat', async () => {
      initConfig(bundledConfig())
      vi.useFakeTimers({ toFake: ['Date'] })
      const { store, install } = createStore()
      const eintragen = (lauf: 1 | 2, zeit: Date, value: string) => {
        vi.setSystemTime(zeit)
        store.dispatch({ type: 'SET_VALUE', bogen: { id: 'x', typeId: 'zeit', klasse: '4', lauf }, cell: '401:zeit1', value })
      }
      eintragen(1, new Date(2026, 4, 2, 10, 5), '80,00')
      eintragen(2, new Date(2026, 4, 2, 15, 30), '81,00')
      // Später, ohne Änderung auf der Liste: Der Zeitstempel bleibt.
      eintragen(1, new Date(2026, 4, 3, 9, 0), '80,00')

      showErgebnisse.value = true
      showGesamtliste.value = true
      ergebnisKlasse.value = '4'
      const app = createSSRApp(App)
      app.use({ install })
      const html = await renderToString(app)
      showErgebnisse.value = false
      showGesamtliste.value = false
      ergebnisKlasse.value = ''

      const staende = [...html.matchAll(/erg-stand[^>]*>([^<]*)</g)].map((m) => m[1])
      expect(staende).toEqual([
        '02.05.2026 10:05',
        '02.05.2026 10:05',
        '02.05.2026 15:30',
        '02.05.2026 15:30',
        '02.05.2026 15:30',
      ])
    })
  })
})
