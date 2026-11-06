import { computed, inject, reactive, watch, type App, type InjectionKey } from 'vue'
import type { AppState, Bogen, ClassId, Lauf, SheetTypeId, Sprache, Starter } from '../types'
import { applyBeschriftung, applyRegelwerk, applySprache, aufbauOrder, getAufbau, positionAllowsClass } from '../config/active'
import { beispielEingaben, type Zeitnahme } from '../lib/beispielwerte'
import { aktuellerListenStand } from '../lib/ergebnis'
import { bereinigeEingaben, bogenLeser, listenUmziehen, setzeWkr, setzeZelle } from '../lib/eingaben'
import { trennen, zusammenlegen } from '../lib/kombi'
import { normalizeClassOrder } from '../lib/quickpick'
import { syncUrlToState } from '../lib/sharelink'
import { clearState, saveState } from '../lib/storage'
import { boegenFuerAufbau, buildInitialState, defaultState, uid } from './initState'

export type Action =
  | { type: 'SET_EVENT'; eventName: string }
  | { type: 'SET_REGELWERK'; regelwerk: string }
  | { type: 'SET_SPRACHE'; sprache: Sprache }
  | { type: 'SET_AUFBAU'; aufbau: string }
  | { type: 'SET_TOR5_MIT_PARCOURS'; on: boolean }
  | { type: 'SET_STREICHEN_AB_ZWEI'; on: boolean }
  | { type: 'SET_BESCHRIFTUNG'; beschriftung: string }
  | { type: 'SET_EMPTY_ROWS'; emptyRows: number }
  | { type: 'SET_ROWS_PER_PAGE'; rowsPerPage: number }
  | { type: 'SET_SPLIT_FROM'; splitFrom: number }
  | { type: 'SET_DESCRIPTION_ON_BACK'; on: boolean }
  | { type: 'SET_NUMBERS'; klasse: ClassId; numbers: string[] }
  | { type: 'SET_STARTER'; klasse: ClassId; starter: Record<string, Starter> }
  | { type: 'SET_CLASS_ORDER'; classOrder: ClassId[] }
  | { type: 'SET_WKR'; bogen: Bogen; name: string }
  | { type: 'ADD_BOGEN'; typeId: SheetTypeId; klasse: ClassId; lauf: Lauf }
  | { type: 'ADD_BOEGEN_BULK'; items: { typeId: SheetTypeId; klasse: ClassId; lauf: Lauf }[] }
  | { type: 'CLEAR_BOEGEN' }
  | { type: 'UPDATE_BOGEN'; id: string; patch: Partial<Omit<Bogen, 'id'>> }
  | { type: 'REMOVE_BOGEN'; id: string }
  | { type: 'MOVE_BOGEN'; id: string; dir: -1 | 1 }
  | { type: 'SET_VALUE'; bogen: Bogen; cell: string; value: string }
  | { type: 'SET_BEISPIELWERTE'; zeitnahme: Zeitnahme }
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

    case 'SET_REGELWERK': {
      // Kataloge und Disqualifikationen neu bauen (Seiteneffekt), dann State
      // ändern → Neu-Render. Bögen von Klassen, die das neue Regelwerk nicht
      // kennt (z. B. UIM ohne Klasse 6/7), entfallen, ebenso Eingaben, die es
      // nicht mehr gibt oder die nicht mehr gelten.
      applyRegelwerk(action.regelwerk)
      const boegen = state.boegen.filter((b) => positionAllowsClass(b.typeId, b.klasse))
      return { ...state, regelwerk: action.regelwerk, boegen, ...bereinigeEingaben(state) }
    }

    case 'SET_SPRACHE':
      applySprache(action.sprache)
      return { ...state, sprache: action.sprache }

    case 'SET_AUFBAU': {
      // Aufbau wechseln = Bögen dieses Setups. Die Felder bleiben dieselben, nur was zu
      // einer Liste gehört, zieht auf deren Entsprechung um.
      const boegen = boegenFuerAufbau(state, action.aufbau)
      const order = aufbauOrder(action.aufbau, state.tor5MitParcours)
      return { ...state, aufbau: action.aufbau, boegen, ...listenUmziehen(state, order, getAufbau(action.aufbau).disziplin) }
    }

    case 'SET_TOR5_MIT_PARCOURS': {
      const kombi = getAufbau(state.aufbau).kombi
      if (!kombi) return { ...state, tor5MitParcours: action.on }
      const boegen = action.on ? zusammenlegen(state.boegen, kombi) : trennen(state.boegen, kombi, () => uid('bg'))
      const order = aufbauOrder(state.aufbau, action.on)
      // Die Kombi-Liste entspricht der ersten ersetzten; die andere bleibt für das Trennen.
      const fest: [string, string] = action.on ? [kombi.ersetzt[0], kombi.positionId] : [kombi.positionId, kombi.ersetzt[0]]
      return { ...state, tor5MitParcours: action.on, boegen, ...listenUmziehen(state, order, getAufbau(state.aufbau).disziplin, fest) }
    }

    case 'SET_STREICHEN_AB_ZWEI':
      return { ...state, streichenAbZwei: action.on }

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

    case 'SET_SPLIT_FROM':
      // 0 = aus (jede Klasse über „Zeilen/Seite“ wird aufgeteilt).
      return { ...state, splitFrom: Math.max(0, Math.min(200, Math.round(action.splitFrom) || 0)) }

    case 'SET_DESCRIPTION_ON_BACK':
      return { ...state, descriptionOnBack: action.on }

    case 'SET_NUMBERS':
      return { ...state, numbers: { ...state.numbers, [action.klasse]: action.numbers } }

    case 'SET_STARTER': {
      // Neue Namen bringen ihre Startnummer mit, sonst fehlten sie auf den Listen.
      const bisher = state.numbers[action.klasse] ?? []
      const neu = Object.keys(action.starter).filter((nr) => !bisher.includes(nr))
      return {
        ...state,
        starter: { ...state.starter, [action.klasse]: action.starter },
        numbers: { ...state.numbers, [action.klasse]: [...bisher, ...neu] },
      }
    }

    case 'SET_CLASS_ORDER':
      return { ...state, classOrder: normalizeClassOrder(action.classOrder) }

    case 'SET_WKR':
      return { ...state, wkr: setzeWkr(state, action.bogen, action.name) }

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

    case 'SET_VALUE':
      return { ...state, eingaben: setzeZelle(state, action.bogen, action.cell, action.value) }

    case 'SET_BEISPIELWERTE':
      return { ...state, eingaben: beispielEingaben(state, action.zeitnahme) }

    case 'MARK_INITIALIZED':
      return { ...state, initialized: true }

    case 'RESET_ALL': {
      const fresh = defaultState()
      // Die Konfiguration passend zum Zustand zurückstellen.
      applyRegelwerk(fresh.regelwerk)
      applySprache(fresh.sprache)
      if (fresh.beschriftung) applyBeschriftung(fresh.beschriftung)
      return fresh
    }

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
  state.listenStand = aktuellerListenStand(state, Date.now())
  // Nach „Alles zurücksetzen“ bleibt der Speicher leer, bis wieder etwas geändert wird.
  let speichern = true
  const dispatch = (action: Action): void => {
    // Reiner Reducer liefert neuen Zustand; per Object.assign zurück auf den
    // reaktiven Zustand → Vue-Reaktivität greift.
    Object.assign(state, reducer(state, action))
    // Hier und nicht in der Anzeige: Die Listen ändern sich auch, wenn sie nicht zu sehen sind.
    state.listenStand = aktuellerListenStand(state, Date.now())
    speichern = action.type !== 'RESET_ALL'
    if (!speichern) clearState()
  }
  const store: Store = { state, dispatch }

  // Bei jeder Änderung: lokal persistieren und Adresszeile spiegeln
  // (Einstellungs-Link) - wie der useEffect im React-Prototyp.
  watch(
    state,
    () => {
      if (speichern) saveState(state)
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

/** Bequemer Lese-/Schreibzugriff auf die Zellen eines Bogens (Klasse und Lauf können wechseln). */
export function useCell(bogen: () => Bogen) {
  const { state, dispatch } = useStore()
  const leser = computed(() => bogenLeser(state, bogen()))
  return {
    getByKey: (key: string) => leser.value(key),
    set: (cell: string, value: string) => dispatch({ type: 'SET_VALUE', bogen: bogen(), cell, value }),
  }
}
