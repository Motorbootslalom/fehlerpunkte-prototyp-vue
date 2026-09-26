import type { SheetDef } from '../types'

// „Anne-Feature“: Die Beschreibung eines Bogens (Legende + Parcoursbild) steht
// auf einer eigenen Rückseite je Blatt. Gedruckt wird doppelseitig (Standard:
// Wenden an der langen Kante); am Klemmbrett klappt man das Blatt nach oben
// und liest die Rückseite - dabei ist nur die untere Blatthälfte (in
// Leserichtung also die obere) sichtbar.

/** Hat der Bogen überhaupt eine Beschreibung (sonst bleibt die Rückseite leer)? */
export function hasDescription(def: SheetDef): boolean {
  return !!(
    def.errorGroups?.length ||
    def.errorTable?.length ||
    def.legendNote ||
    def.disqTable?.length ||
    def.courseImageDir
  )
}

/**
 * Muss die Rückseite um 180° gedreht werden, damit sie beim Nach-oben-Klappen richtig
 * herum steht? Hochformat: ja - Wenden an der langen Kante legt die Rückseite
 * für seitliches Umblättern aus. Querformat: nein - das Blatt liegt quer im
 * Drucker, die lange Papierkante ist dort die Ober-/Unterkante des Bogens, die
 * Rückseite steht beim Nach-oben-Klappen also schon richtig.
 */
export function backNeedsFlip(orientation: SheetDef['orientation']): boolean {
  return orientation === 'portrait'
}
