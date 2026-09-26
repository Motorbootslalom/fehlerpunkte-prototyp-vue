<script setup lang="ts">
import type { Laufzettel } from '../lib/laufzettel'

// Ein Laufzettel: A4 quer, in der Mitte auf A5 gefaltet (Falz = gestrichelte
// Linie). Die rechte Hälfte ist nach dem Falten die Vorderseite: am Falz steht
// senkrecht Klasse und Lauf (wie ein Buchrücken), daneben je Druckseite eine
// Checkbox. Die linke Hälfte bleibt frei.
defineProps<{ zettel: Laufzettel; eventName: string }>()

/** Ab so vielen Zeilen wird die Liste zweispaltig - einspaltig passen gut 20 aufs Blatt. */
const ZWEISPALTIG_AB = 21
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
          <ul :class="['lz-list', { 'lz-list--2': zettel.zeilen.length >= ZWEISPALTIG_AB }]">
            <li v-for="z in zettel.zeilen" :key="z.key"><span class="lz-box" />{{ z.label }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
