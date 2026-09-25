// Aufteilung der Startnummern eines Bogens auf Druckseiten - gemeinsam für
// Bildschirm/Browser-Druck (SheetView), das Sheet-Modell (pdfmake/jsPDF) und
// die react-pdf-Insel, damit alle Wege dieselben Seiten bilden.

/** CSS-Pixel je Millimeter (CSS rechnet fest mit 96 dpi). */
export const PX_PER_MM = 96 / 25.4

/** Druckrand (@page margin) - die Bildschirm-Ansicht nutzt denselben Innenrand. */
export const PRINT_MARGIN_MM = 8

/** Blatthöhe in mm: A4 hoch 297, quer 210. */
export function pageHeightMm(orientation: 'portrait' | 'landscape'): number {
  return orientation === 'landscape' ? 210 : 297
}

/** Nutzbare Höhe einer Druckseite in px (Blatthöhe minus Rand oben und unten). */
export function printableHeightPx(heightMm: number): number {
  return (heightMm - 2 * PRINT_MARGIN_MM) * PX_PER_MM
}

/**
 * Wie viele Zeilen zu viel stehen auf einer Seite, damit sie noch auf ein
 * A4-Blatt passt? `contentPx` = Höhe des Bogen-Inhalts (Tabelle) am
 * Bildschirm, der dieselben Maße wie die Druckseite hat. 0 = passt
 * (1 px Toleranz für Rundung).
 */
export function overflowRows(contentPx: number, heightMm: number, rowPx: number): number {
  const overflow = contentPx - printableHeightPx(heightMm)
  if (overflow <= 1) return 0
  return rowPx > 0 ? Math.ceil(overflow / rowPx) : 1
}

/**
 * Wie viele Tabellenzeilen (Starter + Leerzeilen) passen auf eine Druckseite?
 * `fixedPx` = alles außer den Zeilen: Kopf, Spaltenköpfe, Legende/Bild,
 * Unterschrift. Gleiche 1-px-Toleranz wie {@link overflowRows}.
 */
export function rowsThatFit(fixedPx: number, rowPx: number, heightMm: number): number {
  if (rowPx <= 0) return 0
  return Math.max(0, Math.floor((printableHeightPx(heightMm) - fixedPx + 1) / rowPx))
}

/**
 * Automatische Seitengröße: Passen alle `n` Starter auf eine Seite (höchstens
 * `capacity`), bleibt es eine. Sonst so wenige Seiten wie möglich, gleichmäßig
 * geteilt und auf 5er-Schritte aufgerundet (Mitte, Drittel, …): 24 Starter bei
 * höchstens 20 pro Seite → 15 + 9, 58 → 20 + 20 + 18.
 * `capacity` 0 = unbekannt → eine Seite.
 */
export function autoPageSize(n: number, capacity: number): number {
  if (capacity <= 0 || n <= capacity) return n
  if (capacity < 5) return capacity
  for (let pages = 2; ; pages++) {
    const size = Math.ceil(n / pages / 5) * 5
    if (size <= capacity) return size
  }
}

function sliceBy<T>(items: T[], size: number): T[][] {
  if (size <= 0 || items.length <= size) return [items]
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Startnummern in Seiten-Blöcke aufteilen.
 *
 * - `rowsPerPage` 0 = automatisch: mit gemessener `autoCapacity` (Starter je
 *   Seite) nach {@link autoPageSize}; ohne Messung (react-pdf-Insel,
 *   pdfmake/jsPDF) eine durchlaufende Seite.
 * - `rowsPerPage` > 0 = fest nach so vielen Startern; mit `splitFrom` > 0 nur
 *   Klassen mit **mindestens** so vielen Startern (z. B. ab 25 je 15 pro Seite,
 *   16-24 bleiben zusammen). Ergäbe das eine Seite, die laut Messung nicht aufs
 *   Blatt passt, gilt die automatische Aufteilung - Beschreibung und
 *   Unterschrift sollen nie auf eine eigene Seite rutschen.
 *
 * Liefert immer mindestens einen (ggf. leeren) Block.
 */
export function pageChunks<T>(items: T[], rowsPerPage: number, splitFrom = 0, autoCapacity = 0): T[][] {
  const auto = () => sliceBy(items, autoPageSize(items.length, autoCapacity))
  if (rowsPerPage <= 0) return auto()
  const split = items.length > rowsPerPage && items.length >= splitFrom
  const fixed = split ? sliceBy(items, rowsPerPage) : [items]
  return autoCapacity > 0 && fixed.some((c) => c.length > autoCapacity) ? auto() : fixed
}
