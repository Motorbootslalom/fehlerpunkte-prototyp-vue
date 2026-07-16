import { useEffect, useRef, useState } from 'react'
import { gridNavKeyDown, timeEnter } from '../lib/gridnav'
import { formatTimeDisplay, parseTime, sanitizeTimeInput } from '../lib/time'

// Zeit-Eingabezelle:
//   • Live wird die Roh-Eingabe (z. B. "1,2345") gezeigt.
//   • Enter übernimmt und springt ins nächste Zeitfeld.
//   • Nach Verlassen zeigt die Zelle "mm:ss,00 (ss,00)".
// Gespeichert wird die Roh-Eingabe - so bleibt sie beim Editieren erhalten und
// der Parser interpretiert sie identisch wieder.

export function TimeCell({
  value,
  onChange,
}: {
  value: string
  onChange: (raw: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  // Externe Wertänderung übernehmen, solange nicht gerade editiert wird.
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  const parsed = parseTime(value)
  const display = editing ? draft : parsed ? formatTimeDisplay(parsed.centis) : ''

  return (
    <input
      ref={ref}
      className="cell-input time-input"
      inputMode="decimal"
      value={display}
      onFocus={() => {
        setDraft(value)
        setEditing(true)
        // Inhalt selektieren für schnelles Überschreiben
        requestAnimationFrame(() => ref.current?.select())
      }}
      onChange={(e) => setDraft(sanitizeTimeInput(e.target.value))}
      onBlur={() => {
        setEditing(false)
        onChange(draft)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onChange(draft)
          setEditing(false)
          if (ref.current) timeEnter(ref.current)
          return
        }
        // Pfeiltasten: erst übernehmen, dann normale Tabellen-Navigation.
        if (e.key.startsWith('Arrow')) {
          onChange(draft)
          setEditing(false)
          gridNavKeyDown(e)
        }
      }}
    />
  )
}
