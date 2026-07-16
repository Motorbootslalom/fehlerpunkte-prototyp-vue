// Erzeugt die abgeblendeten Parcoursbilder aus EINER Quelle (Standard:
// alcatraz_Parcours). Statt pro Position ein Bild von Hand zu malen, wird je
// Position abgeleitet, WELCHE Tore hervorgehoben bleiben - der Rest bekommt eine
// reduzierte Deckkraft (opacity). Der Fahrweg, die Zeitnahme, Start/Ziel usw.
// bleiben immer sichtbar. Ausgabe: gedimmte SVG + gerastertes PNG (für den
// react-pdf-Druck, der kein SVG einbetten kann).
//
// Aufruf: `node scripts/generate-parcours.ts` (bzw. `npm run parcours:build`).
//
// Gesteuert wird das über positionen.yaml:
//   • Positions-Feld  bildGenerator: true   → dieses Bild wird generiert
//   • Positions-Feld  bildQuelle: <ordner>  → Quellordner (Default alcatraz_Parcours)
//   • Positions-Feld  bild: <ordner>        → Zielordner (das die App lädt)
//   • Spalten-Feld    hebt: <id>            → dieses Element bleibt hervorgehoben
//   • Positions-Feld  abblenden: [<id>, …]  → Fallback/Ergänzung: explizit dimmen
import { load as yamlLoad } from 'js-yaml'
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/** Tore, die je nach Position hervorgehoben ODER abgeblendet werden. Alles
 *  andere (Fahrweg, Zeitnahme, Start/Ziel, Schikane, Speedbojen) bleibt sichtbar,
 *  außer es steht ausdrücklich in `abblenden`. */
export const DIM_UNIVERSE = ['Tor1', 'Tor2', 'Tor3', 'Tor4', 'Tor5'] as const

/** Rest-Deckkraft der abgeblendeten Elemente (0 = unsichtbar, 1 = voll). */
export const DIM_OPACITY = 0.2

/** Rasterungs-Faktor der PNGs (2 = doppelte Auflösung für scharfen Druck). */
export const PNG_ZOOM = 2

interface Spalte {
  hebt?: string
}
interface Position {
  id?: string
  bild?: string
  bildGenerator?: boolean
  bildQuelle?: string
  abblenden?: string[]
  spalten?: Spalte[]
}

/**
 * Leitet aus einer Position die Menge der abzublendenden Element-IDs ab:
 *   • Setzen Spalten `hebt`, bleiben genau diese Tore hell → der Rest des
 *     DIM_UNIVERSE wird abgeblendet.
 *   • Zusätzlich (oder als Fallback ohne `hebt`) greift `abblenden`.
 */
export function deriveDimSet(pos: Position): string[] {
  const hervorgehoben = new Set(
    (pos.spalten ?? []).map((s) => s?.hebt).filter((x): x is string => !!x),
  )
  const dim = new Set<string>(pos.abblenden ?? [])
  if (hervorgehoben.size > 0) {
    for (const gate of DIM_UNIVERSE) if (!hervorgehoben.has(gate)) dim.add(gate)
  }
  return [...dim]
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

// ---- CLI --------------------------------------------------------------------
// (Der obige Kern ist rein und wird von generate-parcours.test.ts geprüft.)

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) run()

function run(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const parcoursRoot = resolve(root, 'public/parcours')
  const yamlText = readFileSync(resolve(root, 'public/config/positionen.yaml'), 'utf8')
  const config = yamlLoad(yamlText) as { positionen?: Position[] }
  const positionen = config.positionen ?? []

  // Nach Ziel-Ordner bündeln: mehrere Positionen (z. B. Alcatraz + Frontal)
  // teilen sich dasselbe Bild. Ihre abgeleiteten Dimm-Mengen müssen übereinstimmen.
  const jobs = new Map<string, { source: string; dim: string[]; from: string }>()
  for (const pos of positionen) {
    if (!pos?.bildGenerator) continue
    if (!pos.bild) {
      console.warn(`  ⚠ Position "${pos.id}" hat bildGenerator, aber kein "bild" - übersprungen.`)
      continue
    }
    const source = pos.bildQuelle ?? 'alcatraz_Parcours'
    const dim = deriveDimSet(pos).sort()
    const prev = jobs.get(pos.bild)
    if (prev && (prev.source !== source || prev.dim.join(',') !== dim.join(','))) {
      console.warn(
        `  ⚠ Zielbild "${pos.bild}" wird von "${prev.from}" und "${pos.id}" mit unterschiedlichen ` +
          `Vorgaben belegt (${prev.dim.join('/')} vs. ${dim.join('/')}). Es gilt "${prev.from}".`,
      )
      continue
    }
    if (!prev) jobs.set(pos.bild, { source, dim, from: pos.id ?? '?' })
  }

  if (jobs.size === 0) {
    console.log('  Keine Positionen mit bildGenerator: true - nichts zu tun.')
    return
  }

  let svgCount = 0
  let pngCount = 0
  for (const [target, { source, dim }] of jobs) {
    const srcDir = resolve(parcoursRoot, source)
    const outDir = resolve(parcoursRoot, target)
    if (!existsSync(srcDir)) {
      console.warn(`  ⚠ Quellordner fehlt: parcours/${source} (Ziel "${target}") - übersprungen.`)
      continue
    }
    mkdirSync(outDir, { recursive: true })
    const svgs = readdirSync(srcDir).filter((f) => f.endsWith('.svg'))
    console.log(`  parcours/${source} → parcours/${target}  (abblenden: ${dim.join(', ') || '—'})`)
    for (const file of svgs) {
      const srcSvg = readFileSync(resolve(srcDir, file), 'utf8')
      const { svg, missing } = applyDimming(srcSvg, dim)
      if (missing.length > 0)
        console.warn(`      ⚠ ${file}: IDs nicht gefunden: ${missing.join(', ')}`)
      writeFileSync(resolve(outDir, file), svg)
      svgCount++
      const png = new Resvg(svg, {
        fitTo: { mode: 'zoom', value: PNG_ZOOM },
        font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' },
      })
        .render()
        .asPng()
      writeFileSync(resolve(outDir, file.replace(/\.svg$/, '.png')), png)
      pngCount++
    }
  }
  console.log(`\n  ✔ ${jobs.size} Bild-Satz/Sätze, ${svgCount} SVG + ${pngCount} PNG erzeugt.`)
}
