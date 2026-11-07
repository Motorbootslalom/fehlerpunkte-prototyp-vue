// Abgeblendete Parcoursbilder aus EINER Quelle (Standard: alcatraz_Parcours). Statt je
// Position ein Bild von Hand zu malen, wird abgeleitet, welche Tore hell bleiben; der Rest
// bekommt eine geringere Deckkraft. Fahrweg und Zeitnahme bleiben immer sichtbar.
//
// Nur Text und Daten, ohne Node und ohne Bundler: Der Build (scripts/generate-parcours.ts)
// schreibt damit SVG und PNG nach public/parcours, der Browser erzeugt damit Bilder für
// Positionen ohne vorgebautes Bild (`bildImBrowser`, z. B. eigene Aufbauten).

/** Tore, die je nach Position hervorgehoben ODER abgeblendet werden. Alles
 *  andere (Fahrweg, Zeitnahme, Start/Ziel, Schikane, Speedbojen) bleibt sichtbar,
 *  außer es steht ausdrücklich in `abblenden`. */
export const DIM_UNIVERSE = ['Tor1', 'Tor2', 'Tor3', 'Tor4', 'Tor5'] as const

/** IDs, die nicht in jedem Klassenbild vorkommen: Die untere Speedboje zeigt der
 *  Master-Export nur dort, wo die Route um sie herumführt. */
export const OPTIONALE_IDS = new Set(['Speedboje_unten', 'Nummer_Speedboje_unten'])

/** Rest-Deckkraft der abgeblendeten Elemente (0 = unsichtbar, 1 = voll). */
export const DIM_OPACITY = 0.2

/** Die Ziffern im Parcoursbild (Tore, Schikane, Speedbojen). */
export const ZIFFERN_IDS = [
  'Nummer_Tor1',
  'Nummer_Tor2',
  'Nummer_Tor3',
  'Nummer_Tor4',
  'Nummer_Tor5',
  'Nummer_Schikane',
  'Nummer_Speedboje_oben',
  'Nummer_Speedboje_unten',
] as const

/** Deckkraft ausgeblendeter Ziffern. Über die Deckkraft statt `display="none"`, weil sie
 *  `display:inline` im style tragen und der das Attribut überstimmt. */
export const AUSBLENDEN_OPACITY = 0

/** Der gestrichelte Rahmen der Quelle. Im Master legt er die Exportfläche fest (split.py:
 *  `--export-id Export_Area`), darum steht er in jeder Kopie. */
export const RAHMEN_ID = 'rect4816'

/** Quellordner unter public/parcours, wenn die Position keinen nennt. */
export const STANDARD_QUELLE = 'alcatraz_Parcours'

/** Was eine Position für ihr Bild braucht (Auszug aus der Roh-Position). */
export interface BildPosition {
  id?: string
  bild?: string
  bildGenerator?: boolean
  bildImBrowser?: boolean
  bildQuelle?: string
  abblenden?: string[]
  bildNeben?: boolean
  bildDrehung?: number
  spalten?: Array<{ hebt?: string }>
}

/**
 * Leitet aus einer Position die Menge der abzublendenden Element-IDs ab:
 *   • Setzen Spalten `hebt`, bleiben genau diese Tore hell → der Rest des
 *     DIM_UNIVERSE wird abgeblendet.
 *   • Zusätzlich (oder als Fallback ohne `hebt`) greift `abblenden`.
 */
export function deriveDimSet(pos: BildPosition): string[] {
  const hervorgehoben = new Set((pos.spalten ?? []).map((s) => s?.hebt).filter((x): x is string => !!x))
  const dim = new Set<string>(pos.abblenden ?? [])
  if (hervorgehoben.size > 0) {
    for (const gate of DIM_UNIVERSE) if (!hervorgehoben.has(gate)) dim.add(gate)
  }
  return [...dim]
}

/** Hochkant oder neben der Legende ist ein Bild zu klein für lesbare Ziffern. */
export function kleinesBild(pos: Pick<BildPosition, 'bildNeben' | 'bildDrehung'>): boolean {
  return !!pos.bildNeben || Math.abs(pos.bildDrehung ?? 0) === 90
}

/**
 * Fügt jedem Element mit einer der `dimIds` das Attribut `opacity` hinzu.
 * Rein additiv/nicht-destruktiv - die Quelldatei bleibt unangetastet. Gibt die
 * Liste der IDs zurück, die in der SVG NICHT gefunden wurden (für Warnungen).
 */
export function applyDimming(svg: string, dimIds: string[], opacity = DIM_OPACITY): { svg: string; missing: string[] } {
  let out = svg
  const missing: string[] = []
  for (const id of dimIds) {
    const needle = `id="${id}"`
    if (!out.includes(needle)) {
      missing.push(id)
      continue
    }
    out = out.replace(needle, `${needle} opacity="${opacity}"`)
  }
  return { svg: out, missing }
}

/**
 * Entfernt den Rahmen der Quelle: Die App zieht selbst einen um das Bild (`.course`).
 * Das Bild behält seine Maße. Abblenden ginge nicht, weil die Deckkraft des Rahmens im
 * `style` steht und das Attribut überstimmt.
 */
export function ohneRahmen(svg: string): string {
  return svg.replace(new RegExp(`<path\\b[^>]*\\bid="${RAHMEN_ID}"[^>]*/>`), '')
}

/** Woraus ein Bild entsteht: Quellordner, abgeblendete und ausgeblendete IDs. */
export interface BildVorgabe {
  quelle: string
  /** Abgeblendet, sortiert; ohne das, was ohnehin ausgeblendet wird. */
  dim: string[]
  /** Ausgeblendet: die Ziffern bei kleinen Bildern. */
  aus: string[]
}

/** Die Vorgabe des Bildes einer Position. */
export function bildVorgabe(pos: BildPosition): BildVorgabe {
  const aus: string[] = kleinesBild(pos) ? [...ZIFFERN_IDS] : []
  // Ausgeblendetes nicht zusätzlich abblenden: Zwei opacity-Attribute wären ungültiges SVG.
  const dim = deriveDimSet(pos)
    .filter((id) => !aus.includes(id))
    .sort()
  return { quelle: pos.bildQuelle ?? STANDARD_QUELLE, dim, aus }
}

/** Das fertige Bild aus dem Quellbild: ohne Rahmen, abgeblendet, Ziffern je nach Größe. */
export function bildSvg(quelle: string, vorgabe: Pick<BildVorgabe, 'dim' | 'aus'>): { svg: string; fehlend: string[] } {
  const gedimmt = applyDimming(ohneRahmen(quelle), vorgabe.dim)
  const { svg, missing } = applyDimming(gedimmt.svg, vorgabe.aus, AUSBLENDEN_OPACITY)
  return { svg, fehlend: [...gedimmt.missing, ...missing].filter((id) => !OPTIONALE_IDS.has(id)) }
}
