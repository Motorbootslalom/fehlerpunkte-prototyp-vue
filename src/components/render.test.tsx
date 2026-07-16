import { beforeEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StoreProvider } from '../state/store'
import { App } from '../App'

/** Minimaler localStorage-Ersatz für die Node-Testumgebung. */
function stubStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
    key: () => null,
    length: 0,
  } as Storage
}

function render(): string {
  return renderToStaticMarkup(createElement(StoreProvider, null, createElement(App)))
}

describe('UI-Render (SSR-Smoke)', () => {
  beforeEach(() => stubStorage())

  it('rendert die Standard-Bögen mit Event-Titel und Unterschriftzeile', () => {
    const html = render()
    expect(html).toContain('30. Möwepokal 2026')
    expect(html).toContain('Unterschrift WKR')
    expect(html).toContain('Klasse 3')
  })

  it('rendert alle acht Listentypen mit ihren Kopf-Titeln', () => {
    const html = render()
    for (const title of ['Tor 1 / 3 / 5', 'Tor 2 / 4 / 5', 'Mann-über-Bord', 'Steg', 'Zeit', 'Knoten']) {
      expect(html).toContain(title)
    }
  })

  it('bettet je Bogen einen QR-Code ein', () => {
    const html = render()
    expect(html).toContain('data:image/svg+xml;base64,')
    expect(html).toContain('FP1;e=30-moewepokal-2026;t=gate135;k=3;l=1')
  })

  it('zeigt die Disqualifikations-Legende (A-X) auf den Tor-Bögen', () => {
    const html = render()
    expect(html).toContain('Disqualifikation:')
    expect(html).toContain('Nicht gestartet') // Code X
  })
})
