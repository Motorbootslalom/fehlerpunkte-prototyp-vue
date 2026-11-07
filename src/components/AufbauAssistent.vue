<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  entwurfsLuecken,
  getAufbauten,
  getEigeneAufbauten,
  getKurse,
  getRegelwerk,
  getRohQuelle,
  pruefeEigeneAufbauten,
  vergebeneIds,
} from '../config/active'
import type { Blick, RawAufbau } from '../config/schema'
import {
  ausAufbau,
  befund,
  leererEntwurf,
  namensteil,
  neueId,
  umschalten,
  zeitnahmeId,
  ZEILEN,
  ZEITNAHMEN,
  zuAufbau,
  type Entwurf,
  type Spalte,
  type Zeile,
} from '../lib/assistent'
import { konfigStand } from '../state/konfig'
import BlickErklaerung from './BlickErklaerung.vue'
import { useStore } from '../state/store'
import type { ClassId } from '../types'

// Assistent für eigene Aufbauten (KONZEPT-POSITIONEN.md §7). Der Entwurf läuft als eigener
// Aufbau in der Konfiguration mit: Die Bögen darunter zeigen ihn nach jeder Änderung.
// Gespeichert wird erst mit „Speichern“, „Abbrechen“ stellt den Stand davor wieder her.
const props = defineProps<{ modus: 'neu' | 'bearbeiten' }>()
const emit = defineEmits<{ schliessen: [] }>()
const { state, dispatch } = useStore()

const vorher = { aufbau: state.aufbau, boegen: state.boegen, eigene: getEigeneAufbauten() }
const vergeben = vergebeneIds()
const neuePositionsId = () => neueId('p', vergeben)
const bearbeitet = props.modus === 'bearbeiten' ? vorher.eigene.find((a) => a.id === vorher.aufbau) : undefined
const entwurfsId = bearbeitet?.id ?? neueId('entwurf', vergeben)

const BLICKE: Array<{ id: Blick | ''; name: string }> = [
  { id: '', name: 'ohne Blick' },
  { id: 'hinten', name: 'von hinten' },
  { id: 'vorne', name: 'von vorne' },
  { id: 'rechts', name: 'von rechts' },
  { id: 'links', name: 'von links' },
]

// Vorlagen: alle Aufbauten außer dem Entwurf selbst.
const vorlagen = computed(() => (konfigStand.value, getAufbauten().filter((a) => a.id !== entwurfsId)))
const kurse = getKurse()
const klassen = computed(() => getRegelwerk().klassen as ClassId[])

/** Ein Entwurf aus einer Vorlage ('' = leer); Name und ID bleiben die des Entwurfs. */
function ausVorlage(id: string, ziel: { id: string; name: string }) {
  if (!id) return { entwurf: leererEntwurf(ziel.id, ziel.name), nichtUebernommen: [] }
  const quelle = getRohQuelle()
  const vorlage: RawAufbau | undefined = vorher.eigene.find((a) => a.id === id) ?? quelle.aufbauten?.find((a) => a.id === id)
  if (!vorlage) return { entwurf: leererEntwurf(ziel.id, ziel.name), nichtUebernommen: [] }
  return ausAufbau(vorlage, quelle, ziel, neuePositionsId)
}

const start = bearbeitet
  ? ausAufbau(bearbeitet, getRohQuelle(), { id: bearbeitet.id, name: bearbeitet.name }, neuePositionsId, true)
  : ausVorlage(vorher.aufbau, { id: entwurfsId, name: 'Eigener Aufbau' })
const entwurf = ref<Entwurf>(start.entwurf)
const nichtUebernommen = ref<string[]>(start.nichtUebernommen)
const vorlageId = ref(vorher.aufbau)
const vorschauKlasse = ref<ClassId>('7')
const offen = ref(new Set<string>())
const fehler = ref<string[]>([])

