// Erzeugt public/config aus src/config.
// Aufruf: `npm run config:sync` (bzw. `node scripts/sync-config.ts`).
//
// src/config/ ist die EINZIGE Quelle: dort werden Regelwerke, Positionen und
// Beschreibungen gepflegt. Die Regelwerke werden kopiert, die Positions-Dateien zu
// EINER Datei zusammengeführt (public/config/positionen.yaml). Von dort lädt die App
// sie zur Laufzeit per fetch (Override), gebündelt sind sie zusätzlich als Fallback.
// public/config ist reine Ausgabe, liegt nicht in Git und wird von `dev` und `build`
// automatisch neu erzeugt.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { dump as yamlDump, load as yamlLoad } from 'js-yaml'
import { mergePositionen, quellDateien } from '../src/config/merge-positionen.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const quelle = (name: string) => readFileSync(resolve(root, 'src/config', name), 'utf8')
const KOPIEN = [
  'regelwerke.yaml',
  ...readdirSync(resolve(root, 'src/config/regelwerke'))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => `regelwerke/${f}`),
]
const ERZEUGT = 'positionen.yaml'
const FILES = [...KOPIEN, ERZEUGT]

mkdirSync(resolve(root, 'public/config/regelwerke'), { recursive: true })

for (const name of KOPIEN) {
  cpSync(resolve(root, 'src/config', name), resolve(root, 'public/config', name))
  console.log(`  ✔ src/config/${name} → public/config/${name}`)
}

const dateien = quellDateien(quelle('aufbauten.yaml'))
// Positionen in Kurzform bleiben, wie sie sind: Die App und der Bildgenerator schreiben sie selbst
// aus (aufloesen), und der Assistent braucht sie als Vorlage.
const positionen = mergePositionen(dateien.map((name) => yamlLoad(quelle(`${name}.yaml`))))
writeFileSync(
  resolve(root, 'public/config', ERZEUGT),
  '# Generiert von scripts/sync-config.ts aus src/config - nicht von Hand ändern.\n' +
    yamlDump(positionen, { lineWidth: -1, noRefs: true }),
)
console.log(`  ✔ ${dateien.length} Dateien aus src/config → public/config/${ERZEUGT}`)

// Nur Überbleibsel entfernen (gelöschte oder umbenannte Dateien). Den Ordner nicht
// neu aufbauen: Ein laufender Dev-Server würde die Dateien sonst aus den Augen
// verlieren und stattdessen seine index.html ausliefern.
for (const name of readdirSync(resolve(root, 'public/config'), { recursive: true, encoding: 'utf8' })) {
  if (name.endsWith('.yaml') && !FILES.includes(name.replaceAll('\\', '/'))) {
    rmSync(resolve(root, 'public/config', name))
    console.log(`  ✖ public/config/${name} entfernt`)
  }
}
