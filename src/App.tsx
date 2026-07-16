import { ControlPanel } from './components/ControlPanel'
import { SheetView } from './components/SheetView'
import { useStore } from './state/store'

export function App() {
  const { state } = useStore()

  return (
    <div className="app">
      <ControlPanel />
      <main className="sheets">
        {state.boegen.length === 0 ? (
          <p className="empty">Keine Bögen ausgewählt - links einen Bogen hinzufügen.</p>
        ) : (
          state.boegen.map((b) => <SheetView key={b.id} bogen={b} />)
        )}
      </main>
    </div>
  )
}
