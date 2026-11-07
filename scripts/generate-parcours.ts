// Erzeugt die abgeblendeten Parcoursbilder aus EINER Quelle (Standard:
// alcatraz_Parcours). Statt pro Position ein Bild von Hand zu malen, wird je
// Position abgeleitet, WELCHE Tore hervorgehoben bleiben - der Rest bekommt eine
// reduzierte Deckkraft (opacity). Der Fahrweg, die Zeitnahme, Start/Ziel usw.
// bleiben immer sichtbar. Ausgabe: gedimmte SVG + gerastertes PNG (für den
// react-pdf-Druck, der kein SVG einbetten kann).
//
// Aufruf: `node scripts/generate-parcours.ts` (bzw. `npm run parcours:build`).
// Ist die erzeugte SVG identisch mit der vorhandenen (und das PNG da), wird der
// Satz NICHT neu gerastert: PNGs fallen je Umgebung (resvg/Schriften) byte-weise
// anders aus - ein Neuschreiben machte den Git-Baum im Build „dirty“.
// `--force` rastert trotzdem alles neu (z. B. nach einem resvg-Update).
//
// Gesteuert wird das über die Positionen (src/config/aufbauten/*.yaml, zusammengeführt
// in public/config/positionen.yaml):
//   • Positions-Feld  bildGenerator: true   → dieses Bild wird generiert
//   • Positions-Feld  bildQuelle: <ordner>  → Quellordner (Default alcatraz_Parcours)
//   • Positions-Feld  bild: <ordner>        → Zielordner (das die App lädt)
//   • Spalten-Feld    hebt: <id>            → dieses Element bleibt hervorgehoben
//   • Positions-Feld  abblenden: [<id>, …]  → Fallback/Ergänzung: explizit dimmen
//   • Positions-Feld  bildImBrowser: true   → kein vorgebautes Bild, der Browser erzeugt es
//
// Die Ziffern in den Bojen bleiben nur bei großen Bildern (quer unter der Legende).
// Hochkant oder neben der Legende wären sie nicht lesbar, siehe kleinesBild().
//
// Den gestrichelten Rahmen der Quelle nimmt der Generator aus jedem Bild, siehe ohneRahmen().
import { load as yamlLoad } from 'js-yaml'
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { bildSvg, bildVorgabe, type BildPosition } from '../src/lib/parcoursbild.ts'

// Der Kern (Abblenden, Ziffern, Rahmen) liegt in src/lib/parcoursbild.ts, damit der Browser
// dieselben Bilder erzeugen kann. Hier bleibt das Schreiben von SVG und PNG.
export {
  AUSBLENDEN_OPACITY,
  DIM_OPACITY,
  DIM_UNIVERSE,
  OPTIONALE_IDS,
  RAHMEN_ID,
  ZIFFERN_IDS,
  applyDimming,
  deriveDimSet,
  kleinesBild,
  ohneRahmen,
} from '../src/lib/parcoursbild.ts'

/** Rasterungs-Faktor der PNGs (2 = doppelte Auflösung für scharfen Druck). */
export const PNG_ZOOM = 2

// ---- CLI --------------------------------------------------------------------
// (Der obige Kern ist rein und wird von generate-parcours.test.ts geprüft.)

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) run()

function run(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const parcoursRoot = resolve(root, 'public/parcours')
  const yamlText = readFileSync(resolve(root, 'public/config/positionen.yaml'), 'utf8')
  const config = yamlLoad(yamlText) as { positionen?: BildPosition[] }
  const positionen = config.positionen ?? []

  // Nach Ziel-Ordner bündeln: mehrere Positionen (z. B. Alcatraz + Frontal)
  // teilen sich dasselbe Bild. Ihre abgeleiteten Dimm-Mengen müssen übereinstimmen.
  const jobs = new Map<string, { source: string; dim: string[]; aus: string[]; from: string }>()
  for (const pos of positionen) {
    if (!pos?.bildGenerator || pos.bildImBrowser) continue
    if (!pos.bild) {
      console.warn(`  ⚠ Position "${pos.id}" hat bildGenerator, aber kein "bild" - übersprungen.`)
      continue
    }
    const { quelle: source, dim, aus } = bildVorgabe(pos)
    const prev = jobs.get(pos.bild)
    if (prev && (prev.source !== source || prev.dim.join(',') !== dim.join(',') || prev.aus.join(',') !== aus.join(','))) {
      console.warn(
        `  ⚠ Zielbild "${pos.bild}" wird von "${prev.from}" und "${pos.id}" mit unterschiedlichen ` +
          `Vorgaben belegt (${prev.dim.join('/')} vs. ${dim.join('/')}). Es gilt "${prev.from}".`,
      )
      continue
    }
    if (!prev) jobs.set(pos.bild, { source, dim, aus, from: pos.id ?? '?' })
  }

  if (jobs.size === 0) {
    console.log('  Keine Positionen mit bildGenerator: true - nichts zu tun.')
    return
  }

  const force = process.argv.includes('--force')
  let svgCount = 0
  let pngCount = 0
  let unchanged = 0
  for (const [target, { source, dim, aus }] of jobs) {
    const srcDir = resolve(parcoursRoot, source)
    const outDir = resolve(parcoursRoot, target)
    if (!existsSync(srcDir)) {
      console.warn(`  ⚠ Quellordner fehlt: parcours/${source} (Ziel "${target}") - übersprungen.`)
      continue
    }
    mkdirSync(outDir, { recursive: true })
    const svgs = readdirSync(srcDir).filter((f) => f.endsWith('.svg'))
    console.log(`  parcours/${source} → parcours/${target}  (abblenden: ${dim.join(', ') || '—'}${aus.length ? '; ohne Ziffern' : ''})`)
    for (const file of svgs) {
      const { svg, fehlend } = bildSvg(readFileSync(resolve(srcDir, file), 'utf8'), { dim, aus })
      if (fehlend.length > 0) console.warn(`      ⚠ ${file}: IDs nicht gefunden: ${fehlend.join(', ')}`)
      const outSvg = resolve(outDir, file)
      const outPng = resolve(outDir, file.replace(/\.svg$/, '.png'))
      if (!force && existsSync(outPng) && existsSync(outSvg) && readFileSync(outSvg, 'utf8') === svg) {
        unchanged++
        continue
      }
      writeFileSync(outSvg, svg)
      svgCount++
      const png = new Resvg(svg, {
        fitTo: { mode: 'zoom', value: PNG_ZOOM },
        font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' },
      })
        .render()
        .asPng()
      writeFileSync(outPng, png)
      pngCount++
    }
  }
  console.log(
    `\n  ✔ ${jobs.size} Bild-Satz/Sätze, ${svgCount} SVG + ${pngCount} PNG erzeugt, ${unchanged} unverändert.`,
  )
}
