import type { Bogen, ClassId, SheetTypeId } from '../types'
import { nachAufbau } from './laufzettel'
import type { QrZiel } from './qr'

// Welche Bögen nach einem Scan zu sehen sind. Ein Laufzettel-Code zeigt genau die
// Listen dieses Laufzettels: die Bögen der Klasse und des Laufs aus der
// Bögen-Liste, in der Reihenfolge des Aufbaus. Ein Listen-Code zeigt diese eine
// Liste. Fehlen die Bögen in der Bögen-Liste (z. B. auf einem anderen Gerät
// gedruckt), bildet die App sie nur für die Anzeige aus dem Aufbau. Eingaben
// landen trotzdem richtig, weil sie je Disziplin, Klasse, Lauf und Startnummer
// gespeichert werden, nicht je Bogen.

export interface ScanAuswahl {
  boegen: Bogen[]
  /** Die Bögen stehen nicht in der Bögen-Liste, sie sind nur zur Anzeige gebildet. */
  ausAufbau: boolean
}

/** Feste ID für einen nur angezeigten Bogen (bleibt beim Neuzeichnen gleich). */
function anzeigeBogen(typeId: SheetTypeId, klasse: ClassId, lauf: Bogen['lauf']): Bogen {
  return { id: `scan_${typeId}_${klasse}_${lauf}`, typeId, klasse, lauf }
}

export function scanBoegen(
  ziel: QrZiel,
  boegen: Bogen[],
  order: SheetTypeId[],
  /** Lauf-unabhängige Liste (z. B. Knoten)? */
  laufFrei: (typeId: SheetTypeId) => boolean,
  /** Gilt die Position für diese Klasse? */
  erlaubt: (typeId: SheetTypeId, klasse: ClassId) => boolean,
): ScanAuswahl {
  const { klasse, lauf, typeId } = ziel
  if (typeId) {
    const treffer = boegen.filter(
      (b) => b.typeId === typeId && b.klasse === klasse && (b.lauf === lauf || laufFrei(typeId)),
    )
    return treffer.length > 0
      ? { boegen: treffer, ausAufbau: false }
      : { boegen: [anzeigeBogen(typeId, klasse, lauf)], ausAufbau: true }
  }
  // Laufzettel: dieselbe Auswahl wie beim Bilden der Laufzettel.
  const treffer = boegen.filter((b) => b.klasse === klasse && b.lauf === lauf)
  if (treffer.length > 0) return { boegen: nachAufbau(treffer, order), ausAufbau: false }
  // Lauf-unabhängige Listen legt die Schnellauswahl nur im ersten Lauf an.
  const ausAufbau = order
    .filter((t) => erlaubt(t, klasse) && (lauf === 1 || !laufFrei(t)))
    .map((t) => anzeigeBogen(t, klasse, lauf))
  return { boegen: ausAufbau, ausAufbau: true }
}
