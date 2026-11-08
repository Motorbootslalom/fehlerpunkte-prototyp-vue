<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue'
import { getBogenTexte } from '../config/active'
import { abstaende, abstandText, punkteText, type GesamtListe, type LaufZeile } from '../lib/ergebnis'
import { ergebnisAbstand } from '../state/laufzettel'
import { fitCells, standUnterLetztenSpalten } from '../lib/fitText'
import { formatClock } from '../lib/time'
import ErgebnisKopf from './ErgebnisKopf.vue'

// Gesamtliste einer Klasse (A4 quer): alle Läufe, der gestrichene durchgestrichen, dazu die Knoten.
const props = defineProps<{ liste: GesamtListe; eventName: string; stand: string }>()

const texte = getBogenTexte()
const zeitText = (l: LaufZeile) => (l.zeit === null ? '' : formatClock(l.zeit))
const abstand = computed(() => (ergebnisAbstand.value ? abstaende(props.liste.zeilen, ergebnisAbstand.value) : []))

const seite = ref<HTMLElement | null>(null)
function anpassen() {
  fitCells(seite.value)
  standUnterLetztenSpalten(seite.value)
}
onMounted(anpassen)
onUpdated(anpassen)
</script>

<template>
  <div ref="seite" class="sheet sheet--landscape ergebnis-sheet">
    <table class="erg-table erg-table--gesamt">
      <colgroup>
        <col class="erg-w-platz" />
        <col class="erg-w-nr" />
        <col class="erg-w-name" />
        <col class="erg-w-vorname" />
        <template v-for="l in liste.laeufe" :key="l">
          <col class="erg-w-zeit" />
          <col class="erg-w-strafp" />
          <col class="erg-w-ges" />
          <col class="erg-w-platz" />
        </template>
        <col class="erg-w-ergebnis" />
        <col class="erg-w-knoten" />
        <col class="erg-w-ergebnis" />
        <col v-if="ergebnisAbstand" class="erg-w-abstand" />
      </colgroup>
      <thead>
        <tr>
          <th class="erg-kopf-zelle" :colspan="7 + (ergebnisAbstand ? 1 : 0) + liste.laeufe.length * 4">
            <ErgebnisKopf :klasse="texte.klasse(liste.klasse)" titel="Gesamt" :event-name="eventName" />
          </th>
        </tr>
        <tr class="erg-spaltenkopf">
          <th rowspan="2">Platz</th>
          <th rowspan="2">S-Nr.</th>
          <th rowspan="2">Name</th>
          <th rowspan="2">Vorname</th>
          <th v-for="l in liste.laeufe" :key="l" colspan="4" class="erg-gruppe">{{ texte.lauf(l) }}</th>
          <th rowspan="2" class="erg-gruppe">Ergebnis</th>
          <th rowspan="2">Knoten</th>
          <th rowspan="2">Gesamt</th>
          <th v-if="ergebnisAbstand" rowspan="2">
            Abstand<br /><small>{{ ergebnisAbstand === 'erster' ? 'zum 1. Platz' : 'zum Platz davor' }}</small>
          </th>
        </tr>
        <tr class="erg-unterkopf erg-unterkopf--gesamt">
          <template v-for="l in liste.laeufe" :key="l">
            <th class="erg-gruppe">gef. Zeit</th>
            <th>Strafp.</th>
            <th>Gesamt</th>
            <th>Platz</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(z, i) in liste.zeilen" :key="z.nr" :class="(i + 1) % 5 === 0 ? 'row-shaded' : undefined">
          <td>{{ z.platz }}</td>
          <td>{{ z.nr }}</td>
          <td class="erg-fit">{{ z.name }}</td>
          <td class="erg-fit">{{ z.vorname }}</td>
          <template v-for="(l, li) in z.laeufe" :key="li">
            <td :class="['erg-gruppe', { 'erg-gestrichen': z.gestrichen === liste.laeufe[li] }]">{{ zeitText(l) }}</td>
            <td :class="{ 'erg-gestrichen': z.gestrichen === liste.laeufe[li] }">{{ l.strafpunkte || '' }}</td>
            <td :class="{ 'erg-gestrichen': z.gestrichen === liste.laeufe[li], 'erg-disq': l.disq }">{{ punkteText(l.disq, l.gesamt) }}</td>
            <td>{{ l.platz }}</td>
          </template>
          <td :class="['erg-gruppe', { 'erg-disq': z.disq }]">
            {{ punkteText(z.disq, z.ergebnis) }}
          </td>
          <td>{{ z.knoten || '' }}</td>
          <td :class="{ 'erg-disq': z.disq }">{{ punkteText(z.disq, z.gesamt) }}</td>
          <td v-if="ergebnisAbstand">{{ abstandText(abstand[i]) }}</td>
        </tr>
      </tbody>
    </table>
    <div class="erg-stand">{{ stand }}</div>
  </div>
</template>
