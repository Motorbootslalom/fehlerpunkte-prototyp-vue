import { CLASS_IDS, type ClassId, type Lauf, type SheetTypeId } from '../types'

// Schnellauswahl der Bögen: welche Bögen ein Klick hinzufügt und in welcher
// Reihenfolge. Die Klassen laufen in einer frei wählbaren Reihenfolge (z. B.
// „1, 3, E, 2, 5, 7, 4, 6"); bei „Alle Läufe" kommt erst Lauf 1 komplett, dann
// Lauf 2 in derselben Reihenfolge usw.

export const LAEUFE: Lauf[] = [1, 2, 3]

/** Lauf für die Schnellauswahl: ein bestimmter Lauf oder alle nacheinander. */
export type QuickLauf = Lauf | 'alle'

export interface BogenWahl {
  typeId: SheetTypeId
  klasse: ClassId
  lauf: Lauf
}

function isClassId(s: string): s is ClassId {
  return (CLASS_IDS as string[]).includes(s)
}

/**
 * Bereinigt eine Klassen-Reihenfolge: Unbekanntes und Doppeltes fällt weg,
 * nicht genannte Klassen folgen in Standard-Reihenfolge. Das Ergebnis enthält
 * also immer alle Klassen genau einmal.
 */
export function normalizeClassOrder(raw: unknown): ClassId[] {
  const out: ClassId[] = []
  if (Array.isArray(raw)) {
    for (const c of raw) if (typeof c === 'string' && isClassId(c) && !out.includes(c)) out.push(c)
  }
  return [...out, ...CLASS_IDS.filter((c) => !out.includes(c))]
}

/**
 * Klassen-Reihenfolge aus freiem Text, z. B. „1, 3, E, 2, 5, 7, 4, 6" oder
 * kompakt „13E25746". Ein Wort zählt nur, wenn es ausschließlich aus
 * Klassen-Kennungen besteht („Klasse" wird also nicht als „E" gelesen).
 */
export function parseClassOrder(text: string): ClassId[] {
  const out: ClassId[] = []
  for (const token of text.toUpperCase().split(/[^0-9A-Z]+/)) {
    const chars = [...token]
    if (chars.length === 0 || !chars.every(isClassId)) continue
    for (const c of chars as ClassId[]) if (!out.includes(c)) out.push(c)
  }
  return normalizeClassOrder(out)
}

/** Anzeige-Form, z. B. „1, 3, E, 2, 5, 7, 4, 6". */
export function formatClassOrder(order: ClassId[]): string {
  return order.join(', ')
}

export function laeufeOf(q: QuickLauf): Lauf[] {
  return q === 'alle' ? LAEUFE : [q]
}

/** „2. Lauf" bzw. „alle Läufe". */
export function laufLabel(q: QuickLauf): string {
  return q === 'alle' ? 'alle Läufe' : `${q}. Lauf`
}

/** Eine Position für alle Klassen: je Lauf die Klassen in der gewählten Reihenfolge. */
export function positionAllClassesItems(
  typeId: SheetTypeId,
  classOrder: ClassId[],
  q: QuickLauf,
): BogenWahl[] {
  return laeufeOf(q).flatMap((lauf) => classOrder.map((klasse) => ({ typeId, klasse, lauf })))
}

/** Eine Klasse für alle Positionen des Aufbaus: je Lauf alle Positionen. */
export function classAllPositionsItems(
  klasse: ClassId,
  positions: SheetTypeId[],
  q: QuickLauf,
): BogenWahl[] {
  return laeufeOf(q).flatMap((lauf) => positions.map((typeId) => ({ typeId, klasse, lauf })))
}

/**
 * Lauf-unabhängige Positionen (`lauf: false`, z. B. Knoten) gibt es je Klasse
 * nur einmal: Wiederholungen aus „Alle Läufe" und schon vorhandene Bögen
 * derselben Position/Klasse fallen weg. Übrig bleibt der erste Lauf.
 */
export function withoutLaufRepeats(
  items: BogenWahl[],
  laufFree: (typeId: SheetTypeId) => boolean,
  existing: { typeId: SheetTypeId; klasse: ClassId }[] = [],
): BogenWahl[] {
  const key = (b: { typeId: SheetTypeId; klasse: ClassId }) => `${b.typeId}:${b.klasse}`
  const seen = new Set(existing.filter((b) => laufFree(b.typeId)).map(key))
  return items.filter((it) => {
    if (!laufFree(it.typeId)) return true
    if (seen.has(key(it))) return false
    seen.add(key(it))
    return true
  })
}

/**
 * Beschriftung der Positions-Knöpfe: der Kurzname (titel) - außer mehrere
 * Positionen teilen ihn (z. B. „Tor 1 / 3 / 5“ mit und ohne Start/Ziel), dann
 * der ausführliche Menü-Name, damit die Knöpfe unterscheidbar bleiben.
 */
export function positionButtonLabels(
  defs: { typeId: SheetTypeId; title: string; menuLabel: string }[],
): Record<SheetTypeId, string> {
  const count = new Map<string, number>()
  for (const d of defs) count.set(d.title, (count.get(d.title) ?? 0) + 1)
  return Object.fromEntries(
    defs.map((d) => [d.typeId, (count.get(d.title) ?? 0) > 1 ? d.menuLabel : d.title]),
  )
}

/** Kompletter Lauf: alle Klassen (gewählte Reihenfolge) × alle Positionen. */
export function completeLaufItems(
  positions: SheetTypeId[],
  classOrder: ClassId[],
  lauf: Lauf,
): BogenWahl[] {
  return classOrder.flatMap((klasse) => positions.map((typeId) => ({ typeId, klasse, lauf })))
}
