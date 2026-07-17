<script setup lang="ts">
import { computed, ref } from 'vue'
import { gridNavKeyDown } from '../lib/gridnav'
import { normalizeCodeCell } from '../lib/codes'
import { allowedSet, sanitizeBuoy, sanitizeCodeInput, sanitizeDisq } from '../lib/disq'
import { cellKey, columnsForClass, formatDisqs, scoreRow, type RowScore } from '../lib/scoring'
import { useCell, useStore } from '../state/store'
import type { Bogen, CellKind, Column, SheetDef, TrennerDesign } from '../types'
import Legend from './Legend.vue'
import SheetHeader from './SheetHeader.vue'
import TimeCell from './TimeCell.vue'

interface Row {
  id: string
  nr: string
  fixed: boolean
  shaded: boolean
}

/** Eine "Blatt"-Spalte = genau eine Zelle je Zeile (Bojen-Unterspalten flach). */
interface Leaf {
  colKey: string
  subIndex?: number
  kind: CellKind
  label: string
  grow?: number
  codes?: Set<string>
  trenner?: TrennerDesign
  trennerR?: TrennerDesign
}

const props = defineProps<{
  bogen: Bogen
  def: SheetDef
  chunkNums: number[]
  pageIndex: number
  pageCount: number
}>()

const { state, dispatch } = useStore()
const cell = useCell(props.bogen.id)
const base = import.meta.env.BASE_URL

// Fadenkreuz: aktuell fokussierte Zeile/Spalte (Orientierungs-Hervorhebung).
const focus = ref<{ row: number; col: number } | null>(null)

function toLeaves(columns: Column[]): Leaf[] {
  return columns.flatMap((col) => {
    const codes =
      col.kind === 'code' && col.errorTable ? new Set(col.errorTable.map((e) => e.code)) : undefined
    return col.sub && col.sub.length > 0
      ? col.sub.map((s, i) => ({
          colKey: col.key,
          subIndex: i,
          kind: col.kind,
          label: `${col.label} ${s}`,
          grow: col.grow,
          codes,
          // Erstes Unter-Blatt: linke Kante der Gruppe (Spalten-Trenner).
          // Weitere: Trennlinie zwischen den Unter-Spalten (subTrenner).
          trenner: i === 0 ? col.trenner : col.subTrenner,
          // Zusätzlich rechts, außer beim letzten Unter-Blatt.
          trennerR: i < col.sub!.length - 1 ? col.subTrenner : undefined,
        }))
      : [{ colKey: col.key, kind: col.kind, label: col.label, grow: col.grow, codes, trenner: col.trenner }]
  })
}

/** CSS-Klasse für die Trennlinie am linken Rand. */
function trennerClass(trenner?: TrennerDesign): string {
  return trenner ? ` sep-${trenner}` : ''
}

/** CSS-Klasse für die Trennlinie am rechten Rand (Sub-Kante beidseitig). */
function trennerClassR(trenner?: TrennerDesign): string {
  return trenner ? ` sepr-${trenner}` : ''
}

/** Spaltenbreite fürs <colgroup>. */
function leafWidth(leaf: Leaf): string | undefined {
  if (leaf.kind === 'sum') return '12mm'
  if (leaf.kind === 'disq') return '16mm'
  if (leaf.grow) return `${leaf.grow * 12}%`
  return undefined // buoy/time/code ohne grow → teilen sich den Rest
}

// Nur die für diese Klasse gültigen Spalten (z. B. Speed/MüB je Klasse).
const cols = computed(() => columnsForClass(props.def.columns, props.bogen.klasse))
const viewDef = computed<SheetDef>(() => ({ ...props.def, columns: cols.value }))
const leaves = computed(() => toLeaves(cols.value))
const twoRow = computed(() => cols.value.some((c) => c.sub && c.sub.length > 0))
// Gesamtspaltenzahl (Nr. + alle Blatt-Spalten) für die über die volle Breite
// gehenden Kopf-/Fußzellen.
const totalCols = computed(() => 1 + leaves.value.length)
// Erlaubte Disq-Codes dieser Position (für Eingabe-Validierung).
const allowed = computed(() => allowedSet(props.def.disqTable))
// Positionsweite Fehlercodes (Fallback für Spalten ohne eigenen Katalog).
const defCodes = computed(() => new Set((props.def.errorTable ?? []).map((e) => e.code)))
// Bild um ±90° gedreht → Hochformat neben der Legende.
const drehung = computed(() => props.def.bildDrehung ?? 0)
const gedreht = computed(() => Math.abs(drehung.value) === 90)

