<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { erzeugtesBild } from '../lib/parcoursbildBrowser'

// Parcoursbild eines Bogens - unter der Tabelle (SheetPage) oder auf der
// Rückseite (SheetBackPage, „Anne-Feature“). Liegt in einer Box `.course`.
// `datei` kommt aus der Kursvariante des Aufbaus (z. B. Klasse5_Moewe), sonst Klasse<k>.
// Mit `erzeugen` gibt es kein vorgebautes Bild: `dir` ist dann der Quellordner, und der
// Browser blendet selbst ab (lib/parcoursbildBrowser).
const props = defineProps<{
  dir: string
  klasse: string
  datei?: string
  drehung?: number
  erzeugen?: { dim: string[]; aus: string[] }
}>()

const base = import.meta.env.BASE_URL
const datei = computed(() => `${base}parcours/${props.dir}/${props.datei ?? `Klasse${props.klasse}`}.svg`)
const erzeugt = ref<string>()
watch(
  [datei, () => props.erzeugen],
  async ([url, vorgabe]) => {
    erzeugt.value = undefined
    if (!vorgabe) return
    try {
      const blob = await erzeugtesBild(url, vorgabe)
      if (url === datei.value) erzeugt.value = blob
    } catch {
      // Ohne Quellbild bleibt die Box leer, wie bei einem fehlenden Bild.
    }
  },
  { immediate: true },
)
const src = computed(() => (props.erzeugen ? erzeugt.value : datei.value))
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
      v-if="src"
      :href="src"
      width="237"
      height="100"
      :transform="drehung === -90 ? 'translate(0 237) rotate(-90)' : 'translate(100 0) rotate(90)'"
      preserveAspectRatio="xMidYMid meet"
    />
  </svg>
  <img
    v-else-if="src"
    :src="src"
    :alt="`Parcours Klasse ${klasse}`"
    :style="drehung === 180 ? { transform: 'rotate(180deg)' } : undefined"
    @error="onImgError"
  />
</template>
