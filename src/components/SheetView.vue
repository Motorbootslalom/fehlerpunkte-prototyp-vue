<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { getSheetDef } from '../config/active'
import { pageChunks, pageHeightMm, rowsThatFit } from '../lib/paging'
import { pageCounts } from '../state/laufzettel'
import { useStore } from '../state/store'
import type { Bogen } from '../types'
import SheetPage from './SheetPage.vue'

// Rendert einen Bogen, bei Bedarf auf mehrere A4-Seiten aufgeteilt; jede Seite
// trägt Kopf, Spaltenüberschriften, Legende/Bild, Leerzeilen und Unterschrift
// sowie eine mittige „Seite n / X"-Angabe. „Zeilen pro Seite" (state.rowsPerPage)
// 0 = automatisch: Die erste Seite misst, wie viele Starter auf ein Blatt
// passen; passt es nicht, wird in 5er-Schritten geteilt (siehe autoPageSize).
// Sonst fest nach so vielen Startern (ggf. erst ab „Teilen ab").
const props = defineProps<{ bogen: Bogen }>()
const { state } = useStore()

const def = computed(() => getSheetDef(props.bogen.typeId))

// Gemessene Höhe von Kopf/Fuß und Zeilenhöhe (von der ersten Seite). Nur echte
// Änderungen übernehmen - Rundungsrauschen soll die Aufteilung nicht hin- und
// herschalten.
const layout = ref<{ fixedPx: number; rowPx: number } | null>(null)
function onLayout(m: { fixedPx: number; rowPx: number }) {
  const cur = layout.value
  if (!cur || Math.abs(cur.fixedPx - m.fixedPx) > 2 || Math.abs(cur.rowPx - m.rowPx) > 0.5) layout.value = m
}

/** Starter je Seite, die neben Kopf/Fuß und den Leerzeilen auf ein Blatt passen (0 = unbekannt). */
const capacity = computed(() => {
  if (!layout.value) return 0
  const fit = rowsThatFit(layout.value.fixedPx, layout.value.rowPx, pageHeightMm(def.value.orientation))
  return Math.max(1, fit - state.emptyRows)
})

// Startnummern seitenweise aufteilen (Minimum 5 Starter/Seite erzwingt der
// Reducer für feste Werte).
const chunks = computed<string[][]>(() =>
  pageChunks(state.numbers[props.bogen.klasse] ?? [], state.rowsPerPage, state.splitFrom, capacity.value),
)

// Seitenzahl für die Laufzettel melden (bogen.id bleibt je Instanz gleich).
watchEffect(() => {
  pageCounts[props.bogen.id] = chunks.value.length
})
onBeforeUnmount(() => {
  delete pageCounts[props.bogen.id]
})
</script>

<template>
  <SheetPage
    v-for="(chunkNums, pi) in chunks"
    :key="`${bogen.id}:${pi}`"
    :bogen="bogen"
    :def="def"
    :chunk-nums="chunkNums"
    :page-index="pi"
    :page-count="chunks.length"
    @layout="onLayout"
  />
</template>