const rows = computed<Row[]>(() => {
  const r: Row[] = props.chunkNums.map((n) => ({ id: String(n), nr: String(n), fixed: true, shaded: false }))
  // Immer genau `emptyRows` leere Zeilen nach den Startnummern - auf jeder Seite.
  // Seiten-Präfix hält die Zellschlüssel je Seite eindeutig.
  for (let i = 0; i < state.emptyRows; i++) {
    r.push({ id: `_p${props.pageIndex}_x${i}`, nr: '', fixed: false, shaded: false })
  }
  // Zur Orientierung ist jede 5. Zeile grau hinterlegt (je Seite gezählt).
  r.forEach((row, i) => {
    row.shaded = (i + 1) % 5 === 0
  })
  return r
})

// Zeilen mit vorberechnetem Score (reaktiv - liest die Zellwerte).
const rowData = computed(() =>
  rows.value.map((row) => {
    const rowKey = row.fixed ? row.nr : row.id
    const score = scoreRow(viewDef.value, rowKey, (k) => cell.getByKey(k))
    const disqTitle = score.disqs.length ? formatDisqs(score.disqs) : undefined
    // Disq-Buchstaben aus den Tor-/Bojen-Zellen (nicht aus der Disq-Spalte selbst).
    const autoDisq = Array.from(
      new Set(score.disqs.filter((d) => d.where !== 'Disq.').map((d) => d.code)),
    ).join(', ')
    return { row, rowKey, score, disqTitle, autoDisq }
  }),
)

function hl(rowIdx: number, colIdx: number): string {
  if (!focus.value) return ''
  return (focus.value.row === rowIdx ? ' hl-row' : '') + (focus.value.col === colIdx ? ' hl-col' : '')
}

function handleFocus(e: FocusEvent) {
  const t = e.target as HTMLElement
  const td = t.closest('td')
  const tr = t.closest('tr')
  const body = t.closest('tbody')
  if (td && tr && body) {
    focus.value = {
      row: Array.from(body.rows).indexOf(tr as HTMLTableRowElement),
      col: (td as HTMLTableCellElement).cellIndex,
    }
  }
}

function handleBlur(e: FocusEvent) {
  const ct = e.currentTarget as HTMLElement
  if (!ct.contains(e.relatedTarget as Node | null)) focus.value = null
}

// ---- Kopfzeilen ------------------------------------------------------------
function headTopClass(col: Column): string {
  return col.sub && col.sub.length > 0
    ? `col-group${trennerClass(col.trenner)}`
    : `col-${col.kind}${trennerClass(col.trenner)}`
}

function subCellClass(col: Column, i: number): string {
  return `col-sub${trennerClass(i === 0 ? col.trenner : col.subTrenner)}${
    i < col.sub!.length - 1 ? trennerClassR(col.subTrenner) : ''
  }`
}