function vorlageWaehlen(id: string) {
  vorlageId.value = id
  const neu = ausVorlage(id, { id: entwurf.value.id, name: entwurf.value.name })
  entwurf.value = neu.entwurf
  nichtUebernommen.value = neu.nichtUebernommen
}

// ---- Vorschau: der Entwurf als eigener Aufbau, die Bögen einer Klasse ------------------
const aufbau = computed(() => zuAufbau(entwurf.value))
let timer: ReturnType<typeof setTimeout> | undefined
function zeigen() {
  const a = aufbau.value
  dispatch({
    type: 'SET_EIGENE_AUFBAUTEN',
    aufbauten: [...vorher.eigene.filter((x) => x.id !== a.id), a],
    aufbau: a.id,
    entwurf: true,
    vorschau: vorschauKlasse.value,
  })
}
watch(
  [aufbau, vorschauKlasse],
  () => {
    clearTimeout(timer)
    timer = setTimeout(zeigen, 200)
  },
  { deep: true },
)
zeigen()
onBeforeUnmount(() => clearTimeout(timer))

// ---- Laufende Prüfung -----------------------------------------------------------------
const markiert = computed(() => befund(entwurf.value))
const luecken = computed(() => (konfigStand.value, entwurfsLuecken(aufbau.value)))

function feldName(f: string): string {
  for (const z of ZEILEN) {
    if (z.id === f) return z.name
    const h = z.haelften?.find((x) => x.id === f)
    if (h) return `${z.name} ${h.name}`
  }
  return f
}

function klassenText(k: string[]): string {
  return k.length === 8 ? 'alle Klassen' : `Kl. ${k.join(', ')}`
}

// ---- Tabelle --------------------------------------------------------------------------
function felder(z: Zeile): string[] {
  return z.haelften ? z.haelften.map((h) => h.id) : [z.id]
}

function symbol(z: Zeile, spalte: string, haelfte?: string): string {
  const fs = haelfte ? [haelfte] : felder(z)
  const n = fs.filter((f) => entwurf.value.zuordnung[f]?.includes(spalte)).length
  return n === 0 ? '' : n === fs.length ? '●' : '◐'
}

function zelleDoppelt(z: Zeile, spalte: string, haelfte?: string): boolean {
  return (haelfte ? [haelfte] : felder(z)).some(
    (f) => markiert.value.doppelt.includes(f) && entwurf.value.zuordnung[f]?.includes(spalte),
  )
}

function zeileFehlt(z: Zeile, haelfte?: string): boolean {
  return (haelfte ? [haelfte] : felder(z)).some((f) => markiert.value.fehlt.includes(f))
}

function klick(z: Zeile, spalte: string, haelfte?: string) {
  entwurf.value = umschalten(entwurf.value, z, spalte, haelfte)
}

function aufklappen(id: string) {
  const neu = new Set(offen.value)
  if (neu.has(id)) neu.delete(id)
  else neu.add(id)
  offen.value = neu
}

function spalteDazu() {
  entwurf.value.spalten.push({ id: neuePositionsId(), titel: `Position ${entwurf.value.spalten.length + 1}` })
}

function spalteWeg(id: string) {
  entwurf.value.spalten = entwurf.value.spalten.filter((s) => s.id !== id)
  for (const f of Object.keys(entwurf.value.zuordnung))
    entwurf.value.zuordnung[f] = entwurf.value.zuordnung[f].filter((s) => s !== id)
}

function blickSetzen(s: Spalte, blick: string) {
  if (blick) s.blick = blick as Blick
  else delete s.blick
}

function zeitnahmeSetzen(s: Spalte, id: string) {
  const z = ZEITNAHMEN.find((x) => x.id === id)
  if (z?.zeiten) s.zeiten = [...z.zeiten]
  else delete s.zeiten
}

