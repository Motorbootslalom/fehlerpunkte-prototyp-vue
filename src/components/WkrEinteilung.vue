<script setup lang="ts">
import { computed } from 'vue'
import { aufbauOrder, getAufbau, getRegelwerk, getSheetDef, positionAllowsClass } from '../config/active'
import { klasseWechseln, parcoursVon, setzeName } from '../lib/einteilung'
import { positionButtonLabels } from '../lib/quickpick'
import { konfigStand } from '../state/konfig'
import { useStore } from '../state/store'
import type { ClassId, ParcoursNr } from '../types'

// WKR-Einteilung (KONZEPT-NAMEN-FREIHAND.md §1): Namen je Liste des gewählten Aufbaus, mit
// zwei Parcours je Parcours. Wirkt sofort auf die Bögen darunter; ein Name direkt auf einem
// Bogen geht vor.
const emit = defineEmits<{ schliessen: [] }>()
const { state, dispatch } = useStore()

const einteilung = computed(() => state.einteilung)
const klassen = computed(() => (state.regelwerk, getRegelwerk().klassen as ClassId[]))
const parcoursListe = computed<ParcoursNr[]>(() => (einteilung.value.zweiParcours ? [1, 2] : [1]))
// Die Listen des Aufbaus, darunter die weiteren aus der Schnellauswahl (Knoten …). Die
// Konfiguration ist nicht reaktiv: konfigStand, Regelwerk und Sprache zeigen Änderungen an.
const listen = computed(() => {
  void [konfigStand.value, state.regelwerk, state.sprache]
  const aufbau = aufbauOrder(state.aufbau, state.tor5MitParcours)
  const weitere = getAufbau(state.aufbau).zusatz
  // Gleiche Titel (z. B. „Tor 1 / 3 / 5“ mit und ohne Start/Ziel) mit dem Namen aus dem Menü.
  const titel = positionButtonLabels(
    [...aufbau, ...weitere].map(getSheetDef).map((d) => ({ ...d, title: d.titelDe })),
  )
  const zeile = (id: string) => ({ id, titel: titel[id] })
  return { aufbau: aufbau.map(zeile), weitere: weitere.map(zeile) }
})

function klassenAuf(p: ParcoursNr): ClassId[] {
  return klassen.value.filter((k) => parcoursVon(einteilung.value, k) === p)
}

/** Hat eine Klasse dieses Parcours die Liste (z. B. MüB erst ab Klasse 4)? */
function gilt(typeId: string, p: ParcoursNr): boolean {
  return klassenAuf(p).some((k) => positionAllowsClass(typeId, k))
}

function nameSetzen(p: ParcoursNr, typeId: string, name: string) {
  dispatch({ type: 'SET_EINTEILUNG', einteilung: setzeName(einteilung.value, p, typeId, name) })
}

function zweiParcoursSetzen(an: boolean) {
  dispatch({ type: 'SET_EINTEILUNG', einteilung: { ...einteilung.value, zweiParcours: an } })
}

function wechseln(k: ClassId) {
  dispatch({ type: 'SET_EINTEILUNG', einteilung: klasseWechseln(einteilung.value, k) })
}
</script>

<template>
  <section class="assistent einteilung">
    <header class="assistent-kopf">
      <h2>WKR-Einteilung</h2>
      <p class="assistent-hilfe">
        Wer an welcher Liste sitzt, für alle Klassen und Läufe. Die Namen stehen sofort auf den Bögen
        darunter (am Bildschirm blau). Ein Name, der direkt auf einem Bogen steht, gilt nur dort und geht
        vor, etwa für eine Vertretung. Die Namen bleiben in diesem Browser und stehen nicht im
        Einstellungs-Link.
      </p>
    </header>

    <div class="assistent-felder">
      <label class="einteilung-haken">
        <input
          type="checkbox"
          :checked="einteilung.zweiParcours"
          @change="zweiParcoursSetzen(($event.target as HTMLInputElement).checked)"
        />
        Zwei Parcours: Die Klassen sind aufgeteilt, jeder Parcours hat eigene WKR
      </label>
    </div>

    <div v-if="einteilung.zweiParcours" class="einteilung-klassen">
      <div v-for="p in parcoursListe" :key="p" class="einteilung-parcours">
        <span>Parcours {{ p }}</span>
        <button
          v-for="k in klassenAuf(p)"
          :key="k"
          class="einteilung-klasse"
          :title="`Klasse ${k} auf Parcours ${p === 1 ? 2 : 1} schieben`"
          @click="wechseln(k)"
        >
          {{ k }}
        </button>
        <em v-if="klassenAuf(p).length === 0">keine Klasse</em>
      </div>
      <p class="assistent-hinweis">Ein Klick auf eine Klasse schiebt sie auf den anderen Parcours.</p>
    </div>

    <div class="assistent-tabelle-rahmen">
      <table class="assistent-tabelle einteilung-tabelle">
        <thead>
          <tr>
            <th class="zeilenkopf">Liste</th>
            <th v-for="p in parcoursListe" :key="p">{{ einteilung.zweiParcours ? `Parcours ${p}` : 'Name' }}</th>
          </tr>
        </thead>
        <tbody v-for="gruppe in (['aufbau', 'weitere'] as const)" :key="gruppe">
          <tr v-if="gruppe === 'weitere' && listen.weitere.length > 0" class="einteilung-gruppe">
            <th :colspan="parcoursListe.length + 1">Weitere Listen aus der Schnellauswahl</th>
          </tr>
          <tr v-for="l in listen[gruppe]" :key="l.id">
            <th class="zeilenkopf">{{ l.titel }}</th>
            <td v-for="p in parcoursListe" :key="p">
              <input
                v-if="gilt(l.id, p)"
                :value="einteilung.namen[p][l.id] ?? ''"
                placeholder="Name"
                @input="nameSetzen(p, l.id, ($event.target as HTMLInputElement).value)"
              />
              <span v-else class="einteilung-entfaellt" title="Keine Klasse dieses Parcours hat diese Liste">–</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="assistent-fuss">
      <button class="speichern" @click="emit('schliessen')">Fertig</button>
    </footer>
  </section>
</template>
