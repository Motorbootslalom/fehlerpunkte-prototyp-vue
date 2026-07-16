import type { KeyboardEvent } from 'react'

// Tastatur-Navigation in einer Bogen-Tabelle:
//   • ↑ / ↓        - eine Zeile hoch/runter (gleiche Spalte)
//   • Enter        - eine Zeile runter (wie ↓)
//   • ← / →        - vorheriges/nächstes Feld, aber nur wenn der Cursor am
//                    Rand des Textes steht (sonst normale Cursor-Bewegung)
// Fokussiert wird nur innerhalb derselben Tabelle (.sheet-table).

export function gridNavKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
  const input = e.currentTarget
  switch (e.key) {
    case 'ArrowUp':
      if (moveVertical(input, -1)) e.preventDefault()
      break
    case 'ArrowDown':
    case 'Enter':
      if (moveVertical(input, 1)) e.preventDefault()
      break
    case 'ArrowLeft':
      if (atStart(input) && moveHorizontal(input, -1)) e.preventDefault()
      break
    case 'ArrowRight':
      if (atEnd(input) && moveHorizontal(input, 1)) e.preventDefault()
      break
    default:
      break
  }
}

function atStart(input: HTMLInputElement): boolean {
  return (input.selectionStart ?? 0) === 0 && (input.selectionEnd ?? 0) === 0
}

function atEnd(input: HTMLInputElement): boolean {
  const end = input.value.length
  return input.selectionStart === end && input.selectionEnd === end
}

function focusInput(el: HTMLInputElement): void {
  el.focus()
  requestAnimationFrame(() => el.select())
}

function moveVertical(input: HTMLInputElement, dir: -1 | 1): boolean {
  const body = input.closest('tbody')
  const tr = input.closest('tr')
  const td = input.closest('td')
  if (!body || !tr || !td) return false
  const rows = Array.from(body.rows)
  const rowIdx = rows.indexOf(tr as HTMLTableRowElement)
  const colIdx = (td as HTMLTableCellElement).cellIndex
  for (let r = rowIdx + dir; r >= 0 && r < rows.length; r += dir) {
    const target = rows[r].cells[colIdx]?.querySelector<HTMLInputElement>('input')
    if (target) {
      focusInput(target)
      return true
    }
  }
  return false
}

/**
 * Enter im Zeit-Bogen: immer eine Zeile nach unten in DERSELBEN Spalte.
 * Sobald die nächste Zeile keine Startnummer mehr hat (bzw. das Ende erreicht
 * ist), in die nächste Spalte oben springen.
 */
export function timeEnter(input: HTMLInputElement): void {
  const body = input.closest('tbody')
  const tr = input.closest('tr')
  const td = input.closest('td')
  if (!body || !tr || !td) return
  const rows = Array.from(body.rows)
  const rowIdx = rows.indexOf(tr as HTMLTableRowElement)
  const colIdx = (td as HTMLTableCellElement).cellIndex

  const isNumbered = (row: HTMLTableRowElement | undefined): boolean => {
    const c = row?.cells[0]
    return !!c && c.textContent.trim() !== '' && !c.querySelector('input')
  }

  const nextRow = rows[rowIdx + 1] as HTMLTableRowElement | undefined
  if (nextRow && isNumbered(nextRow)) {
    const target = nextRow.cells[colIdx]?.querySelector<HTMLInputElement>('input')
    if (target) {
      focusInput(target)
      return
    }
  }

  // Ende der Startnummern erreicht → nächste Spalte, erste Zeile.
  const target = rows[0]?.cells[colIdx + 1]?.querySelector<HTMLInputElement>('input')
  if (target) focusInput(target)
  else input.blur()
}

function moveHorizontal(input: HTMLInputElement, dir: -1 | 1): boolean {
  const table = input.closest('.sheet-table')
  if (!table) return false
  const inputs = Array.from(table.querySelectorAll<HTMLInputElement>('input'))
  const i = inputs.indexOf(input)
  const next = inputs[i + dir]
  if (next) {
    focusInput(next)
    return true
  }
  return false
}
