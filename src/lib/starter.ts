import type { Starter } from '../types'

// Namen der Starter als Text: je Zeile Startnummer, Name, Vorname. Mit Semikolon oder Tabulator
// (aus Excel kopiert) getrennt, sonst mit Leerzeichen: Dann gehört alles hinter dem Namen zum
// Vornamen („428 Muster Anna Lena“).

export function parseStarter(raw: string): Record<string, Starter> {
  const out: Record<string, Starter> = {}
  for (const zeile of raw.split(/\r?\n/)) {
    const [nr, name = '', ...vorname] = /[\t;]/.test(zeile)
      ? zeile.split(/[\t;]/).map((t) => t.trim())
      : zeile.trim().split(/\s+/)
    if (nr && name) out[nr.toUpperCase()] = { name, vorname: vorname.filter(Boolean).join(' ') }
  }
  return out
}

export function formatStarter(starter: Record<string, Starter> | undefined): string {
  return Object.entries(starter ?? {})
    .sort(([a], [b]) => vergleicheNr(a, b))
    .map(([nr, { name, vorname }]) => `${nr}; ${name}; ${vorname}`)
    .join('\n')
}

/** Startnummern in natürlicher Reihenfolge (E2 vor E10, 99 vor 401). */
export function vergleicheNr(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true })
}