// ---- Speichern und Abbrechen ----------------------------------------------------------
function speichern() {
  clearTimeout(timer)
  const a = aufbau.value
  // Ein neuer Aufbau bekommt seine ID erst jetzt, aus dem endgültigen Namen.
  const id = bearbeitet ? a.id : neueId(namensteil(a.name), vergebeneIds())
  const fertig: RawAufbau = { ...a, id }
  const pruefung = pruefeEigeneAufbauten({ aufbauten: [fertig] }, vorher.eigene)
  if (pruefung.fehler.length > 0) {
    fehler.value = pruefung.fehler
    return
  }
  dispatch({ type: 'SET_EIGENE_AUFBAUTEN', aufbauten: [...vorher.eigene.filter((x) => x.id !== id), fertig], aufbau: id })
  emit('schliessen')
}

function abbrechen() {
  clearTimeout(timer)
  dispatch({
    type: 'SET_EIGENE_AUFBAUTEN',
    aufbauten: vorher.eigene,
    aufbau: vorher.aufbau,
    boegen: vorher.boegen,
    entwurf: true,
  })
  emit('schliessen')
}
</script>

<template>
  <section class="assistent">
    <header class="assistent-kopf">
      <h2>{{ modus === 'bearbeiten' ? 'Eigenen Aufbau bearbeiten' : 'Eigenen Aufbau anlegen' }}</h2>
      <p class="assistent-hilfe">
        Je Position eine Spalte. Ein Klick in die Tabelle legt fest, welche Boje oder Aufgabe sie
        beobachtet; ▸ klappt ein Tor in seine beiden Bojen auf. Die Bögen unten zeigen den Entwurf.
      </p>
      <details class="assistent-blick">
        <summary>Was bedeuten die Blickrichtungen?</summary>
        <div class="assistent-blick-inhalt">
          <BlickErklaerung />
          <p>
            Gemeint ist, von wo die Person überwiegend auf den Kurs schaut. Danach richten sich die
            Reihenfolge der Bojen auf der Liste und die Drehung des Bildes, damit die Liste zum
            eigenen Blick passt. Listen ohne Bojen, etwa die Zeitliste oder die Parcoursüberwachung,
            brauchen keinen Blick.
          </p>
        </div>
      </details>
    </header>

    <div class="assistent-felder">
      <label>
        <span>Name</span>
        <input v-model="entwurf.name" placeholder="z. B. Sommercup Oranienburg" />
      </label>
      <label v-if="modus === 'neu'">
        <span>Vorlage</span>
        <select :value="vorlageId" @change="vorlageWaehlen(($event.target as HTMLSelectElement).value)">
          <option value="">leer</option>
          <option v-for="a in vorlagen" :key="a.id" :value="a.id">{{ a.name }}{{ a.eigen ? ' (eigener)' : '' }}</option>
        </select>
      </label>
      <label>
        <span>Kurs</span>
        <select
          :value="entwurf.kurs ?? ''"
          @change="entwurf.kurs = ($event.target as HTMLSelectElement).value || undefined"
        >
          <option value="">Standard</option>
          <option v-for="k in kurse" :key="k.id" :value="k.id">{{ k.name }}</option>
        </select>
      </label>
      <fieldset class="assistent-bausteine">
        <span>Außerdem</span>
        <label><input v-model="entwurf.vorsteg" type="checkbox" /> Vorsteg</label>
        <label><input v-model="entwurf.steg" type="checkbox" /> Steg</label>
        <label><input v-model="entwurf.knoten" type="checkbox" /> Knoten</label>
      </fieldset>
      <label>
        <span>Vorschau</span>
        <select v-model="vorschauKlasse">
          <option v-for="k in klassen" :key="k" :value="k">Klasse {{ k }}</option>
        </select>
      </label>
    </div>
    <p v-if="nichtUebernommen.length > 0" class="assistent-hinweis">
      Aus der Vorlage nicht übernommen (keine Kurzform): {{ nichtUebernommen.join(', ') }}
    </p>

    <div class="assistent-tabelle-rahmen">
      <table class="assistent-tabelle">
        <thead>
          <tr>
            <th class="zeilenkopf">Boje / Aufgabe</th>
            <th v-for="s in entwurf.spalten" :key="s.id" :class="{ leer: markiert.leer.includes(s.id) }">
              <input v-model="s.titel" class="spalte-titel" placeholder="Name der Position" />
              <select :value="s.blick ?? ''" title="Von wo die Person überwiegend schaut: von hinten = hinter Tor 5, von vorne = vom Start/Ziel, rechts/links = Seite auf der Hinfahrt" @change="blickSetzen(s, ($event.target as HTMLSelectElement).value)">
                <option v-for="b in BLICKE" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
              <select :value="zeitnahmeId(s.zeiten)" title="Zeit auf dieser Liste" @change="zeitnahmeSetzen(s, ($event.target as HTMLSelectElement).value)">
                <option v-for="z in ZEITNAHMEN" :key="z.id" :value="z.id">{{ z.name }}</option>
              </select>
              <label class="spalte-option" title="Bild halb breit neben der Legende">
                <input v-model="s.bildNeben" type="checkbox" /> Bild klein
              </label>
              <button class="spalte-weg" title="Position entfernen" @click="spalteWeg(s.id)">✕ entfernen</button>
            </th>
            <th class="spalte-dazu"><button @click="spalteDazu">+ Position</button></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="z in ZEILEN" :key="z.id">
            <tr :class="{ fehlt: zeileFehlt(z) }">
              <th class="zeilenkopf">
                <button v-if="z.haelften" class="aufklappen" @click="aufklappen(z.id)">{{ offen.has(z.id) ? '▾' : '▸' }}</button>
                {{ z.name }}
                <small v-if="z.klassen">{{ z.klassen }}</small>
              </th>
              <td
                v-for="s in entwurf.spalten"
                :key="s.id"
                :class="{ doppelt: zelleDoppelt(z, s.id) }"
                @click="klick(z, s.id)"
              >
                {{ symbol(z, s.id) }}
              </td>
              <td></td>
            </tr>
            <template v-if="z.haelften && offen.has(z.id)">
              <tr v-for="h in z.haelften" :key="h.id" class="haelfte" :class="{ fehlt: zeileFehlt(z, h.id) }">
                <th class="zeilenkopf">{{ h.name }}</th>
                <td
                  v-for="s in entwurf.spalten"
                  :key="s.id"
                  :class="{ doppelt: zelleDoppelt(z, s.id, h.id) }"
                  @click="klick(z, s.id, h.id)"
                >
                  {{ symbol(z, s.id, h.id) }}
                </td>
                <td></td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <div class="assistent-pruefung">
      <div v-if="luecken.length > 0" class="rot">
        Noch nicht beobachtet:
        <ul>
          <li v-for="l in luecken" :key="l.element + l.nurZusammengelegt">{{ l.element }} ({{ klassenText(l.klassen) }})</li>
        </ul>
      </div>
      <div v-if="markiert.doppelt.length > 0" class="gelb">
        Auf mehreren Listen, die sich dann einen Wert teilen:
        {{ markiert.doppelt.map(feldName).join(', ') }}
      </div>
      <div v-if="markiert.leer.length > 0" class="gelb">
        Ohne Boje, Aufgabe und Zeit, entfällt:
        {{ entwurf.spalten.filter((s) => markiert.leer.includes(s.id)).map((s) => s.titel).join(', ') }}
      </div>
      <div v-if="fehler.length > 0" class="rot">
        Nicht gespeichert:
        <ul>
          <li v-for="f in fehler" :key="f">{{ f }}</li>
        </ul>
      </div>
      <p v-if="luecken.length === 0 && markiert.doppelt.length === 0 && markiert.leer.length === 0" class="gruen">
        Jede Boje und Aufgabe steht auf genau einer Liste.
      </p>
    </div>

    <footer class="assistent-fuss">
      <button class="speichern" @click="speichern">Speichern</button>
      <button @click="abbrechen">Abbrechen</button>
    </footer>
  </section>
</template>
