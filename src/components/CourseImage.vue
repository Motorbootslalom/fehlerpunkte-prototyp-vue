<script setup lang="ts">
import { computed } from 'vue'

// Parcoursbild eines Bogens - unter der Tabelle (SheetPage) oder auf der
// Rückseite (SheetBackPage, „Anne-Feature“). Liegt in einer Box `.course`.
const props = defineProps<{ dir: string; klasse: string; drehung?: number }>()

const base = import.meta.env.BASE_URL
const src = computed(() => `${base}parcours/${props.dir}/Klasse${props.klasse}.svg`)
const gedreht = computed(() => Math.abs(props.drehung ?? 0) === 90)

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <!-- Um ±90° gedreht und formatfüllend: Inline-SVG mit preserveAspectRatio
       füllt die (beliebig hohe) Box proportional. -->
  <svg v-if="gedreht" class="course-svg" viewBox="0 0 100 237" preserveAspectRatio="xMidYMid meet">
    <image
      :href="src"
      width="237"
      height="100"
      :transform="drehung === -90 ? 'translate(0 237) rotate(-90)' : 'translate(100 0) rotate(90)'"
      preserveAspectRatio="xMidYMid meet"
    />
  </svg>
  <img
    v-else
    :src="src"
    :alt="`Parcours Klasse ${klasse}`"
    :style="drehung === 180 ? { transform: 'rotate(180deg)' } : undefined"
    @error="onImgError"
  />
</template>
