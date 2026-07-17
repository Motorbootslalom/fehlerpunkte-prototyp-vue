import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { AppState } from '../types'
import { buildInitialState } from '../state/initState'

// Winziger, NUR LESENDER React-Store für die PDF-Insel (pdf.html). Die
// Eingabe-App ist Vue und schreibt den Stand in localStorage; die Insel liest
// ihn beim Laden über denselben framework-agnostischen buildInitialState().
// Es gibt bewusst keinen Reducer/Dispatch - Änderungen entstehen im Haupt-
// Prototyp, danach diese Seite neu laden.

interface ReadonlyStore {
  state: AppState
}

const StoreContext = createContext<ReadonlyStore | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useMemo(() => buildInitialState(), [])
  return <StoreContext.Provider value={{ state }}>{children}</StoreContext.Provider>
}

export function useStore(): ReadonlyStore {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore muss innerhalb von StoreProvider verwendet werden')
  return ctx
}
