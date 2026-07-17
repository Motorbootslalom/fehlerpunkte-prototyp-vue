import { getSheetDef } from '../config/active'
import { bogenPayload } from './qr'
import { cellKey, columnsForClass, formatDisqs, scoreRow } from './scoring'
import { formatTimeDisplay, parseTime } from './time'
import type { AppState, Bogen, CellKind, Column, SheetDef } from '../types'

// Framework-agnostisches, "headless" Modell eines gerenderten Bogens: dieselbe
// Logik wie die Vue-Komponente SheetPage (Spalten je Klasse, Blatt-/Unterspalten,
// Zeilen samt Σ/Zeit/Disq), aber ohne DOM. Genutzt von den Vektor-PDF-Generatoren
// (pdfmake, jsPDF) - so bleiben beide konsistent zur Bildschirm-/Druckansicht.

/** Ein "Blatt" = genau eine Zelle je Zeile (Bojen-Unterspalten flach). */
export interface ModelLeaf {
  colKey: string
  subIndex?: number
  kind: CellKind
  label: string
}

/** Oberste Spalte (für gruppierte Kopfzeilen); subLabels leer = keine Unterspalten. */
export interface ModelColumn {
  key: string
  label: string
  kind: CellKind
  subLabels: string[]
}

export interface ModelCell {
  kind: CellKind
  /** Anzeigetext (Zeit formatiert, Σ berechnet, Disq inkl. Auto-Übernahme). */
  display: string
}

export interface ModelRow {
  nr: string
  fixed: boolean
  shaded: boolean
  cells: ModelCell[] // deckungsgleich zu leaves
  /** Kurztext der Disqualifikationen der Zeile (z. B. "G @ Tor 3 H R"). */
  disqText: string
}

export interface SheetModelPage {
  bogenId: string
  eventName: string
  title: string
  klasse: string
  lauf: number
  showLauf: boolean
  orientation: 'portrait' | 'landscape'
  qrPayload: string
  columns: ModelColumn[]
  leaves: ModelLeaf[]
  twoRow: boolean
  rows: ModelRow[]
  /** Für die Legende (errorTable/errorGroups/disqTable/legendNote). */
  def: SheetDef
  pageIndex: number
  pageCount: number
}

function buildLeaves(columns: Column[]): ModelLeaf[] {
  return columns.flatMap((col) =>
    col.sub && col.sub.length > 0
      ? col.sub.map((s, i) => ({
          colKey: col.key,
          subIndex: i,
          kind: col.kind,
          label: `${col.label} ${s}`,
        }))
      : [{ colKey: col.key, kind: col.kind, label: col.label }],
  )
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Alle Druckseiten eines Bogens (bei „Zeilen/Seite“ mehrere, sonst eine). */
export function buildBogenPages(state: AppState, bogen: Bogen): SheetModelPage[] {
  const def = getSheetDef(bogen.typeId)
  const cols = columnsForClass(def.columns, bogen.klasse)
  const viewDef: SheetDef = { ...def, columns: cols }
  const leaves = buildLeaves(cols)
  const columns: ModelColumn[] = cols.map((c) => ({
    key: c.key,
    label: c.label,
    kind: c.kind,
    subLabels: c.sub ?? [],
  }))
  const twoRow = cols.some((c) => c.sub && c.sub.length > 0)

  const nums = state.numbers[bogen.klasse] ?? []
  const chunks = state.rowsPerPage > 0 ? chunk(nums, state.rowsPerPage) : [nums]
  if (chunks.length === 0) chunks.push([])
  const pageCount = chunks.length

  const getByKey = (k: string) => state.values[bogen.id]?.[k] ?? ''

  return chunks.map((chunkNums, pageIndex) => {
    const rowKeys = chunkNums.map((n) => ({ nr: String(n), fixed: true, key: String(n) }))
    for (let i = 0; i < state.emptyRows; i++) {
      rowKeys.push({ nr: '', fixed: false, key: `_p${pageIndex}_x${i}` })
    }

    const rows: ModelRow[] = rowKeys.map((rk, i) => {
      const score = scoreRow(viewDef, rk.key, getByKey)
      const autoDisq = Array.from(
        new Set(score.disqs.filter((d) => d.where !== 'Disq.').map((d) => d.code)),
      ).join(', ')

      const cells: ModelCell[] = leaves.map((leaf) => {
        const raw = getByKey(cellKey(rk.key, leaf.colKey, leaf.subIndex))
        let display = raw
        if (leaf.kind === 'sum') {
          const val = leaf.colKey in score.computedCols ? score.computedCols[leaf.colKey] : score.sum
          display = val > 0 ? String(val) : ''
        } else if (leaf.kind === 'time') {
          const p = parseTime(raw)
          display = p ? formatTimeDisplay(p.centis) : ''
        } else if (leaf.kind === 'disq') {
          display = raw !== '' ? raw : autoDisq
        }
        return { kind: leaf.kind, display }
      })

      return {
        nr: rk.nr,
        fixed: rk.fixed,
        shaded: (i + 1) % 5 === 0,
        cells,
        disqText: score.disqs.length ? formatDisqs(score.disqs) : '',
      }
    })

    return {
      bogenId: bogen.id,
      eventName: state.eventName,
      title: def.title,
      klasse: bogen.klasse,
      lauf: bogen.lauf,
      showLauf: def.showLauf !== false,
      orientation: def.orientation,
      qrPayload: bogenPayload(state.eventName, bogen),
      columns,
      leaves,
      twoRow,
      rows,
      def,
      pageIndex,
      pageCount,
    }
  })
}

/** Alle Seiten aller aktuell zusammengestellten Bögen (Reihenfolge = Auswahl). */
export function buildAllPages(state: AppState): SheetModelPage[] {
  return state.boegen.flatMap((b) => buildBogenPages(state, b))
}
