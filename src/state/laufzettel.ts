import { reactive, ref } from 'vue'

// Laufzettel-Zustand der Vorschau - bewusst NICHT im gespeicherten AppState:
// die Seitenzahlen sind Messwerte, und der Anzeige-Schalter soll nach dem
// Neuladen nicht versehentlich an bleiben.

/**
 * Druckseiten je Bogen (bogen.id → Anzahl). SheetView meldet hier die
 * tatsächlich gebildeten Seiten (bei „Zeilen / Seite“ 0 aus der Messung), damit
 * die Laufzettel genau zu den gedruckten Bögen passen.
 */
export const pageCounts = reactive<Record<string, number>>({})

/** Laufzettel in der Vorschau zeigen. */
export const showLaufzettel = ref(false)
