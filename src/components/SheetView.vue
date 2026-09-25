<script setup lang="ts">
import { computed } from 'vue'
import { getSheetDef } from '../config/active'
import { pageChunks } from '../lib/paging'
import { useStore } from '../state/store'
import type { Bogen } from '../types'
import SheetPage from './SheetPage.vue'

// Rendert einen Bogen. Bei gesetzter „Zeilen pro Seite" (state.rowsPerPage)
// werden die Startnummern auf mehrere A4-Seiten aufgeteilt; jede Seite trägt
// Kopf, Spaltenüberschriften, Legende/Bild, Leerzeilen und Unterschrift sowie
// eine mittige „Seite n / X"-Angabe. Ohne Einstellung bleibt es eine
// durchlaufende Tabelle (Browser bricht bei Bedarf selbst um).
const props = defineProps<{ bogen: Bogen }>()
const { state } = useStore()

const def = computed(() => getSheetDef(props.bogen.typeId))

// Startnummern seitenweise aufteilen (Minimum 5 Starter/Seite erzwingt der
// Reducer). rowsPerPage 0 = keine feste Aufteilung → eine durchlaufende Seite;
// splitFrom > 0 = erst ab so vielen Startern aufteilen.
const chunks = computed<string[][]>(() =>
  pageChunks(state.numbers[props.bogen.klasse] ?? [], state.rowsPerPage, state.splitFrom),
)
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
  />
</template>
