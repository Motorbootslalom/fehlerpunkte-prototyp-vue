import { CLASS_IDS, type AppState, type Bogen, type ClassId } from '../types'
import {
  applyBeschriftung,
  applyRegelwerk,
  applySprache,
  aufbauOrder,
  defaultAufbauId,
  defaultBeschriftungId,
  defaultRegelwerkId,
  getAufbauten,
  getPositions,
  getSheetDef,
  positionAllowsClass,
  pruefeEigeneAufbauten,
  resolveRegelwerkId,
  setzeEigeneAufbauten,
} from '../config/active'
import { ausLinkUebernehmen } from '../config/eigene'
import { isSprache } from '../config/sprache'
import { allDemoNumbers } from '../lib/demo'
import { ausBogenWerten } from '../lib/eingaben'
import { normalizeClassOrder, withoutLaufRepeats } from '../lib/quickpick'
import { normalizeNumbersMap, readShareConfig, type ShareConfig } from '../lib/sharelink'
import { ladeEigeneAufbauten, loadState, speichereEigeneAufbauten } from '../lib/storage'

// Framework-agnostischer Anfangszustand. Wird sowohl vom Vue-Store (Eingabe-App)
// als auch von der React-Insel (pdf.html, nur lesend) genutzt, damit beide exakt
// denselben Stand aus localStorage/URL rekonstruieren.

export function uid(prefix: string): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 9)
}

