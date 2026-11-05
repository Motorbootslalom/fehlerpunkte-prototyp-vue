// Kopiert die Konfigurations-YAMLs von src/config nach public/config.
// Aufruf: `npm run config:sync` (bzw. `node scripts/sync-config.ts`).
//
// src/config/ ist die EINZIGE Quelle: dort werden Regelwerke, Positionen und
// Beschreibungen gepflegt. Diese Dateien werden ins JS-Bundle kompiliert
// (Fallback) UND von hier nach public/config kopiert, von wo sie zur Laufzeit
// per fetch geladen werden (Override). public/config ist reine Ausgabe, liegt
// nicht in Git und wird von `dev` und `build` automatisch neu erzeugt.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FILES = [
  'regelwerke.yaml',
  'positionen.yaml',
  ...readdirSync(resolve(root, 'src/config/regelwerke'))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => `regelwerke/${f}`),
]

mkdirSync(resolve(root, 'public/config/regelwerke'), { recursive: true })

for (const name of FILES) {
  cpSync(resolve(root, 'src/config', name), resolve(root, 'public/config', name))
  console.log(`  ✔ src/config/${name} → public/config/${name}`)
}

// Nur Überbleibsel entfernen (gelöschte oder umbenannte Dateien). Den Ordner nicht
// neu aufbauen: Ein laufender Dev-Server würde die Dateien sonst aus den Augen
// verlieren und stattdessen seine index.html ausliefern.
for (const name of readdirSync(resolve(root, 'public/config'), { recursive: true, encoding: 'utf8' })) {
  if (name.endsWith('.yaml') && !FILES.includes(name.replaceAll('\\', '/'))) {
    rmSync(resolve(root, 'public/config', name))
    console.log(`  ✖ public/config/${name} entfernt`)
  }
}
