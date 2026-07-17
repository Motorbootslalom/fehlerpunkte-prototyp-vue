import { inject, reactive, watch, type App, type InjectionKey } from 'vue'
import type { AppState, Bogen, ClassId, Lauf, SheetTypeId } from '../types'
import { applyBeschriftung } from '../config/active'
import { cellKey } from '../lib/scoring'
import { syncUrlToState } from '../lib/sharelink'
import { clearState, saveState } from '../lib/storage'
import { buildInitialState, defaultBoegen, defaultState, uid } from './initState'

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
  const state = reactive(buildInitialState()) as AppState
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
