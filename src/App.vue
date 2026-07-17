<script setup lang="ts">
import { useStore } from './state/store'
import ControlPanel from './components/ControlPanel.vue'
import SheetView from './components/SheetView.vue'

const { state } = useStore()
</script>

<template>
  <div class="app">
    <ControlPanel />
    <main class="sheets">
      <p v-if="state.boegen.length === 0" class="empty">
        Keine Bögen ausgewählt - links einen Bogen hinzufügen.
      </p>
      <template v-else>
        <SheetView v-for="b in state.boegen" :key="b.id" :bogen="b" />
      </template>
    </main>
  </div>
</template>
