import { inject, reactive, watch, type App, type InjectionKey } from 'vue'
import { CLASS_IDS, type AppState, type Bogen, type ClassId, type Lauf, type SheetTypeId } from '../types'
import {
  applyBeschriftung,
  defaultAufbauId,
  defaultBeschriftungId,
  getAufbau,
  positionAllowsClass,
} from '../config/active'
import { allDemoNumbers } from '../lib/demo'
import { cellKey } from '../lib/scoring'
import { readShareConfig, syncUrlToState, type ShareConfig } from '../lib/sharelink'
import { clearState, loadState, saveState } from '../lib/storage'

function uid(prefix: string): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 9)
}

/** Standard-Zusammenstellung: je ein Bogen pro Position des Aufbaus (Lauf 1). */
function defaultBoegen(aufbau: string): Bogen[] {
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
function defaultState(): AppState {
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

export type Action =
  | { type: 'SET_EVENT'; eventName: string }
  | { type: 'SET_AUFBAU'; aufbau: string }
  | { type: 'SET_BESCHRIFTUNG'; beschriftung: string }
  | { type: 'SET_EMPTY_ROWS'; emptyRows: number }
  | { type: 'SET_ROWS_PER_PAGE'; rowsPerPage: number }
  | { type: 'SET_NUMBERS'; klasse: ClassId; numbers: number[] }
  | { type: 'SET_WKR'; bogenId: string; name: string }
  | { type: 'ADD_BOGEN'; typeId: SheetTypeId; klasse: ClassId; lauf: Lauf }
  | { type: 'ADD_BOEGEN_BULK'; items: { typeId: SheetTypeId; klasse: ClassId; lauf: Lauf }[] }
  | { type: 'CLEAR_BOEGEN' }
  | { type: 'UPDATE_BOGEN'; id: string; patch: Partial<Omit<Bogen, 'id'>> }
  | { type: 'REMOVE_BOGEN'; id: string }
  | { type: 'MOVE_BOGEN'; id: string; dir: -1 | 1 }
  | { type: 'SET_VALUE'; bogenId: string; cell: string; value: string }
  | { type: 'CLEAR_VALUES'; bogenId: string }
  | { type: 'MARK_INITIALIZED' }
  | { type: 'RESET_ALL' }

// Reine Reducer-Funktion (unverändert aus dem React-Prototyp übernommen): nimmt
// den aktuellen Zustand und eine Aktion, liefert einen NEUEN vollständigen
// Zustand. Der Vue-Store legt das Ergebnis per Object.assign auf den reaktiven
// Zustand zurück.
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_EVENT':
      return { ...state, eventName: action.eventName }

    case 'SET_AUFBAU':
      // Aufbau wechseln = neue Bogen-Grundausstattung dieses Setups (Klasse 3).
      return { ...state, aufbau: action.aufbau, boegen: defaultBoegen(action.aufbau) }

    case 'SET_BESCHRIFTUNG':
      // Bezeichnungs-Schema live umstellen: Konfiguration mit neuen Bojen-Kürzeln
      // neu bauen (Seiteneffekt), dann State ändern → Neu-Render.
      applyBeschriftung(action.beschriftung)
      return { ...state, beschriftung: action.beschriftung }

    case 'SET_EMPTY_ROWS':
      return { ...state, emptyRows: Math.max(0, Math.min(30, action.emptyRows)) }

    case 'SET_ROWS_PER_PAGE': {
      // 0 = aus (durchlaufend); sonst Minimum 5 Starter pro Seite.
      const v = Math.max(0, Math.min(100, Math.round(action.rowsPerPage)))
      return { ...state, rowsPerPage: v === 0 ? 0 : Math.max(5, v) }
    }

    case 'SET_NUMBERS':
      return { ...state, numbers: { ...state.numbers, [action.klasse]: action.numbers } }

    case 'SET_WKR':
      return { ...state, wkr: { ...state.wkr, [action.bogenId]: action.name } }

    case 'ADD_BOGEN':
      return {
        ...state,
        boegen: state.boegen.concat({
          id: uid('bg'),
          typeId: action.typeId,
          klasse: action.klasse,
          lauf: action.lauf,
        }),
      }

    case 'ADD_BOEGEN_BULK':
      return {
        ...state,
        boegen: state.boegen.concat(
          action.items.map((it) => ({ id: uid('bg'), ...it })),
        ),
      }

    case 'CLEAR_BOEGEN':
      return { ...state, boegen: [] }

    case 'UPDATE_BOGEN':
      return {
        ...state,
        boegen: state.boegen.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)),
      }

    case 'REMOVE_BOGEN':
      return { ...state, boegen: state.boegen.filter((b) => b.id !== action.id) }

    case 'MOVE_BOGEN': {
      const i = state.boegen.findIndex((b) => b.id === action.id)
      const j = i + action.dir
      if (i < 0 || j < 0 || j >= state.boegen.length) return state
      const boegen = state.boegen.slice()
      ;[boegen[i], boegen[j]] = [boegen[j], boegen[i]]
      return { ...state, boegen }
    }

    case 'SET_VALUE': {
      const bogenValues = { ...(state.values[action.bogenId] ?? {}) }
      if (action.value === '') delete bogenValues[action.cell]
      else bogenValues[action.cell] = action.value
      return { ...state, values: { ...state.values, [action.bogenId]: bogenValues } }
    }

    case 'CLEAR_VALUES': {
      const values = { ...state.values }
      delete values[action.bogenId]
      return { ...state, values }
    }

    case 'MARK_INITIALIZED':
      return { ...state, initialized: true }

    case 'RESET_ALL':
      clearState()
      return defaultState()

    default:
      return state
  }
}

