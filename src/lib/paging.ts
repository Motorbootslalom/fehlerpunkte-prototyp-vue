// Aufteilung der Startnummern eines Bogens auf Druckseiten - gemeinsam für
// Bildschirm/Browser-Druck (SheetView), das Sheet-Modell (pdfmake/jsPDF) und
// die react-pdf-Insel, damit alle Wege dieselben Seiten bilden.

/**
 * Startnummern in Seiten-Blöcke aufteilen.
 *
 * - `rowsPerPage` 0 = keine feste Aufteilung (eine durchlaufende Seite).
 * - `splitFrom` > 0 = nur Klassen mit **mindestens** so vielen Startern werden
 *   aufgeteilt; kleinere bleiben eine Seite (z. B. ab 25 Startern je 15 pro
 *   Seite, 16-24 Starter bleiben zusammen). 0 = jede Klasse mit mehr Startern
 *   als `rowsPerPage` wird aufgeteilt.
 *
 * Liefert immer mindestens einen (ggf. leeren) Block.
 */
export function pageChunks<T>(items: T[], rowsPerPage: number, splitFrom = 0): T[][] {
  const split = rowsPerPage > 0 && items.length > rowsPerPage && items.length >= splitFrom
  if (!split) return [items]
  const out: T[][] = []
  for (let i = 0; i < items.length; i += rowsPerPage) out.push(items.slice(i, i + rowsPerPage))
  return out
}
