<script setup lang="ts">
import { computed } from 'vue'
import type { SheetDef } from '../types'

// Fußbereich eines Bogens: Fehlertabelle, Hinweise und Disqualifikations-Codes.
const props = defineProps<{ def: SheetDef }>()

const hasGroups = computed(() => !!props.def.errorGroups && props.def.errorGroups.length > 0)

// Für die mehrspaltige Darstellung (z. B. Steg Ablegen | Anlegen): längster
// Block bestimmt die Zeilenzahl, kürzere werden mit Leerzeilen aufgefüllt.
const maxGroupRows = computed(() =>
  hasGroups.value ? Math.max(...props.def.errorGroups!.map((g) => g.rows.length)) : 0,
)
const groupRowIndices = computed(() =>
  Array.from({ length: maxGroupRows.value }, (_, i) => i),
)
</script>

<template>
  <div class="legend">
    <!-- Mehrere Fehlerblöcke nebeneinander (getrennte Kataloge). -->
    <div v-if="hasGroups" class="legend-block legend-fehler">
      <table class="legend-errors legend-grouped">
        <!-- Feste Breiten: Alle Blöcke sind gleich breit, egal wie lang ihre Texte sind. -->
        <colgroup>
          <template v-for="nr in def.errorGroups?.length ?? 0" :key="`s${nr}`">
            <col v-if="nr > 1" class="lc-col-buffer" />
            <col class="lc-col-code" />
            <col />
            <col class="lc-col-pts" />
          </template>
        </colgroup>
        <thead>
          <tr>
            <template v-for="(g, gi) in def.errorGroups" :key="`h${gi}`">
              <th v-if="gi > 0" class="lc-buffer" aria-hidden="true"></th>
              <th class="lc-grouptitle" :colspan="3">{{ g.title ?? 'Fehler:' }}</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ri in groupRowIndices" :key="`r${ri}`">
            <template v-for="(g, gi) in def.errorGroups" :key="`c${gi}`">
              <td v-if="gi > 0" class="lc-buffer" aria-hidden="true"></td>
              <td class="lc-code">{{ g.rows[ri]?.code ?? '' }}</td>
              <td class="lc-text">{{ g.rows[ri]?.text ?? '' }}</td>
              <td class="lc-pts">{{ g.rows[ri] ? g.rows[ri].punkte : '' }}</td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Einzelner Fehler-Katalog. -->
    <div v-else-if="def.errorTable" class="legend-block legend-fehler">
      <div class="legend-title">{{ def.errorTableTitle ?? 'Fehler:' }}</div>
      <table class="legend-errors">
        <tbody>
          <tr v-for="e in def.errorTable" :key="e.code">
            <td class="lc-code">{{ e.code }}</td>
            <td class="lc-text">{{ e.text }}</td>
            <td class="lc-pts">{{ e.punkte }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="def.legendNoteSpalten" class="legend-note legend-note--2">
      <div v-for="(spalte, i) in def.legendNoteSpalten" :key="i">{{ spalte }}</div>
    </div>
    <div v-else-if="def.legendNote" class="legend-note">{{ def.legendNote }}</div>

    <div v-if="def.disqTable && def.disqTable.length > 0" class="legend-block legend-disqblock">
      <div class="legend-title">{{ def.disqTableTitle ?? 'Disqualifikation:' }}</div>
      <table :class="['legend-disq', { 'legend-disq--2': def.disqZweispaltig }]">
        <tbody>
          <tr v-for="d in def.disqTable" :key="d.code">
            <td class="lc-code">{{ d.code }}</td>
            <td class="lc-text">{{ d.text }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
