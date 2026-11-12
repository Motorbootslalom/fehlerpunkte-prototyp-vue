<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Blick } from '../config/schema'
import {
  AUFGABEN_FELDER,
  BILD_BOJEN,
  BLICKE,
  bojenAufLinie,
  feldName,
  feldUmschalten,
  spaltenFarbe,
  zeitnahmeId,
  ZEITNAHMEN,
  zuordnen,
  type Befund,
  type Entwurf,
  type Punkt,
  type Spalte,
} from '../lib/assistent'
import { ohneRahmen } from '../lib/parcoursbild'

// Zuordnen im Parcoursbild (KONZEPT-NAMEN-FREIHAND.md §2): Eine Freihandlinie um oder über
// Bojen gibt sie der gewählten Position, ein Klick auf eine Boje schaltet sie an oder aus.
// Dasselbe Datenmodell wie die Tabelle: Beide ändern den Entwurf.
const props = defineProps<{ entwurf: Entwurf; befund: Befund; bild: string }>()
const emit = defineEmits<{ 'update:entwurf': [Entwurf]; spalteDazu: []; spalteWeg: [string] }>()

/** Abstand in Bildeinheiten (Bild 853 breit), in dem eine Linie eine Boje noch trifft. */
const TOLERANZ = 14
/** Kürzer als das ist keine Linie, sondern ein Klick. */
const KLICK = 6

// ---- Gewählte Position -------------------------------------------------------------------
// Zuerst eine Position, die Bojen beobachten kann: nicht die reine Zeitliste.
const aktiv = ref((props.entwurf.spalten.find((s) => !s.zeiten) ?? props.entwurf.spalten[0])?.id ?? '')
const aktiveSpalte = computed(() => props.entwurf.spalten.find((s) => s.id === aktiv.value))
watch(
  () => props.entwurf.spalten.map((s) => s.id),
  (neu, alt) => {
    // Eine neue Position gleich wählen; eine entfernte durch die erste ersetzen.
    const dazu = neu.find((id) => !alt?.includes(id))
    if (dazu) aktiv.value = dazu
    else if (!neu.includes(aktiv.value)) aktiv.value = neu[0] ?? ''
  },
)
const farbe = (spalte: string) => spaltenFarbe(props.entwurf, spalte)

// ---- Das Bild: eingebettet, damit die Bojen über ihre IDs erreichbar sind -----------------
const rahmen = ref<HTMLDivElement>()
const ueberlage = ref<SVGSVGElement>()
const svg = ref('')
const masse = ref({ w: 853, h: 361 })
const mitten = ref<Record<string, Punkt>>({})
const geladen = ref(false)

/** Quellbild ohne Rahmen, skalierbar (viewBox) und ohne eigene Maus-Ereignisse. */
function vorbereiten(text: string): string {
  const doc = new DOMParser().parseFromString(ohneRahmen(text), 'image/svg+xml')
  const el = doc.documentElement
  if (el.nodeName !== 'svg') return ''
  const w = parseFloat(el.getAttribute('width') ?? '') || 853
  const h = parseFloat(el.getAttribute('height') ?? '') || 361
  if (!el.getAttribute('viewBox')) el.setAttribute('viewBox', `0 0 ${w} ${h}`)
  masse.value = { w, h }
  el.setAttribute('width', '100%')
  el.removeAttribute('height')
  el.removeAttribute('id')
  el.setAttribute('class', 'zib-parcours')
  return new XMLSerializer().serializeToString(el)
}

/** Mittelpunkte der Bojen in Koordinaten der Überlage; fehlt eine im Bild, bleibt sie weg. */
function messen() {
  const r = rahmen.value
  const ctm = ueberlage.value?.getScreenCTM()
  if (!r || !ctm) return
  const inv = ctm.inverse()
  const neu: Record<string, Punkt> = {}
  for (const id of BILD_BOJEN) {
    const el = r.querySelector(`.zib-parcours [id="${id}"]`)
    // Speedbojen sind Gruppen mit Fähnchen: gemessen wird nur die Tonne selbst.
    const tonne = el?.tagName === 'g' ? (el.querySelector(':scope > path, :scope > circle, :scope > ellipse') ?? el) : el
    const box = tonne?.getBoundingClientRect()
    if (!box || (box.width === 0 && box.height === 0)) continue
    const p = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2).matrixTransform(inv)
    neu[id] = { x: p.x, y: p.y }
  }
  mitten.value = neu
  geladen.value = true
}