// ---- Zell-Helfer -----------------------------------------------------------
function leafCk(leaf: Leaf, rowKey: string): string {
  return cellKey(rowKey, leaf.colKey, leaf.subIndex)
}
function leafKey(leaf: Leaf): string {
  return leaf.subIndex === undefined ? leaf.colKey : `${leaf.colKey}#${leaf.subIndex}`
}
function leafSep(leaf: Leaf): string {
  return trennerClass(leaf.trenner) + trennerClassR(leaf.trennerR)
}
function sumVal(leaf: Leaf, score: RowScore): number | '' {
  const val = leaf.colKey in score.computedCols ? score.computedCols[leaf.colKey] : score.sum
  return val > 0 ? val : ''
}
function leafInputClass(leaf: Leaf): string {
  return leaf.kind === 'text' ? 'text-input' : leaf.kind === 'buoy' ? 'buoy-input' : 'code-input'
}
function codeSetOf(leaf: Leaf): Set<string> {
  return leaf.codes ?? defCodes.value
}
function disqStored(leaf: Leaf, rowKey: string): string {
  return cell.getByKey(leafCk(leaf, rowKey))
}
function disqShowAuto(leaf: Leaf, rowKey: string, autoDisq: string): boolean {
  return disqStored(leaf, rowKey) === '' && autoDisq !== ''
}
function disqValue(leaf: Leaf, rowKey: string, autoDisq: string): string {
  const s = disqStored(leaf, rowKey)
  return s === '' ? autoDisq : s
}

