import type { RawAufbau } from '../config/schema'
import type { AppState } from '../types'

const STORAGE_KEY = 'fehlerpunkte-prototyp:v1'

export function loadState(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Speicher voll oder nicht verfügbar - im Prototyp still ignorieren.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorieren
  }
}

// Eigene Aufbauten liegen unter einem eigenen Schlüssel: „Alles zurücksetzen“ löscht sie
// nicht (KONZEPT-POSITIONEN.md §8). Gelöscht wird einer einzeln in der Bedienleiste.
const EIGENE_KEY = 'fehlerpunkte-prototyp:aufbauten:v1'

export function ladeEigeneAufbauten(): RawAufbau[] {
  try {
    const raw = localStorage.getItem(EIGENE_KEY)
    const liste = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(liste) ? liste.filter((a): a is RawAufbau => !!a && typeof a === 'object' && typeof a.id === 'string') : []
  } catch {
    return []
  }
}

export function speichereEigeneAufbauten(liste: RawAufbau[]): void {
  try {
    localStorage.setItem(EIGENE_KEY, JSON.stringify(liste))
  } catch {
    // Speicher voll oder nicht verfügbar - im Prototyp still ignorieren.
  }
}
