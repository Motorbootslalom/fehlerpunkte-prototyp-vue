import { execSync } from 'node:child_process'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Version = `git describe`: Tag + Commits-seit-Tag + Kurz-Hash, sonst nur der
// Kurz-Hash (ohne Tag), jeweils mit `-dirty` bei uncommitteten Änderungen. Dazu
// der Commit-Zeitstempel. Wird beim Start des Dev-Servers bzw. beim Build
// ermittelt und über `define` in den Code eingesetzt. Fällt zurück, falls kein
// Git verfügbar ist (z. B. Build ohne Repo).
function gitInfo(): { version: string; date: string } {
  try {
    const run = (cmd: string) => execSync(cmd, { encoding: 'utf8' }).trim()
    return {
      version: run('git describe --tags --always --dirty --long'),
      date: run('git log -1 --format=%cI'),
    }
  } catch {
    return { version: 'unbekannt', date: '' }
  }
}
const git = gitInfo()

// Die Konfiguration (public/config/*.yaml) wird zur Laufzeit per fetch geladen -
// Dateien unter public/ liegen NICHT im Modulgraph, also löst Vite dafür kein
// HMR aus. Dieses Plugin beobachtet die YAMLs und erzwingt bei Änderung ein
// vollständiges Neuladen der Seite (wie beim JS-Code).
function reloadOnConfigYaml(): Plugin {
  const isConfigYaml = (file: string) => {
    const f = file.replace(/\\/g, '/')
    return f.includes('/public/config/') && f.endsWith('.yaml')
  }
  return {
    name: 'reload-on-config-yaml',
    configureServer(server) {
      const onChange = (file: string) => {
        if (!isConfigYaml(file)) return
        server.config.logger.info(`\x1b[36m[config]\x1b[0m ${file.split('/').pop()} geändert - Seite wird neu geladen`)
        server.ws.send({ type: 'full-reload', path: '*' })
      }
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
    },
  }
}

// Relative base ('./') sorgt dafür, dass der Build sowohl auf GitHub Pages
// (Projekt-Unterpfad, z. B. /fehlerpunkte-prototyp/) als auch lokal via preview läuft.
//
// Zwei Einstiegspunkte (Multi-Page) zum Vergleich der PDF-Lösungen:
//   index.html → Browser-Druck / Raster (Haupt-Prototyp)
//   pdf.html   → echtes Vektor-PDF via @react-pdf/renderer
export default defineConfig({
  base: './',
  define: {
    __GIT_VERSION__: JSON.stringify(git.version),
    __GIT_COMMIT_DATE__: JSON.stringify(git.date),
  },
  plugins: [react(), reloadOnConfigYaml()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        pdf: 'pdf.html',
      },
    },
  },
})
