<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { backNeedsFlip, hasDescription } from '../lib/backside'
import type { Bogen, SheetDef } from '../types'
import CourseImage from './CourseImage.vue'
import Legend from './Legend.vue'

// „Anne-Feature“: Rückseite eines Blatts mit der Beschreibung (Legende +
// Parcoursbild). Sie folgt im Druck auf jede Vorderseite - auch leer, damit
// beim doppelseitigen Druck Vorder- und Rückseiten zusammenbleiben. Der Inhalt
// steht nur in der Blatthälfte, die beim Nach-oben-Klappen sichtbar ist; Hochformat
// wird dafür um 180° gedreht (siehe lib/backside).
const props = defineProps<{ bogen: Bogen; def: SheetDef }>()

const drehung = computed(() => props.def.bildDrehung ?? 0)
// Hochformat-Bild (±90°) neben der Legende, sonst darunter.
const nebeneinander = computed(() => Math.abs(drehung.value) === 90)
const flip = computed(() => backNeedsFlip(props.def.orientation))

// Passt die Beschreibung nicht in die sichtbare Hälfte? Dann Hinweis (nur am
// Bildschirm) - abgeschnitten wird sie im Druck in jedem Fall.
const halfEl = ref<HTMLElement | null>(null)
const zuHoch = ref(false)
function measure() {
  const el = halfEl.value
  if (el && el.clientHeight > 0) zuHoch.value = el.scrollHeight > el.clientHeight + 1
}
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && halfEl.value) {
    resizeObserver = new ResizeObserver(measure)
    for (const child of halfEl.value.children) resizeObserver.observe(child)
  }
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div :class="`sheet sheet--${def.orientation} sheet--back`">
    <p v-if="zuHoch" class="sheet-overflow-note">
      ⚠ Die Beschreibung ist höher als die beim Nach-oben-Klappen sichtbare Blatthälfte und wird im Druck
      abgeschnitten.
    </p>
    <div :class="['back-page', { 'back-page--flip': flip }]">
      <div
        v-if="hasDescription(def)"
        ref="halfEl"
        :class="['back-half', nebeneinander ? 'back-half--side' : 'back-half--stack']"
      >
        <Legend :def="def" />
        <div v-if="def.courseImageDir" class="course">
          <CourseImage :dir="def.courseImageDir" :klasse="bogen.klasse" :drehung="drehung" />
        </div>
      </div>
    </div>
  </div>
</template>