let abgebrochen = false
watch(
  () => props.bild,
  async (url) => {
    geladen.value = false
    try {
      const res = await fetch(url)
      const text = res.ok ? await res.text() : ''
      if (abgebrochen || url !== props.bild) return
      svg.value = text ? vorbereiten(text) : ''
    } catch {
      svg.value = ''
    }
    await nextTick()
    requestAnimationFrame(messen)
  },
  { immediate: true },
)
// Ändert sich die Breite, bleiben die Bildkoordinaten gleich; erst sichtbar gemessen stimmt alles.
let beobachter: ResizeObserver | undefined
onMounted(() => {
  beobachter = new ResizeObserver(() => {
    if (svg.value && Object.keys(mitten.value).length === 0) messen()
  })
  if (rahmen.value) beobachter.observe(rahmen.value)
})
onBeforeUnmount(() => {
  abgebrochen = true
  beobachter?.disconnect()
})

const fehlenImBild = computed(() => (geladen.value ? BILD_BOJEN.filter((f) => !mitten.value[f]) : []))

// ---- Ändern, mit Rückgängig --------------------------------------------------------------
const verlauf = ref<Array<Entwurf['zuordnung']>>([])

function aendern(neu: Entwurf) {
  if (neu === props.entwurf) return
  verlauf.value = [...verlauf.value.slice(-49), props.entwurf.zuordnung]
  emit('update:entwurf', neu)
}

function rueckgaengig() {
  const vorher = verlauf.value.at(-1)
  if (!vorher) return
  verlauf.value = verlauf.value.slice(0, -1)
  emit('update:entwurf', { ...props.entwurf, zuordnung: vorher })
}

function umschalten(feld: string) {
  if (aktiv.value) aendern(feldUmschalten(props.entwurf, feld, aktiv.value))
}

// ---- Zeichnen ----------------------------------------------------------------------------
const linie = ref<Punkt[]>([])
const letzte = ref<Punkt[]>([])
let zeichnet = false
let ausblenden: ReturnType<typeof setTimeout> | undefined

function punkt(e: PointerEvent): Punkt | undefined {
  const ctm = ueberlage.value?.getScreenCTM()
  if (!ctm) return undefined
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}

function runter(e: PointerEvent) {
  const p = punkt(e)
  if (!p || !aktiv.value || e.button !== 0) return
  ueberlage.value?.setPointerCapture(e.pointerId)
  zeichnet = true
  linie.value = [p]
}

function bewegen(e: PointerEvent) {
  if (!zeichnet) return
  const p = punkt(e)
  const vorher = linie.value.at(-1)
  if (p && vorher && Math.hypot(p.x - vorher.x, p.y - vorher.y) >= 2) linie.value = [...linie.value, p]
}

function laenge(l: Punkt[]): number {
  let n = 0
  for (let i = 1; i < l.length; i++) n += Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y)
  return n
}

function hoch() {
  if (!zeichnet) return
  zeichnet = false
  const l = linie.value
  linie.value = []
  if (laenge(l) < KLICK) {
    // Ein Klick: die nächste Boje in Reichweite an- oder abschalten.
    const p = l[0]
    const naechste = Object.entries(mitten.value)
      .map(([id, m]) => ({ id, d: Math.hypot(m.x - p.x, m.y - p.y) }))
      .filter((x) => x.d <= TOLERANZ + 4)
      .sort((a, b) => a.d - b.d)[0]
    if (naechste) umschalten(naechste.id)
    return
  }
  aendern(zuordnen(props.entwurf, bojenAufLinie(mitten.value, l, TOLERANZ), aktiv.value))
  letzte.value = l
  clearTimeout(ausblenden)
  ausblenden = setTimeout(() => (letzte.value = []), 900)
}
onBeforeUnmount(() => clearTimeout(ausblenden))