function onLeafInput(leaf: Leaf, rowKey: string, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const v =
    leaf.kind === 'buoy'
      ? sanitizeBuoy(raw, allowed.value)
      : leaf.kind === 'code'
        ? sanitizeCodeInput(raw)
        : raw
  cell.set(leafCk(leaf, rowKey), v)
}
function onLeafBlur(leaf: Leaf, rowKey: string, e: Event) {
  if (leaf.kind !== 'code') return
  const raw = (e.target as HTMLInputElement).value
  const f = normalizeCodeCell(raw, codeSetOf(leaf), allowed.value)
  if (f !== raw) cell.set(leafCk(leaf, rowKey), f)
}
function onDisqInput(leaf: Leaf, rowKey: string, e: Event) {
  cell.set(leafCk(leaf, rowKey), sanitizeDisq((e.target as HTMLInputElement).value, allowed.value))
}
function onTimeChange(leaf: Leaf, rowKey: string, raw: string) {
  cell.set(leafCk(leaf, rowKey), raw)
}
function nrValue(row: Row): string {
  return cell.getByKey(cellKey(row.id, '__nr'))
}
function onNrInput(row: Row, e: Event) {
  cell.set(cellKey(row.id, '__nr'), (e.target as HTMLInputElement).value)
}
function onWkr(name: string) {
  dispatch({ type: 'SET_WKR', bogenId: props.bogen.id, name })
}
function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div :class="`sheet sheet--${def.orientation}${gedreht ? ' sheet--rotated' : ''}`">
    <!-- Der Bogen ist EINE Tabelle: <thead>/<tfoot> wiederholen sich beim Druck
         automatisch auf jeder Seite, falls eine Seite doch noch umbricht. -->
    <table class="sheet-table" @focusin="handleFocus" @focusout="handleBlur">
      <colgroup>
        <col class="cg-nr" />
        <col v-for="(leaf, i) in leaves" :key="i" :style="{ width: leafWidth(leaf) }" />
      </colgroup>
      <thead>
        <tr>
          <th class="sheet-head-cell" :colspan="totalCols">
            <SheetHeader
              :def="def"
              :bogen="bogen"
              :event-name="state.eventName"
              :wkr="state.wkr[bogen.id] ?? ''"
              @wkr="onWkr"
            />
          </th>
        </tr>
        <tr>
          <th class="col-nr" :rowspan="twoRow ? 2 : 1">Nr.</th>
          <template v-for="col in cols" :key="col.key">
            <th
              v-if="col.sub && col.sub.length > 0"
              :class="headTopClass(col)"
              :colspan="col.sub.length"
            >
              {{ col.label }}
            </th>
            <th v-else :class="headTopClass(col)" :rowspan="twoRow ? 2 : 1">{{ col.label }}</th>
          </template>
        </tr>
        <tr v-if="twoRow">
          <template v-for="col in cols" :key="col.key">
            <template v-if="col.sub && col.sub.length > 0">
              <th v-for="(s, i) in col.sub" :key="`${col.key}-${i}`" :class="subCellClass(col, i)">
                {{ s }}
              </th>
            </template>
          </template>
        </tr>
      </thead>
      <tfoot>
        <tr>
          <td class="sheet-foot-cell" :colspan="totalCols">
            <div class="sheet-footer">
              <Legend :def="def" />
              <div v-if="def.courseImageDir" class="course">
                <!-- Um ±90° gedreht und formatfüllend: Inline-SVG mit
                     preserveAspectRatio füllt die (beliebig hohe) Box proportional. -->
                <svg
                  v-if="gedreht"
                  class="course-svg"
                  viewBox="0 0 100 237"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <image
                    :href="`${base}parcours/${def.courseImageDir}/Klasse${bogen.klasse}.svg`"
                    width="237"
                    height="100"
                    :transform="
                      drehung === -90 ? 'translate(0 237) rotate(-90)' : 'translate(100 0) rotate(90)'
                    "
                    preserveAspectRatio="xMidYMid meet"
                  />
                </svg>
                <img
                  v-else
                  :src="`${base}parcours/${def.courseImageDir}/Klasse${bogen.klasse}.svg`"
                  :alt="`Parcours Klasse ${bogen.klasse}`"
                  :style="drehung === 180 ? { transform: 'rotate(180deg)' } : undefined"
                  @error="onImgError"
                />
              </div>
              <div class="sheet-signature-row">
                <span v-if="pageCount > 1" class="page-indicator">
                  Seite {{ pageIndex + 1 }} / {{ pageCount }}
                </span>
                <div class="signature">
                  <span class="sig-line" />
                  <span class="sig-label">Unterschrift WKR</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tfoot>
      <tbody>
        <tr v-for="(rd, rowIdx) in rowData" :key="rd.row.id" :class="rd.row.shaded ? 'row-shaded' : undefined">
          <td :class="`col-nr${hl(rowIdx, 0)}`">
            <template v-if="rd.row.fixed">{{ rd.row.nr }}</template>
            <input
              v-else
              class="cell-input nr-input"
              :value="nrValue(rd.row)"
              @input="onNrInput(rd.row, $event)"
              @keydown="gridNavKeyDown"
            />
          </td>
          <template v-for="(leaf, li) in leaves" :key="leafKey(leaf)">
            <!-- Σ-Zelle (nur Anzeige). -->
            <td
              v-if="leaf.kind === 'sum'"
              :class="`col-sum-cell${hl(rowIdx, li + 1)}${leafSep(leaf)}`"
              :title="rd.disqTitle"
            >
              {{ sumVal(leaf, rd.score) }}
            </td>
            <!-- Zeit-Zelle. -->
            <td v-else-if="leaf.kind === 'time'" :class="`col-time-cell${hl(rowIdx, li + 1)}${leafSep(leaf)}`">
              <TimeCell
                :value="cell.getByKey(leafCk(leaf, rd.rowKey))"
                @change="(raw) => onTimeChange(leaf, rd.rowKey, raw)"
              />
            </td>
            <!-- Disq-Zelle: manueller Wert hat Vorrang, sonst automatisch aus den
                 Tor-Zellen übernommen (überschreibbar). -->
            <td v-else-if="leaf.kind === 'disq'" :class="`col-disq-cell${hl(rowIdx, li + 1)}${leafSep(leaf)}`">
              <input
                :class="`cell-input disq-input${disqShowAuto(leaf, rd.rowKey, rd.autoDisq) ? ' disq-auto' : ''}`"
                :value="disqValue(leaf, rd.rowKey, rd.autoDisq)"
                @input="onDisqInput(leaf, rd.rowKey, $event)"
                @keydown="gridNavKeyDown"
              />
            </td>
            <!-- buoy / code / points / text. -->
            <td v-else :class="`col-${leaf.kind}-cell${hl(rowIdx, li + 1)}${leafSep(leaf)}`">
              <input
                :class="`cell-input ${leafInputClass(leaf)}`"
                :inputmode="leaf.kind === 'buoy' ? 'text' : undefined"
                :value="cell.getByKey(leafCk(leaf, rd.rowKey))"
                @input="onLeafInput(leaf, rd.rowKey, $event)"
                @blur="onLeafBlur(leaf, rd.rowKey, $event)"
                @keydown="gridNavKeyDown"
              />
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
