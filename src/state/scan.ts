import { ref } from 'vue'
import { getAufbauten, getPositions, getRegelwerke } from '../config/active'
import { leseCode, type QrZiel } from '../lib/qr'

// Scan-Zustand der Vorschau - wie die Anzeige-Schalter bewusst NICHT im
// gespeicherten AppState: Nach dem Neuladen sind wieder alle Bögen zu sehen.

export interface ScanStand {
  code: string
  ziel: QrZiel
  /** Zählt jeden Scan, damit auch derselbe Code noch einmal zum Blatt springt. */
  nr: number
}

/** Zuletzt erfolgreich gelesener Code; null = alle Bögen zeigen. */
export const scanStand = ref<ScanStand | null>(null)

/** Zuletzt nicht lesbarer Code mit Grund. */
export const scanFehler = ref<{ code: string; fehler: string } | null>(null)

let zaehler = 0

/** Liest einen gescannten oder getippten Code und zeigt dessen Blätter. */
export function verarbeiteScan(text: string): boolean {
  const code = text.trim()
  const lesung = leseCode(code, {
    regelwerke: getRegelwerke().map((r) => r.id),
    aufbauten: getAufbauten().map((a) => a.id),
    positionen: getPositions().map((p) => p.typeId),
  })
  if (!lesung.ok) {
    scanFehler.value = { code, fehler: lesung.fehler }
    return false
  }
  scanFehler.value = null
  scanStand.value = { code: code.toUpperCase(), ziel: lesung.ziel, nr: ++zaehler }
  return true
}

/** Zurück zu allen Bögen. */
export function scanBeenden(): void {
  scanStand.value = null
  scanFehler.value = null
}
