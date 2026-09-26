<script setup lang="ts">
import { computed } from 'vue'
import { getAufbau, getSheetDef } from './config/active'
import { buildLaufzettel } from './lib/laufzettel'
import { pageCounts, showLaufzettel } from './state/laufzettel'
import { useStore } from './state/store'
import ControlPanel from './components/ControlPanel.vue'
import LaufzettelPage from './components/LaufzettelPage.vue'
import SheetView from './components/SheetView.vue'

const { state } = useStore()

// Laufzettel je Klasse/Lauf - Seitenzahlen aus den gerenderten Bögen.
const laufzettel = computed(() =>
  buildLaufzettel(
    state.boegen,
    getAufbau(state.aufbau).order,
    (t) => getSheetDef(t).title,
    (id) => pageCounts[id] ?? 1,
  ),
)
</script>

<template>
  <div class="app">
    <ControlPanel />
    <main class="sheets">
      <p v-if="state.boegen.length === 0" class="empty">
        Keine Bögen ausgewählt - links einen Bogen hinzufügen.
      </p>
      <template v-else>
        <!-- Laufzettel vor den Bögen; gedruckt nur über „Nur Laufzettel drucken“. -->
        <section v-if="showLaufzettel" class="laufzettel-stack">
          <LaufzettelPage
            v-for="z in laufzettel"
            :key="`${z.klasse}:${z.lauf}`"
            :zettel="z"
            :event-name="state.eventName"
          />
        </section>
        <SheetView v-for="b in state.boegen" :key="b.id" :bogen="b" />
      </template>
    </main>
  </div>
</template>
