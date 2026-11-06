<script setup lang="ts">
import { computed } from 'vue'
import { getAufbau, getDisziplin, getRegelwerk } from '../config/active'
import { laufSchluessel } from '../lib/eingaben'
import { gesamtSchluessel, klassenErgebnis } from '../lib/ergebnis'
import { ergebnisKlasse, showGesamtliste } from '../state/laufzettel'
import { useStore } from '../state/store'
import type { ClassId } from '../types'
import ErgebnisGesamtSeite from './ErgebnisGesamtSeite.vue'
import ErgebnisLaufSeite from './ErgebnisLaufSeite.vue'

// Je Klasse: jeder Lauf nach Startnummer und nach Platz, auf Wunsch zum Schluss die Gesamtliste.
const { state } = useStore()

const klassen = computed(() =>
  (getRegelwerk().klassen as ClassId[]).filter((k) => !ergebnisKlasse.value || k === ergebnisKlasse.value),
)
const ergebnisse = computed(() => klassen.value.flatMap((k) => klassenErgebnis(state, k) ?? []))
const disziplin = computed(() => getAufbau(state.aufbau).disziplin)
const disziplinName = computed(() => getDisziplin(disziplin.value).name)

/** Wann sich die Liste zuletzt geändert hat. */
function standVon(schluessel: string): string {
  const zeit = state.listenStand[schluessel]?.zeit
  if (zeit === undefined) return ''
  return new Date(zeit)
    .toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .replace(',', '')
}
</script>

<template>
  <p v-if="ergebnisse.length === 0" class="empty">Noch keine Eingaben für die Ergebnislisten ({{ disziplinName }}).</p>
  <template v-for="e in ergebnisse" :key="e.klasse">
    <template v-for="l in e.laeufe" :key="l.lauf">
      <ErgebnisLaufSeite
        :klasse="l.klasse"
        :lauf="l.lauf"
        :gruppen="l.gruppen"
        :zeilen="l.nachNummer"
        :event-name="state.eventName"
        :stand="standVon(laufSchluessel(disziplin, l.klasse, l.lauf))"
      />
      <ErgebnisLaufSeite
        :klasse="l.klasse"
        :lauf="l.lauf"
        :gruppen="l.gruppen"
        :zeilen="l.nachPlatz"
        :event-name="state.eventName"
        :stand="standVon(laufSchluessel(disziplin, l.klasse, l.lauf))"
      />
    </template>
    <ErgebnisGesamtSeite
      v-if="showGesamtliste"
      :liste="e.gesamt"
      :event-name="state.eventName"
      :stand="standVon(gesamtSchluessel(disziplin, e.klasse))"
    />
  </template>
</template>
