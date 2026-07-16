import type { Bogen, SheetTypeId } from '../types'

/**
 * Beschreibung aus der Bogen-Auswahl: Position (Listentyp) / Klasse / Lauf -
 * aber nur die Teile, die über alle Bögen eindeutig sind.
 */
export function describeBoegen(boegen: Bogen[], titleOf: (t: SheetTypeId) => string): string {
  if (boegen.length === 0) return ''
  const parts: string[] = []
  const types = [...new Set(boegen.map((b) => b.typeId))]
  const classes = [...new Set(boegen.map((b) => b.klasse))]
  const laeufe = [...new Set(boegen.map((b) => b.lauf))]
  if (types.length === 1) parts.push(titleOf(types[0]))
  if (classes.length === 1) parts.push(`Klasse ${classes[0]}`)
  if (laeufe.length === 1) parts.push(`${laeufe[0]}. Lauf`)
  return parts.join(' - ')
}

// Browser-Druck mit vorgeschlagenem Dateinamen.
//
// Trick: Chrome/Edge/Firefox verwenden im "Als PDF speichern"-Dialog den
// document.title als Vorschlags-Dateinamen. Wir setzen ihn kurz vor dem Druck
// und stellen ihn danach wieder her (afterprint).

export function printWithFilename(filename: string): void {
  const original = document.title
  const restore = () => {
    document.title = original
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  document.title = sanitizeFilename(filename)
  window.print()
}

/** Dateisystem-freundlicher Name (ohne Endung - die ergänzt der Browser). */
export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[/\\:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Fehlerpunkte'
  )
}

/** Zeitstempel im Stil der alten Dokumente: "2026-06-26_21.33.56Uhr". */
export function timestampSuffix(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  const time = `${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`
  return `${date}_${time}Uhr`
}

/**
 * Baut den Export-Basisnamen zusammen:
 *   Fehlerpunkte - <Event> - <Beschreibung> - <Zeitstempel>
 * Die Beschreibung (z. B. "Klasse 3", "Zeit") kommt aus dem Aufrufer, der
 * Zeitstempel nur, wenn ein Datum übergeben wird.
 */
export function exportBaseName(eventName: string, descriptor: string, date?: Date): string {
  const parts = ['Fehlerpunkte']
  const ev = eventName.trim()
  if (ev) parts.push(ev)
  if (descriptor) parts.push(descriptor)
  if (date) parts.push(timestampSuffix(date))
  return sanitizeFilename(parts.join(' - '))
}
