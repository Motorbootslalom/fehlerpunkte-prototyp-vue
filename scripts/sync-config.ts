// Kopiert die Konfigurations-YAMLs von src/config nach public/config.
// Aufruf: `npm run config:sync` (bzw. `node scripts/sync-config.ts`).
//
// src/config/*.yaml ist die EINZIGE Quelle: dort werden Positionen, Fehler und
// Beschreibungen gepflegt. Diese Dateien werden ins JS-Bundle kompiliert
// (Fallback) UND von hier nach public/config kopiert, von wo sie zur Laufzeit
// per fetch geladen werden (Override). public/config ist reine Ausgabe, liegt
// nicht in Git und wird von `dev` und `build` automatisch neu erzeugt.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FILES = ['fehlerpunkte.yaml', 'positionen.yaml']

mkdirSync(resolve(root, 'public/config'), { recursive: true })

for (const name of FILES) {
  const content = readFileSync(resolve(root, 'src/config', name), 'utf8')
  writeFileSync(resolve(root, 'public/config', name), content)
  console.log(`  ✔ src/config/${name} → public/config/${name}`)
}