const pfad = (l: Punkt[]) => l.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

// ---- Markierungen an den Bojen -----------------------------------------------------------
const marken = computed(() => {
  const ids = new Set(props.entwurf.spalten.map((s) => s.id))
  return Object.entries(mitten.value).map(([feld, m]) => {
    const spalten = (props.entwurf.zuordnung[feld] ?? []).filter((s) => ids.has(s))
    const titel = spalten.map((s) => props.entwurf.spalten.find((x) => x.id === s)?.titel || 'Position')
    return {
      feld,
      m,
      spalten,
      fehlt: props.befund.fehlt.includes(feld),
      doppelt: props.befund.doppelt.includes(feld),
      aktiv: spalten.includes(aktiv.value),
      tipp: `${feldName(feld)}: ${titel.length > 0 ? titel.join(', ') : 'noch keine Position'}`,
    }
  })
})

const beobachtet = computed(() =>
  BILD_BOJEN.filter((f) => props.entwurf.zuordnung[f]?.includes(aktiv.value)).map(feldName),
)

// ---- Einstellungen der gewählten Position ------------------------------------------------
function spalteAendern(f: (s: Spalte) => Spalte) {
  emit('update:entwurf', { ...props.entwurf, spalten: props.entwurf.spalten.map((s) => (s.id === aktiv.value ? f(s) : s)) })
}

function titelSetzen(titel: string) {
  spalteAendern((s) => ({ ...s, titel }))
}

function blickSetzen(blick: string) {
  spalteAendern(({ blick: _alt, ...s }) => (blick ? { ...s, blick: blick as Blick } : s))
}

function zeitnahmeSetzen(id: string) {
  const z = ZEITNAHMEN.find((x) => x.id === id)
  spalteAendern(({ zeiten: _alt, ...s }) => (z?.zeiten ? { ...s, zeiten: [...z.zeiten] } : s))
}

function bildKleinSetzen(an: boolean) {
  spalteAendern(({ bildNeben: _alt, ...s }) => (an ? { ...s, bildNeben: true } : s))
}

const hatAufgabe = (id: string) => !!props.entwurf.zuordnung[id]?.includes(aktiv.value)
</script>

