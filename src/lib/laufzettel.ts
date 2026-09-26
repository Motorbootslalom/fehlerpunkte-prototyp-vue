import type { Bogen, ClassId, Lauf, SheetTypeId } from '../types'

// Laufzettel: je Klasse/Lauf ein A4-Querblatt (auf A5 gefaltet) mit einer
// Checkbox je gedruckter Seite - so lässt sich abhaken, ob von jeder Position
// alle Seiten zurück sind. Grundlage ist die Bögen-Liste (genau das, was
// gedruckt wird), sortiert nach der Positions-Reihenfolge des Aufbaus.

export interface LaufzettelZeile {
  /** Eindeutig je Laufzettel (Bogen + Seite). */
  key: string
  /** z. B. „Zeit“ oder „Steg (Seite 1 von 2)“. */
  label: string
}

export interface Laufzettel {
  klasse: ClassId
  lauf: Lauf
  zeilen: LaufzettelZeile[]
}

/**
 * Bildet die Laufzettel aus der Bögen-Liste.
 *
 * - Ein Laufzettel je Klasse/Lauf, in der Reihenfolge ihres ersten Auftretens.
 * - Innerhalb nach der Aufbau-Reihenfolge `order`; Positionen außerhalb des
 *   Aufbaus (Schnellauswahl-Zusätze) folgen am Ende. Mehrfache Positionen (z. B.
 *   dreimal Zeit) behalten ihre Reihenfolge aus der Bögen-Liste.
 * - Eine Zeile je Druckseite: bei einer Seite nur der Positionsname, sonst
 *   „Name (Seite n von X)“.
 */
export function buildLaufzettel(
  boegen: Bogen[],
  order: SheetTypeId[],
  titleOf: (typeId: SheetTypeId) => string,
  pagesOf: (bogenId: string) => number,
): Laufzettel[] {
  const rank = (t: SheetTypeId) => {
    const i = order.indexOf(t)
    return i < 0 ? Number.POSITIVE_INFINITY : i
  }
  const groups = new Map<string, { klasse: ClassId; lauf: Lauf; boegen: Bogen[] }>()
  for (const b of boegen) {
    const key = `${b.klasse}:${b.lauf}`
    const g = groups.get(key) ?? { klasse: b.klasse, lauf: b.lauf, boegen: [] }
    g.boegen.push(b)
    groups.set(key, g)
  }
  return [...groups.values()].map(({ klasse, lauf, boegen: gb }) => ({
    klasse,
    lauf,
    zeilen: [...gb]
      .sort((a, b) => rank(a.typeId) - rank(b.typeId))
      .flatMap((b) => {
        const title = titleOf(b.typeId)
        const n = Math.max(1, pagesOf(b.id))
        if (n === 1) return [{ key: b.id, label: title }]
        return Array.from({ length: n }, (_, i) => ({
          key: `${b.id}:${i}`,
          label: `${title} (Seite ${i + 1} von ${n})`,
        }))
      }),
  }))
}
