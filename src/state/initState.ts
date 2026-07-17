import { CLASS_IDS, type AppState, type Bogen, type ClassId } from '../types'
import {
  applyBeschriftung,
  defaultAufbauId,
  defaultBeschriftungId,
  getAufbau,
  positionAllowsClass,
} from '../config/active'
import { allDemoNumbers } from '../lib/demo'
import { readShareConfig, type ShareConfig } from '../lib/sharelink'
import { loadState } from '../lib/storage'

// Framework-agnostischer Anfangszustand. Wird sowohl vom Vue-Store (Eingabe-App)
// als auch von der React-Insel (pdf.html, nur lesend) genutzt, damit beide exakt
// denselben Stand aus localStorage/URL rekonstruieren.

export function uid(prefix: string): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 9)
}

/** Standard-Zusammenstellung: je ein Bogen pro Position des Aufbaus (Lauf 1). */
export function defaultBoegen(aufbau: string): Bogen[] {
  return getAufbau(aufbau).order.map((t) => {
    // Klasse 3, außer die Position gilt nicht dafür (z. B. MüB ab Kl. 4) →
    // dann die erste gültige Klasse.
    const klasse: ClassId = positionAllowsClass(t, '3')
      ? '3'
      : (CLASS_IDS.find((c) => positionAllowsClass(t, c)) ?? '3')
    return { id: uid('bg'), typeId: t, klasse, lauf: 1 }
  })
}

// Lazy erzeugt (nicht als Modul-Konstante), damit die geladene Konfiguration
// berücksichtigt wird.
export function defaultState(): AppState {
  const aufbau = defaultAufbauId()
  return {
    eventName: '30. Möwepokal 2026',
    aufbau,
    beschriftung: defaultBeschriftungId(),
    emptyRows: 3,
    rowsPerPage: 0,
    numbers: allDemoNumbers(),
    wkr: {},
    boegen: defaultBoegen(aufbau),
    values: {},
    initialized: false,
  }
}

/** Gleiche Bogen-Folge (Typ/Klasse/Lauf) - dann bleiben die lokalen IDs erhalten. */
function sameBoegenShape(a: Bogen[], b: ShareConfig['boegen']): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (x, i) => x.typeId === b[i].typeId && x.klasse === b[i].klasse && x.lauf === b[i].lauf,
  )
}

/** Anfangszustand aus persistiertem Stand (localStorage) + geteiltem Link (URL). */
export function buildInitialState(): AppState {
  const loaded = loadState()
  let state = loaded ? { ...defaultState(), ...loaded } : defaultState()

  // Geteilte Konfiguration aus der URL hat Vorrang vor dem lokalen Stand: Aufbau,
  // Bezeichnung, Veranstaltung, Leerzeilen, Zeilen/Seite und die Bogen-Auswahl.
  const shared = readShareConfig()
  if (shared) {
    state = {
      ...state,
      eventName: shared.eventName || state.eventName,
      aufbau: shared.aufbau || state.aufbau,
      beschriftung: shared.beschriftung || state.beschriftung,
      emptyRows: shared.emptyRows,
      rowsPerPage: shared.rowsPerPage,
      // Startnummern aus dem Link je Klasse übernehmen (fehlende Klassen bleiben
      // lokal/Demo).
      numbers: { ...state.numbers, ...shared.numbers },
    }
    // Bögen nur ersetzen, wenn die Auswahl wirklich abweicht - so bleiben beim
    // normalen Neuladen (Auto-Sync-URL = eigener Stand) die lokalen IDs samt
    // eingetragener Werte erhalten.
    if (shared.boegen.length > 0 && !sameBoegenShape(state.boegen, shared.boegen)) {
      state = { ...state, boegen: shared.boegen.map((b) => ({ id: uid('bg'), ...b })) }
    }
  }

  // Persistiertes/geteiltes Bezeichnungs-Schema auf die geladene Konfiguration
  // anwenden, damit die Bojen-Kürzel zum Zustand passen.
  if (state.beschriftung) applyBeschriftung(state.beschriftung)
  return state
}
