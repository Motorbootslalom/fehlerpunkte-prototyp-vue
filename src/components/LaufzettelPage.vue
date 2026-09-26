<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { Laufzettel } from '../lib/laufzettel'

// Ein Laufzettel: A4 quer, in der Mitte auf A5 gefaltet (Falz = gestrichelte
// Linie). Die rechte Hälfte ist nach dem Falten die Vorderseite: am Falz steht
// senkrecht Klasse und Lauf (wie ein Buchrücken), daneben je Druckseite eine
// Checkbox und darunter die Arbeitsschritte der Auswertung. Die linke Hälfte
// bleibt frei.
const props = defineProps<{
  zettel: Laufzettel
  eventName: string
  schritteTitel?: string
  schritte: string[]
}>()

// Passt die Seiten-Liste nicht in den Platz über den Arbeitsschritten, wird sie
// zweispaltig (gemessen - Beschriftungen und Schritte sind frei wählbar).
const listEl = ref<HTMLElement>()
const zweispaltig = ref(false)
async function fit() {
  zweispaltig.value = false
  await nextTick()
  const el = listEl.value
  if (el && el.scrollHeight > el.clientHeight + 1) zweispaltig.value = true
}
onMounted(fit)
watch(() => [props.zettel, props.schritte], fit)
</script>

<template>
  <div class="sheet sheet--landscape laufzettel">
    <div class="lz-body">
      <div class="lz-half lz-back" />
      <div class="lz-half lz-front">
        <div class="lz-spine">
          <span class="lz-klasse">Klasse {{ zettel.klasse }}</span>
          <span class="lz-lauf">{{ zettel.lauf }}. Lauf</span>
        </div>
        <div class="lz-main">
          <p class="lz-title">
            Laufzettel<template v-if="eventName.trim()"> · {{ eventName }}</template>
          </p>
          <ul ref="listEl" :class="['lz-list', 'lz-pages', { 'lz-list--2': zweispaltig }]">
            <li v-for="z in zettel.zeilen" :key="z.key"><span class="lz-box" />{{ z.label }}</li>
          </ul>
          <div v-if="schritte.length > 0" class="lz-steps">
            <p v-if="schritteTitel" class="lz-steps-title">{{ schritteTitel }}</p>
            <ul class="lz-list">
              <li v-for="(s, i) in schritte" :key="i"><span class="lz-box" />{{ s }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
