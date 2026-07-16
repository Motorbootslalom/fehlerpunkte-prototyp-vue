import type { Column, ErrorDef, SheetDef } from '../types'

// Berechnet die Zeilen-Ergebnisse eines Bogens aus den Zellwerten.
//
// Regeln:
//   • 'buoy'-Zelle: enthält sie eine Zahl → das ist die Punktzahl direkt
//                   (der WKR trägt 5, 10, 15 … ein, nicht die Anzahl).
//                   enthält sie einen Buchstaben A-X → Disqualifikation an
//                   genau dieser Stelle (zählt nicht als Punkte).
//   • 'code'-Zelle: kommagetrennte Fehlercodes → Punkte laut errorTable.
//                   Die Summe wird (read-only) in der zugehörigen pointsCol
//                   angezeigt.
//   • 'points'-Zelle: direkte Punkteingabe.
//   • 'disq'-Zelle: Disqualifikations-Buchstabe für die ganze Zeile.
//
// Σ (sumColumnKey) = Summe aller Bojen-, Code- und Punkte-Beiträge der Zeile.

export interface DisqHit {
  /** Spalten-/Bereichsbezeichnung, an der die Disqualifikation notiert wurde. */
  where: string
  code: string
}

export interface RowScore {
  /** Gesamt-Fehlerpunkte der Zeile. */
  sum: number
  /** Berechnete Punkte je 'sum'-Spalte (Schlüssel → Punkte). */
  computedCols: Record<string, number>
  /** Disqualifikations-Treffer (aus Disq-Spalte und Bojen-Zellen). */
  disqs: DisqHit[]
}

/** Zellschlüssel für Wert-Map: "nr:colKey" bzw. "nr:colKey#subIndex". */
export function cellKey(nr: string, colKey: string, subIndex?: number): string {
  return subIndex === undefined ? `${nr}:${colKey}` : `${nr}:${colKey}#${subIndex}`
}

/**
 * Spalten, die für eine Klasse sichtbar sind. Spalten ohne `klassen` gelten für
 * alle; sonst nur, wenn die Klasse enthalten ist (z. B. Speed/MüB je Klasse).
 * Ein Blatt gilt genau einer Klasse, daher kann so pro Blatt gefiltert werden.
 */
export function columnsForClass(columns: Column[], klasse: string): Column[] {
  return columns.filter((c) => !c.klassen || c.klassen.length === 0 || c.klassen.includes(klasse))
}

/** Alle Zellschlüssel, die eine Spalte in einer Zeile erzeugt. */
export function columnCellKeys(nr: string, col: Column): string[] {
  if (col.sub && col.sub.length > 0) {
    return col.sub.map((_, i) => cellKey(nr, col.key, i))
  }
  return [cellKey(nr, col.key)]
}

const LETTER = /^[A-Za-z]$/

function errorPoints(table: ErrorDef[] | undefined, raw: string): number {
  if (!table) return 0
  let total = 0
  for (const token of raw.split(/[\s,;/]+/)) {
    const t = token.trim()
    if (t === '') continue
    const found = table.find((e) => e.code === t)
    if (found) total += found.punkte
  }
  return total
}

export function scoreRow(
  def: SheetDef,
  nr: string,
  get: (key: string) => string,
): RowScore {
  let sum = 0
  const computedCols: Record<string, number> = {}
  const disqs: DisqHit[] = []

  for (const col of def.columns) {
    if (col.kind === 'buoy') {
      const keys = columnCellKeys(nr, col)
      col.sub && col.sub.length > 0
        ? col.sub.forEach((subLabel, i) => {
            handleBuoy(get(keys[i]), `${col.label} ${subLabel}`)
          })
        : handleBuoy(get(keys[0]), col.label)
    } else if (col.kind === 'code') {
      // Eigener Spalten-Katalog (Steg AB/AN) hat Vorrang vor dem positionsweiten.
      const raw = get(cellKey(nr, col.key))
      const pts = errorPoints(col.errorTable ?? def.errorTable, raw)
      sum += pts
      if (col.pointsCol) computedCols[col.pointsCol] = (computedCols[col.pointsCol] ?? 0) + pts
      // Ein Disq-Buchstabe in einer Fehler-Spalte markiert die Disqualifikation
      // an dieser Stelle (wie in den Bojen-Zellen).
      for (const token of raw.split(/[\s,;/]+/)) {
        const c = token.trim().toUpperCase()
        if (LETTER.test(c)) disqs.push({ where: col.label, code: c })
      }
    } else if (col.kind === 'points') {
      const v = parseInt(get(cellKey(nr, col.key)), 10)
      if (!Number.isNaN(v)) sum += v
    } else if (col.kind === 'disq') {
      const raw = get(cellKey(nr, col.key)).trim()
      if (raw !== '') {
        for (const token of raw.split(/[\s,;]+/)) {
          const c = token.trim().toUpperCase()
          if (c !== '') disqs.push({ where: col.label, code: c })
        }
      }
    }
  }

  function handleBuoy(raw: string, where: string) {
    const v = raw.trim()
    if (v === '') return
    if (LETTER.test(v)) {
      disqs.push({ where, code: v.toUpperCase() })
      return
    }
    // Direkte Punkteingabe (5, 10, 15 …) - nicht die Anzahl der Berührungen.
    const n = parseInt(v, 10)
    if (!Number.isNaN(n)) sum += n
  }

  return { sum, computedCols, disqs }
}

/** Kurztext der Disqualifikationen einer Zeile, z. B. "G @ Tor 3 H K". */
export function formatDisqs(disqs: DisqHit[]): string {
  return disqs.map((d) => `${d.code} @ ${d.where}`).join(', ')
}
