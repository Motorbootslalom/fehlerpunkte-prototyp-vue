<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue'
import { getBogenTexte } from '../config/active'
import { abstaende, abstandText, punkteText, type ErgebnisGruppe, type LaufZeile } from '../lib/ergebnis'
import { ergebnisAbstand } from '../state/laufzettel'
import { fitCells, standUnterLetztenSpalten } from '../lib/fitText'
import { formatClock, formatSeconds } from '../lib/time'
import ErgebnisKopf from './ErgebnisKopf.vue'

// Ergebnisliste eines Laufs (A4 quer): je Starter die Punkte an jeder Stelle des Fahrwegs.
const props = defineProps<{
  klasse: string
  lauf: number
  gruppen: ErgebnisGruppe[]
  zeilen: LaufZeile[]
  eventName: string
  stand: string
}>()

const texte = getBogenTexte()
const zweizeilig = computed(() => props.gruppen.some((g) => g.mitUnter))
// Platz, S-Nr., Name, Vorname, Zeit, Punkte + Fahrweg + disq., ges. Punkte, [Abstand,] Fehler-Schlüssel
const spaltenZahl = computed(
  () => 9 + (ergebnisAbstand.value ? 1 : 0) + props.gruppen.reduce((n, g) => n + g.blaetter.length, 0),
)
// Der Abstand hängt nur von den Punkten ab, nicht von der Reihenfolge der Liste.
const abstand = computed(() => (ergebnisAbstand.value ? abstaende(props.zeilen, ergebnisAbstand.value) : []))

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
    <table class="erg-table">
      <colgroup>
        <col class="erg-w-platz" />
        <col class="erg-w-nr" />
        <col class="erg-w-name" />
        <col class="erg-w-vorname" />
        <col class="erg-w-zeit" />
        <col class="erg-w-punkte" />
        <template v-for="(g, gi) in gruppen" :key="gi">
          <col v-for="b in g.blaetter" :key="b.label" :class="g.mitUnter ? undefined : 'erg-w-spalte'" />
        </template>
        <col class="erg-w-disq" />
        <col class="erg-w-ges" />
        <col v-if="ergebnisAbstand" class="erg-w-abstand" />
        <col class="erg-w-schluessel" />
      </colgroup>
      <thead>
        <tr>
          <th class="erg-kopf-zelle" :colspan="spaltenZahl">
            <ErgebnisKopf :klasse="texte.klasse(klasse)" :titel="texte.lauf(lauf)" :event-name="eventName" />
          </th>
        </tr>
        <tr class="erg-spaltenkopf">
          <th :rowspan="zweizeilig ? 2 : 1">Platz</th>
          <th :rowspan="zweizeilig ? 2 : 1">S-Nr.</th>
          <th :rowspan="zweizeilig ? 2 : 1">Name</th>
          <th :rowspan="zweizeilig ? 2 : 1">Vorname</th>
          <th :rowspan="zweizeilig ? 2 : 1">Zeit</th>
          <th :rowspan="zweizeilig ? 2 : 1">Punkte</th>
          <template v-for="(g, gi) in gruppen" :key="gi">
            <th v-if="g.mitUnter" :colspan="g.blaetter.length" class="erg-gruppe">{{ g.label }}</th>
            <th v-else :rowspan="zweizeilig ? 2 : 1" class="erg-gruppe">{{ g.label }}</th>
          </template>
          <th :rowspan="zweizeilig ? 2 : 1" class="erg-gruppe">disq.</th>
          <th :rowspan="zweizeilig ? 2 : 1">ges. Punkte</th>
          <th v-if="ergebnisAbstand" :rowspan="zweizeilig ? 2 : 1">
            Abstand<br /><small>{{ ergebnisAbstand === 'erster' ? 'zum 1. Platz' : 'zum Platz davor' }}</small>
          </th>
          <th :rowspan="zweizeilig ? 2 : 1">Fehler-Schlüssel</th>
        </tr>
        <tr v-if="zweizeilig" class="erg-unterkopf">
          <template v-for="(g, gi) in gruppen" :key="gi">
            <template v-if="g.mitUnter">
              <th v-for="(b, bi) in g.blaetter" :key="bi" :class="bi === 0 ? 'erg-gruppe' : undefined">{{ b.label }}</th>
            </template>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(z, i) in zeilen" :key="z.nr" :class="(i + 1) % 5 === 0 ? 'row-shaded' : undefined">
          <td>{{ z.platz }}</td>
          <td>{{ z.nr }}</td>
          <td class="erg-fit">{{ z.name }}</td>
          <td class="erg-fit">{{ z.vorname }}</td>
          <td>{{ z.zeit === null ? '' : formatClock(z.zeit) }}</td>
          <td>{{ z.zeit === null ? '' : formatSeconds(z.zeit) }}</td>
          <template v-for="(g, gi) in gruppen" :key="gi">
            <td
              v-for="(_, bi) in g.blaetter"
              :key="bi"
              :class="['erg-fit', { 'erg-gruppe': bi === 0 }]"
            >
              {{ z.zellen[gruppen.slice(0, gi).reduce((n, x) => n + x.blaetter.length, 0) + bi] }}
            </td>
          </template>
          <td class="erg-gruppe">{{ z.disq ? 'x' : '' }}</td>
          <td :class="{ 'erg-disq': z.disq }">{{ punkteText(z.disq, z.gesamt) }}</td>
          <td v-if="ergebnisAbstand">{{ abstandText(abstand[i]) }}</td>
          <td class="erg-fit">{{ z.schluessel }}</td>
        </tr>
      </tbody>
    </table>
    <div class="erg-stand">{{ stand }}</div>
  </div>
</template>