/** Gleiche Bogen-Folge (Typ/Klasse/Lauf) - dann bleiben die lokalen IDs erhalten. */
function sameBoegenShape(a: Bogen[], b: ShareConfig['boegen']): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (x, i) => x.typeId === b[i].typeId && x.klasse === b[i].klasse && x.lauf === b[i].lauf,
  )
}

function init(): AppState {
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

export interface Store {
  state: AppState
  dispatch: (action: Action) => void
}

const StoreKey: InjectionKey<Store> = Symbol('fehlerpunkte-store')

/**
 * Erstellt den reaktiven Store und registriert ihn als Vue-Plugin (provide).
 * Muss NACH dem Laden der Konfiguration (initConfig) aufgerufen werden, damit
 * die Standard-Zusammenstellung die aktive Konfiguration berücksichtigt.
 */
export function createStore(): { install(app: App): void; store: Store } {
  const state = reactive(init()) as AppState
  const dispatch = (action: Action): void => {
    // Reiner Reducer liefert neuen Zustand; per Object.assign zurück auf den
    // reaktiven Zustand → Vue-Reaktivität greift.
    Object.assign(state, reducer(state, action))
  }
  const store: Store = { state, dispatch }

  // Bei jeder Änderung: lokal persistieren und Adresszeile spiegeln
  // (Einstellungs-Link) - wie der useEffect im React-Prototyp.
  watch(
    state,
    () => {
      saveState(state)
      syncUrlToState(state)
    },
    { deep: true, immediate: true },
  )

  return {
    store,
    install(app: App) {
      app.provide(StoreKey, store)
    },
  }
}

export function useStore(): Store {
  const store = inject(StoreKey)
  if (!store) throw new Error('useStore muss innerhalb der App (mit createStore) verwendet werden')
  return store
}

/** Bequemer Lese-/Schreibzugriff auf eine einzelne Bogen-Zelle. */
export function useCell(bogenId: string) {
  const { state, dispatch } = useStore()
  return {
    get: (nr: string, colKey: string, subIndex?: number) =>
      state.values[bogenId]?.[cellKey(nr, colKey, subIndex)] ?? '',
    getByKey: (key: string) => state.values[bogenId]?.[key] ?? '',
    set: (cell: string, value: string) => dispatch({ type: 'SET_VALUE', bogenId, cell, value }),
  }
}
