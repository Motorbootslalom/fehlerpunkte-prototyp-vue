import qrcode from 'qrcode-generator'
import type { Bogen } from '../types'

// QR-Codes ermöglichen die spätere automatische Erfassung der eingescannten
// Bögen. Der Code identifiziert eindeutig Listentyp, Klasse und Lauf (die
// "Position" eines Bogens im Wettkampf) sowie die Veranstaltung.

/** Kompakte, scannerfreundliche Nutzlast eines Bogens. */
export function bogenPayload(eventName: string, b: Bogen): string {
  const e = slug(eventName)
  return `FP1;e=${e};t=${b.typeId};k=${b.klasse};l=${b.lauf}`
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[c] ?? c)
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** QR-Modulmatrix (true = dunkles Modul) - z. B. zum Zeichnen auf ein Canvas. */
export function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const count = qr.getModuleCount()
  const out: boolean[][] = []
  for (let r = 0; r < count; r++) {
    const row: boolean[] = []
    for (let c = 0; c < count; c++) row.push(qr.isDark(r, c))
    out.push(row)
  }
  return out
}

/** Erzeugt einen scharfen SVG-QR-Code als data:-URI (für <img> und Druck). */
export function qrSvgDataUri(text: string): string {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const count = qr.getModuleCount()
  const parts: string[] = []
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) parts.push(`M${c} ${r}h1v1h-1z`)
    }
  }
  const margin = 2
  const size = count + margin * 2
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<path transform="translate(${margin} ${margin})" d="${parts.join('')}" fill="#000"/>` +
    `</svg>`
  return 'data:image/svg+xml;base64,' + btoa(svg)
}