/** Standard-Zusammenstellung: je ein Bogen pro Position des Aufbaus (Lauf 1). */
export function defaultBoegen(aufbau: string, tor5MitParcours = false): Bogen[] {
  return aufbauOrder(aufbau, tor5MitParcours).map((t) => {
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
    regelwerk: defaultRegelwerkId(),
    sprache: 'de',
    aufbau,
    tor5MitParcours: false,
    streichenAbZwei: false,
    beschriftung: defaultBeschriftungId(),
    emptyRows: 3,
    rowsPerPage: 0,
    splitFrom: 0,
    descriptionOnBack: false,
    numbers: allDemoNumbers(),
    classOrder: [...CLASS_IDS],
    wkr: {},
    boegen: defaultBoegen(aufbau),
    eingaben: {},
    starter: {},
    listenStand: {},
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

/**
 * Bögen nach einem Aufbau-Wechsel: Aus der unveränderten Grundausstattung wird die des
 * neuen Aufbaus, sonst bleiben Klassen und Läufe der Auswahl und die Positionen kommen vom
 * neuen Aufbau.
 */
export function boegenFuerAufbau(state: AppState, aufbau: string): Bogen[] {
  const kombi = state.tor5MitParcours
  const standard = state.boegen.length === 0 || sameBoegenShape(state.boegen, defaultBoegen(state.aufbau, kombi))
  if (standard) return defaultBoegen(aufbau, kombi)
  const laeufe = new Map(state.boegen.map((b) => [`${b.klasse}:${b.lauf}`, b]))
  const neu = [...laeufe.values()].flatMap(({ klasse, lauf }) =>
    aufbauOrder(aufbau, kombi)
      .filter((typeId) => positionAllowsClass(typeId, klasse))
      .map((typeId) => ({ typeId, klasse, lauf })),
  )
  return withoutLaufRepeats(neu, (t) => getSheetDef(t).showLauf === false).map((b) => ({ id: uid('bg'), ...b }))
}

/** Gespeicherter Stand; früher standen die Werte je Bogen unter `values`. */
function ausSpeicher(loaded: Partial<AppState> & { values?: Record<string, Record<string, string>> }): Partial<AppState> {
  const { values, ...stand } = loaded
  if (!values) return stand
  const aufbau = stand.aufbau ?? defaultAufbauId()
  return { ...stand, ...ausBogenWerten(values, stand.wkr ?? {}, stand.boegen ?? [], aufbau) }
}

/**
 * Die eigenen Aufbauten aus dem Browser in die Konfiguration. Bringt ein Link einen mit, hat
 * er Vorrang; ein lokaler mit derselben ID und anderem Inhalt bleibt als Kopie. Was die
 * Prüfung nicht besteht, wird nicht übernommen.
 */
function eigeneAufbautenLaden(shared: ShareConfig | null): void {
  let eigene = ladeEigeneAufbauten()
  setzeEigeneAufbauten(eigene)
  if (!shared?.eigenerAufbau) return
  const pruefung = pruefeEigeneAufbauten({ aufbauten: [shared.eigenerAufbau] })
  if (pruefung.aufbauten.length !== 1) return
  eigene = ausLinkUebernehmen(eigene, pruefung.aufbauten[0])
  speichereEigeneAufbauten(eigene)
  setzeEigeneAufbauten(eigene)
}

/** Ohne Aufbau oder Position, die es nicht (mehr) gibt, etwa nach dem Löschen eines eigenen. */
export function ohneUnbekannte(state: AppState): AppState {
  const positionen = new Set(getPositions().map((p) => p.typeId))
  const aufbau = getAufbauten().some((a) => a.id === state.aufbau) ? state.aufbau : defaultAufbauId()
  const boegen = state.boegen.filter((b) => positionen.has(b.typeId))
  return aufbau === state.aufbau && boegen.length === state.boegen.length ? state : { ...state, aufbau, boegen }
}

/** Anfangszustand aus persistiertem Stand (localStorage) + geteiltem Link (URL). */
export function buildInitialState(): AppState {
  const shared = readShareConfig()
  eigeneAufbautenLaden(shared)
  const loaded = loadState()
  let state = loaded ? { ...defaultState(), ...ausSpeicher(loaded) } : defaultState()
  // Ältere Stände speichern Startnummern als Zahlen → auf Strings normalisieren.
  if (loaded?.numbers) state = { ...state, numbers: normalizeNumbersMap(loaded.numbers) }
  // Fehlt in älteren Ständen bzw. defensiv bereinigen.
  state = { ...state, classOrder: normalizeClassOrder(state.classOrder) }

  // Geteilte Konfiguration aus der URL hat Vorrang vor dem lokalen Stand:
  // Regelwerk, Aufbau, Bezeichnung, Veranstaltung, Leerzeilen, Zeilen/Seite und die Bogen-Auswahl.
  if (shared) {
    state = {
      ...state,
      eventName: shared.eventName || state.eventName,
      regelwerk: shared.regelwerk || state.regelwerk,
      sprache: shared.sprache ?? state.sprache,
      aufbau: shared.aufbau || state.aufbau,
      tor5MitParcours: shared.tor5MitParcours ?? state.tor5MitParcours,
      streichenAbZwei: shared.streichenAbZwei ?? state.streichenAbZwei,
      beschriftung: shared.beschriftung || state.beschriftung,
      // Fehlen Leerzeilen/Seitenaufteilung im Link (z. B. Link aus dem
      // Verzahnungstool), bleiben die lokalen Einstellungen.
      emptyRows: shared.emptyRows ?? state.emptyRows,
      rowsPerPage: shared.rowsPerPage ?? state.rowsPerPage,
      splitFrom: shared.splitFrom ?? state.splitFrom,
      descriptionOnBack: shared.descriptionOnBack ?? state.descriptionOnBack,
      // Startnummern aus dem Link je Klasse übernehmen (fehlende Klassen bleiben
      // lokal/Demo).
      numbers: { ...state.numbers, ...shared.numbers },
      classOrder: shared.classOrder ?? state.classOrder,
    }
    // Bögen nur ersetzen, wenn die Auswahl wirklich abweicht - so bleiben beim
    // normalen Neuladen (Auto-Sync-URL = eigener Stand) die lokalen IDs erhalten.
    if (shared.boegen.length > 0 && !sameBoegenShape(state.boegen, shared.boegen)) {
      state = { ...state, boegen: shared.boegen.map((b) => ({ id: uid('bg'), ...b })) }
    }
  }

  // Persistiertes/geteiltes Regelwerk und Bezeichnungs-Schema auf die geladene
  // Konfiguration anwenden, damit Kataloge und Bojen-Kürzel zum Zustand passen.
  // Unbekanntes Regelwerk (z. B. alter Link) → Standard.
  state = {
    ...state,
    regelwerk: resolveRegelwerkId(state.regelwerk),
    sprache: isSprache(state.sprache) ? state.sprache : 'de',
  }
  applyRegelwerk(state.regelwerk)
  applySprache(state.sprache)
  if (state.beschriftung) applyBeschriftung(state.beschriftung)
  return ohneUnbekannte(state)
}
