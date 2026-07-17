import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'
import { bundledConfig, initConfig } from './config/active'
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
  })
})