<template>
  <div class="zib">
    <div class="zib-leiste">
      <span class="zib-label">Zeichnen für</span>
      <button
        v-for="s in entwurf.spalten"
        :key="s.id"
        class="zib-spalte"
        :class="{ aktiv: s.id === aktiv, leer: befund.leer.includes(s.id) }"
        :style="{ '--farbe': farbe(s.id) }"
        @click="aktiv = s.id"
      >
        <span class="zib-punkt"></span>{{ s.titel || 'Position' }}
      </button>
      <button @click="emit('spalteDazu')">+ Position</button>
      <button class="zib-zurueck" :disabled="verlauf.length === 0" title="Die letzte Änderung im Bild zurücknehmen" @click="rueckgaengig">
        ↶ Rückgängig
      </button>
    </div>

    <p v-if="entwurf.spalten.length === 0" class="assistent-hinweis">
      Noch keine Position: Mit „+ Position“ eine anlegen, dann ihre Bojen im Bild umkreisen.
    </p>

    <div ref="rahmen" class="zib-bild" :class="{ gesperrt: !aktiv }">
      <!-- eslint-disable-next-line vue/no-v-html -- eigenes Quellbild aus public/parcours -->
      <div class="zib-quelle" v-html="svg"></div>
      <svg
        ref="ueberlage"
        class="zib-ueberlage"
        :viewBox="`0 0 ${masse.w} ${masse.h}`"
        preserveAspectRatio="xMidYMid meet"
        @pointerdown="runter"
        @pointermove="bewegen"
        @pointerup="hoch"
        @pointercancel="hoch"
      >
        <g v-for="k in marken" :key="k.feld" class="zib-marke">
          <title>{{ k.tipp }}</title>
          <circle v-if="k.doppelt" :cx="k.m.x" :cy="k.m.y" r="10" class="zib-doppelt" />
          <circle v-if="k.aktiv" :cx="k.m.x" :cy="k.m.y" r="10" :fill="farbe(aktiv)" fill-opacity="0.3" />
          <circle v-if="k.fehlt" :cx="k.m.x" :cy="k.m.y" r="12" class="zib-fehlt" />
          <circle
            v-for="(s, i) in k.spalten"
            :key="s"
            :cx="k.m.x"
            :cy="k.m.y"
            :r="11 + 4 * i"
            fill="none"
            :stroke="farbe(s)"
            :stroke-width="s === aktiv ? 3.5 : 2.5"
          />
        </g>
        <polygon
          v-if="letzte.length > 2"
          :points="pfad(letzte)"
          class="zib-linie zib-linie-fertig"
          :style="{ '--farbe': farbe(aktiv) }"
        />
        <polyline v-if="linie.length > 1" :points="pfad(linie)" class="zib-linie" :style="{ '--farbe': farbe(aktiv) }" />
      </svg>
    </div>
    <p class="zib-hilfe">
      Linie um die Bojen ziehen oder über sie streichen: Sie gehören dann zur gewählten Position, auch
      wenn sie vorher bei einer anderen waren. Ein Klick auf eine Boje schaltet sie an oder aus. Rot
      umrandet: noch keine Position. Start/Ziel ist links, die rechte Seite der Hinfahrt liegt im Bild
      unten.
    </p>
    <p v-if="fehlenImBild.length > 0 && aktiv" class="zib-hilfe">
      Nicht im Bild:
      <label v-for="f in fehlenImBild" :key="f" class="zib-haken">
        <input type="checkbox" :checked="!!entwurf.zuordnung[f]?.includes(aktiv)" @change="umschalten(f)" />
        {{ feldName(f) }}
      </label>
    </p>

    <div v-if="aktiveSpalte" class="zib-einstellungen" :style="{ '--farbe': farbe(aktiveSpalte.id) }">
      <div class="assistent-felder">
        <label>
          <span>Name der Position</span>
          <input :value="aktiveSpalte.titel" placeholder="Name der Position" @input="titelSetzen(($event.target as HTMLInputElement).value)" />
        </label>
        <label>
          <span>Blick</span>
          <select :value="aktiveSpalte.blick ?? ''" @change="blickSetzen(($event.target as HTMLSelectElement).value)">
            <option v-for="b in BLICKE" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </label>
        <label>
          <span>Zeit</span>
          <select :value="zeitnahmeId(aktiveSpalte.zeiten)" @change="zeitnahmeSetzen(($event.target as HTMLSelectElement).value)">
            <option v-for="z in ZEITNAHMEN" :key="z.id" :value="z.id">{{ z.name }}</option>
          </select>
        </label>
        <fieldset class="assistent-bausteine">
          <span>Aufgaben</span>
          <label v-for="a in AUFGABEN_FELDER" :key="a.id">
            <input type="checkbox" :checked="hatAufgabe(a.id)" @change="umschalten(a.id)" /> {{ a.name }}
          </label>
          <label title="Bild halb breit neben der Legende">
            <input type="checkbox" :checked="!!aktiveSpalte.bildNeben" @change="bildKleinSetzen(($event.target as HTMLInputElement).checked)" /> Bild klein
          </label>
        </fieldset>
        <button class="spalte-weg" title="Position entfernen" @click="emit('spalteWeg', aktiveSpalte.id)">✕ Position entfernen</button>
      </div>
      <p class="zib-hilfe">
        Beobachtet: {{ beobachtet.length > 0 ? beobachtet.join(', ') : 'noch keine Boje' }}
      </p>
    </div>
  </div>
</template>
