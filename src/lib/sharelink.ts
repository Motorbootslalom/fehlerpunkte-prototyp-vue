import { CLASS_IDS, type AppState, type ClassId, type Lauf } from '../types'

// Teilbare Konfiguration in der URL (Feature „Einstellungs-Link"):
// Aufbau, Bezeichnung, Veranstaltung, Leerzeilen, Zeilen/Seite, die
// Startnummern je Klasse und die Bogen-Auswahl (Liste × Klasse × Lauf) werden
// kompakt in den URL-Parameter `c` kodiert. NICHT enthalten sind eingetragene
// Werte (Punkte/Zeiten) oder WKR-Namen - der Link stellt nur die
// Zusammenstellung her, keine erfassten Daten.
//
// Die Adresszeile wird bei jeder Änderung aktualisiert (Auto-Sync, siehe
// StoreProvider), sodass sich der aktuelle Stand jederzeit kopieren lässt.

const PARAM = 'c'

/** Kompakte, teilbare Konfiguration (ohne eingetragene Werte). */
export interface ShareConfig {
  eventName: string
  aufbau: string
  beschriftung: string
  emptyRows: number
  rowsPerPage: number
  /** Startnummern je Klasse (Reihenfolge = Startreihenfolge). */
  numbers: Partial<Record<ClassId, number[]>>
  boegen: Array<{ typeId: string; klasse: ClassId; lauf: Lauf }>
}

/** Startnummern-Map defensiv aus der Wire-Form lesen (nur bekannte Klassen). */
function numbersFromWire(raw: unknown): Partial<Record<ClassId, number[]>> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Partial<Record<ClassId, number[]>> = {}
  for (const [klasse, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!CLASS_IDS.includes(klasse as ClassId)) continue
    if (!Array.isArray(list)) continue
    const nums = list.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
    out[klasse as ClassId] = nums
  }
  return out
}

/** Bogen-Auswahl → "typeId:klasse:lauf" (kompakt für die URL). */
function boegenToWire(boegen: ShareConfig['boegen']): string[] {
  return boegen.map((b) => `${b.typeId}:${b.klasse}:${b.lauf}`)
}

/** "typeId:klasse:lauf" → Bogen-Auswahl (defensiv, unbekannte Einträge weg). */
function boegenFromWire(items: unknown): ShareConfig['boegen'] {
  if (!Array.isArray(items)) return []
  const out: ShareConfig['boegen'] = []
  for (const raw of items) {
    if (typeof raw !== 'string') continue
    const [typeId, klasse, laufStr] = raw.split(':')
    const lauf = Number(laufStr) as Lauf
    if (!typeId) continue
    if (!CLASS_IDS.includes(klasse as ClassId)) continue
    if (lauf !== 1 && lauf !== 2 && lauf !== 3) continue
    out.push({ typeId, klasse: klasse as ClassId, lauf })
  }
  return out
}

/** State → teilbare Konfiguration (nur der geteilte Ausschnitt). */
export function toShareConfig(state: AppState): ShareConfig {
  return {
    eventName: state.eventName,
    aufbau: state.aufbau,
    beschriftung: state.beschriftung,
    emptyRows: state.emptyRows,
    rowsPerPage: state.rowsPerPage,
    numbers: state.numbers,
    boegen: state.boegen.map((b) => ({ typeId: b.typeId, klasse: b.klasse, lauf: b.lauf })),
  }
}

// ---- Base64url (UTF-8-fest) -----------------------------------------------
function b64urlEncode(str: string): string {
  const b64 = btoa(unescape(encodeURIComponent(str)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(escape(atob(b64)))
}

/** Konfiguration → kompakter URL-Parameterwert. */
export function encodeShareConfig(cfg: ShareConfig): string {
  const wire = {
    e: cfg.eventName,
    a: cfg.aufbau,
    b: cfg.beschriftung,
    r: cfg.emptyRows,
    p: cfg.rowsPerPage,
    n: cfg.numbers,
    g: boegenToWire(cfg.boegen),
  }
  return b64urlEncode(JSON.stringify(wire))
}

/** URL-Parameterwert → Konfiguration (null bei ungültig). */
export function decodeShareConfig(param: string): ShareConfig | null {
  try {
    const wire = JSON.parse(b64urlDecode(param)) as Record<string, unknown>
    if (!wire || typeof wire !== 'object') return null
    return {
      eventName: typeof wire.e === 'string' ? wire.e : '',
      aufbau: typeof wire.a === 'string' ? wire.a : '',
      beschriftung: typeof wire.b === 'string' ? wire.b : '',
      emptyRows: typeof wire.r === 'number' ? wire.r : 3,
      rowsPerPage: typeof wire.p === 'number' ? wire.p : 0,
      numbers: numbersFromWire(wire.n),
      boegen: boegenFromWire(wire.g),
    }
  } catch {
    return null
  }
}

/** Liest die geteilte Konfiguration aus der aktuellen URL (oder null). */
export function readShareConfig(): ShareConfig | null {
  if (typeof window === 'undefined' || !window.location) return null
  try {
    const param = new URLSearchParams(window.location.search).get(PARAM)
    return param ? decodeShareConfig(param) : null
  } catch {
    return null
  }
}

/** Vollständige Teilen-URL zum aktuellen Zustand (für den Kopieren-Button). */
export function buildShareUrl(state: AppState): string {
  if (typeof window === 'undefined' || !window.location) return ''
  const url = new URL(window.location.href)
  url.searchParams.set(PARAM, encodeShareConfig(toShareConfig(state)))
  return url.toString()
}

/** Adresszeile still auf den aktuellen Zustand aktualisieren (Auto-Sync). */
export function syncUrlToState(state: AppState): void {
  if (typeof window === 'undefined' || !window.history || !window.location) return
  try {
    const url = new URL(window.location.href)
    url.searchParams.set(PARAM, encodeShareConfig(toShareConfig(state)))
    window.history.replaceState(null, '', url.toString())
  } catch {
    // Nicht kritisch - Auto-Sync im Zweifel überspringen.
  }
}
