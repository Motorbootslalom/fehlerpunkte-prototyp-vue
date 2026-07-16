// CLI-Prüfung der YAML-Konfiguration. Aufruf: `npm run config:check`
// (bzw. `node scripts/check-config.ts`). Prüft die Quelldateien unter
// src/config auf:
//   • Syntax / doppelte Mapping-Keys (Parser)
//   • doppelte Definitionen & Verweise ins Leere (semantischer Validator)
//   • einfache Format-Hygiene (Tabs, Leerzeichen am Zeilenende, Schluss-Newline)
// public/config wird aus src/config generiert (npm run config:sync) und liegt
// nicht in Git - daher hier nicht geprüft.
// Exit-Code 1, sobald ein Fehler (nicht: Warnung) auftritt - für CI/Hooks.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { validateConfigTexts, type ConfigIssue } from '../src/config/validate.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const c = (code: string, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s)
const red = (s: string) => c('31', s)
const yellow = (s: string) => c('33', s)
const green = (s: string) => c('32', s)
const dim = (s: string) => c('2', s)
const bold = (s: string) => c('1', s)

function read(rel: string): string | null {
  try {
    return readFileSync(resolve(root, rel), 'utf8')
  } catch {
    return null
  }
}

/** Nicht-destruktive Format-Hygiene (nur Hinweise, keine Umformatierung). */
function formatIssues(text: string, file: string): ConfigIssue[] {
  const out: ConfigIssue[] = []
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    if (line.includes('\t'))
      out.push({ severity: 'warning', code: 'FMT_TAB', message: 'Tabulator statt Leerzeichen.', where: `${file}:${i + 1}` })
    if (/[ \t]+$/.test(line))
      out.push({ severity: 'warning', code: 'FMT_TRAILING_WS', message: 'Leerzeichen am Zeilenende.', where: `${file}:${i + 1}` })
    if (line.endsWith('\r'))
      out.push({ severity: 'warning', code: 'FMT_CRLF', message: 'CRLF-Zeilenende (LF erwartet).', where: `${file}:${i + 1}` })
  })
  if (text.length > 0 && !text.endsWith('\n'))
    out.push({ severity: 'warning', code: 'FMT_EOF_NEWLINE', message: 'Kein Zeilenumbruch am Dateiende.', where: file })
  return out
}

interface Pair {
  label: string
  fehler: string
  positionen: string
}

const PAIRS: Pair[] = [
  { label: 'src/config (Quelle)', fehler: 'src/config/fehlerpunkte.yaml', positionen: 'src/config/positionen.yaml' },
]

function printIssues(issues: ConfigIssue[]): void {
  for (const it of issues) {
    const tag = it.severity === 'error' ? red('FEHLER ') : yellow('Hinweis')
    console.log(`  ${tag} ${dim(`[${it.code}]`)} ${it.where}\n          ${it.message}`)
  }
}

let errorCount = 0
let warnCount = 0

console.log(bold('\n▶ Konfigurations-Check\n'))

for (const pair of PAIRS) {
  const fehler = read(pair.fehler)
  const positionen = read(pair.positionen)
  console.log(bold(pair.label))
  if (fehler === null || positionen === null) {
    console.log(`  ${dim('übersprungen - Datei fehlt')}\n`)
    continue
  }
  const issues = [
    ...validateConfigTexts(fehler, positionen),
    ...formatIssues(fehler, pair.fehler),
    ...formatIssues(positionen, pair.positionen),
  ]
  const errs = issues.filter((i) => i.severity === 'error')
  const warns = issues.filter((i) => i.severity === 'warning')
  errorCount += errs.length
  warnCount += warns.length
  if (issues.length === 0) console.log(`  ${green('✔ keine Befunde')}`)
  else printIssues([...errs, ...warns])
  console.log()
}

// ---- Zusammenfassung --------------------------------------------------------
const summary = `${errorCount} Fehler, ${warnCount} Hinweis(e)`
if (errorCount > 0) {
  console.log(red(bold(`✖ ${summary}`)))
  process.exit(1)
}
console.log(green(bold(`✔ ${summary}`)))
