<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { Laufzettel } from '../lib/laufzettel'
import QrTag from './QrTag.vue'

// Ein Laufzettel: A4 quer, in der Mitte auf A5 gefaltet (Falz = gestrichelte
// Linie). Die rechte Hälfte ist nach dem Falten die Vorderseite: am Falz steht
// senkrecht Klasse und Lauf (wie ein Buchrücken), daneben je Druckseite eine
// Checkbox und darunter die Arbeitsschritte der Auswertung. Oben rechts steht der
// QR-Code (Klasse und Lauf, siehe lib/qr). Die linke Hälfte bleibt frei.
const props = defineProps<{
  zettel: Laufzettel
  eventName: string
  /** Inhalt des QR-Codes. */
  qr: string
  schritteTitel?: string
  schritte: string[]
}>()

// Passt die Seiten-Liste nicht in den Platz über den Arbeitsschritten, wird sie
// zweispaltig (gemessen - Beschriftungen und Schritte sind frei wählbar).
const obenEl = ref<HTMLElement>()
const zweispaltig = ref(false)
/** Zeilen in der linken Spalte (nur zweispaltig). */
const links = ref(0)
const spalten = computed(() => [props.zettel.zeilen.slice(0, links.value), props.zettel.zeilen.slice(links.value)])

const unten = (selektor: string) => obenEl.value?.querySelector(selektor)?.getBoundingClientRect().bottom ?? 0

async function fit() {
  zweispaltig.value = false
  await nextTick()
  const el = obenEl.value
  if (!el || el.scrollHeight <= el.clientHeight + 1) return
  // Zweispaltig: Die rechte Spalte beginnt erst unter dem QR-Code, und lange
  // Einträge brechen um. Deshalb gemessen verteilen, sodass die längere Spalte
  // möglichst kurz ist.
  zweispaltig.value = true
  const n = props.zettel.zeilen.length
  let beste = { k: Math.ceil(n / 2), tiefe: Number.POSITIVE_INFINITY }
  for (let k = Math.ceil(n / 2); k <= n; k++) {
    links.value = k
    await nextTick()
    const l = unten('.lz-spalte-links')
    const r = unten('.lz-spalte-rechts')
    if (Math.max(l, r) < beste.tiefe) beste = { k, tiefe: Math.max(l, r) }
    if (r <= l) break // ab hier wird nur noch die linke Spalte länger
  }
  links.value = beste.k
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
          <!-- QR rechts oben; Titel und Seiten-Liste laufen links daran vorbei. -->
          <div ref="obenEl" class="lz-oben">
            <QrTag class="lz-qr" :payload="qr" :size="91" />
            <p class="lz-title">
              Laufzettel<template v-if="eventName.trim()"> · {{ eventName }}</template>
            </p>
            <ul v-if="!zweispaltig" class="lz-list">
              <li v-for="z in zettel.zeilen" :key="z.key"><span class="lz-box" />{{ z.label }}</li>
            </ul>
            <template v-else>
              <ul class="lz-list lz-list--2 lz-spalte-links">
                <li v-for="z in spalten[0]" :key="z.key"><span class="lz-box" />{{ z.label }}</li>
              </ul>
              <ul class="lz-list lz-list--2 lz-spalte-rechts">
                <li v-for="z in spalten[1]" :key="z.key"><span class="lz-box" />{{ z.label }}</li>
              </ul>
            </template>
          </div>
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
