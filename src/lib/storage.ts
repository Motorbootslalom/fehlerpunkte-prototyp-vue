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
