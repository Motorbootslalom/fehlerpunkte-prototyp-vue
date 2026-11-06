<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  aufbauOrder,
  getAufbau,
  getAufbauten,
  getBeschriftungen,
  getRegelwerk,
  getRegelwerke,
  getSheetDef,
  positionAllowsClass,
} from '../config/active'
import { SPRACHEN } from '../config/sprache'
import { beispielwerteErsetzen, type Zeitnahme } from '../lib/beispielwerte'
import { extendNumbers, formatNumbers, parseNumbers, shrinkNumbers } from '../lib/demo'
import { exportSheetsToPdf } from '../lib/exportPdf'
import { exportPdfmake } from '../lib/exportPdfmake'
import { exportJsPdfVector } from '../lib/exportJsPdfVector'
import { laeufeMitEingaben } from '../lib/ergebnis'
import { describeBoegen, exportBaseName, printWithFilename } from '../lib/print'
import {
  LAEUFE,
  allClassesAllPositionsItems,
  classAllPositionsItems,
  completeLaufItems,
  formatClassOrder,
  laufLabel,
  missingClasses,
  parseClassOrder,
  positionAllClassesItems,
  positionButtonLabels,
  withMissingClasses,
  withoutLaufRepeats,
  type QuickLauf,
} from '../lib/quickpick'
import { buildShareUrl } from '../lib/sharelink'
import { formatStarter, parseStarter } from '../lib/starter'
import { ergebnisKlasse, showErgebnisse, showGesamtliste, showLaufzettel, showLegende } from '../state/laufzettel'
import { useStore } from '../state/store'
import type { ClassId, Lauf, SheetTypeId, Sprache } from '../types'

const { state, dispatch } = useStore()

const addClass = ref<ClassId>('3')
const addLauf = ref<Lauf>(1)
const qpLauf = ref<QuickLauf>(1)
const busy = ref(false)
const busyPm = ref(false)
const busyJs = ref(false)
const copied = ref(false)

// Basis-URL der react-pdf-Insel (eigene Seite pdf.html, Vektor-PDF via react-pdf).
const pdfIslandUrl = `${import.meta.env.BASE_URL}pdf.html`
const addTypeRaw = ref<SheetTypeId>('')

// Positionen des gewählten Aufbaus (Setup) - Basis für „Kompletter Lauf“ und
// „Eine Klasse · alle Listen“.
const order = computed(() => aufbauOrder(state.aufbau, state.tor5MitParcours))
// Nur anbieten, wenn der Aufbau Tor 5 und Parcours zusammenlegen kann.
const kannZusammenlegen = computed(() => !!getAufbau(state.aufbau).kombi)
// Wählbar (Menüs, „Eine Position · alle Klassen“): der Aufbau plus alle
// Positionen mit `schnellauswahl: true` aus der YAML.
const menuOrder = computed(() => [...order.value, ...getAufbau(state.aufbau).zusatz])
const buttonLabels = computed(() =>
  positionButtonLabels(menuOrder.value.map(getSheetDef).map((d) => ({ ...d, title: d.titelDe }))),
)
const beschriftungen = computed(() => getBeschriftungen())
const aufbauten = computed(() => getAufbauten())
const regelwerke = getRegelwerke()
// Klassen des gewählten Regelwerks (die aktive Konfiguration ist nicht reaktiv,
// state.regelwerk zeigt den Wechsel an).
const klassen = computed(() => (state.regelwerk, getRegelwerk().klassen as ClassId[]))
// Sprachwahl nur, wenn das Regelwerk Englisch anbietet (z. B. UIM).
const hatEnglisch = computed(() => (state.regelwerk, getRegelwerk().sprachen.includes('en')))
const klassenFolge = computed(() => state.classOrder.filter((c) => klassen.value.includes(c)))
const addKlasse = computed(() => (klassen.value.includes(addClass.value) ? addClass.value : klassen.value[0]))
const addType = computed(() =>
  menuOrder.value.includes(addTypeRaw.value) ? addTypeRaw.value : (menuOrder.value[0] ?? ''),
)

async function copyShareLink() {
  const url = buildShareUrl(state)
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    // Clipboard verweigert (z. B. ohne HTTPS): URL zur manuellen Übernahme zeigen.
    window.prompt('Link kopieren (Strg+C):', url)
  }
}

function bulk(items: { typeId: SheetTypeId; klasse: ClassId; lauf: Lauf }[]) {
  // Nicht passende Klassen je Position auslassen (z. B. MüB erst ab Klasse 4);
  // lauf-unabhängige Listen (Knoten) nur einmal je Klasse.
  dispatch({
    type: 'ADD_BOEGEN_BULK',
    items: withoutLaufRepeats(
      items.filter((it) => positionAllowsClass(it.typeId, it.klasse)),
      (t) => getSheetDef(t).showLauf === false,
      state.boegen,
    ),
  })
}

// Klassen jeweils in der gewählten Klassen-Reihenfolge; „Alle Läufe" = erst
// Lauf 1 komplett, dann Lauf 2 usw.
function completeLauf(l: Lauf) {
  bulk(completeLaufItems(order.value, state.classOrder, l))
}
function positionAllClasses(t: SheetTypeId) {
  bulk(positionAllClassesItems(t, state.classOrder, qpLauf.value))
}
function classAllPositions(c: ClassId) {
  bulk(classAllPositionsItems(c, order.value, qpLauf.value))
}
function allClassesAllPositions() {
  bulk(allClassesAllPositionsItems(state.classOrder, order.value, qpLauf.value))
}

// Aus der Klassen-Reihenfolge entfernte Klassen (↻ hängt sie wieder an).
const fehlendeKlassen = computed(() => missingClasses(state.classOrder).filter((c) => klassen.value.includes(c)))
function restoreClasses() {
  dispatch({ type: 'SET_CLASS_ORDER', classOrder: withMissingClasses(state.classOrder) })
}

function setClassOrder(e: Event) {
  const input = e.target as HTMLInputElement
  const classOrder = parseClassOrder(input.value)
  dispatch({ type: 'SET_CLASS_ORDER', classOrder })
  // Bereinigte Form zurückschreiben - auch wenn sich der Zustand nicht ändert.
  input.value = formatClassOrder(classOrder)
}

// Beschreibung aus der aktuellen Bogen-Auswahl (Position/Klasse/Lauf, nur
// eindeutige Teile) - für den Export-Dateinamen.
const describe = () => describeBoegen(state.boegen, (t) => getSheetDef(t).titelDe)
const namePreview = computed(() => exportBaseName(state.eventName, describe()))
const currentName = () => exportBaseName(state.eventName, describe(), new Date())

// Nur einen Teil drucken: Die Bögen bleiben in der Vorschau, die Druck-CSS blendet
// sie über die body-Klasse aus.
async function printNur(bodyKlasse: string, beschreibung: string) {
  await nextTick()
  // Laufzettel messen nach dem Einblenden, ob sie zweispaltig werden - das
  // Neu-Rendern abwarten, bevor der Druckdialog das Layout einfriert.
  await new Promise((r) => setTimeout(r))
  document.body.classList.add(bodyKlasse)
  const done = () => {
    document.body.classList.remove(bodyKlasse)
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  printWithFilename(exportBaseName(state.eventName, beschreibung, new Date()))
}

function printLaufzettel() {
  showLaufzettel.value = true
  return printNur('print-laufzettel', 'Laufzettel')
}

function printLegende() {
  showLegende.value = true
  return printNur('print-legende', `Legende ${getRegelwerk().label}`)
}

const hatErgebnisse = computed(() =>
  klassen.value.some((k) => (!ergebnisKlasse.value || k === ergebnisKlasse.value) && laeufeMitEingaben(state, k).length > 0),
)

function zeigeGesamtliste(an: boolean) {
  showGesamtliste.value = an
  // Ohne die Ergebnislisten bliebe das Häkchen ohne sichtbare Wirkung.
  if (an) showErgebnisse.value = true
}

function fuegeBeispielwerteEin(zeitnahme: Zeitnahme) {
  if (!beispielwerteErsetzen(state) || confirm('Die angezeigten Bögen enthalten schon Werte. Durch Zufallswerte ersetzen?')) {
    dispatch({ type: 'SET_BEISPIELWERTE', zeitnahme })
  }
}

function printErgebnisse() {
  showErgebnisse.value = true
  const klasse = ergebnisKlasse.value ? ` Klasse ${ergebnisKlasse.value}` : ''
  return printNur('print-ergebnisse', `Ergebnislisten${klasse}`)
}

async function downloadPdf() {
  busy.value = true
  try {
    await exportSheetsToPdf(`${currentName()}.pdf`)
  } finally {
    busy.value = false
  }
}

async function downloadPdfmake() {
  busyPm.value = true
  try {
    await exportPdfmake(`${currentName()}.pdf`, state)
  } finally {
    busyPm.value = false
  }
}

async function downloadJsPdf() {
  busyJs.value = true
  try {
    await exportJsPdfVector(`${currentName()}.pdf`, state)
  } finally {
    busyJs.value = false
  }
}

function resetAll() {
  if (confirm('Alle Eingaben und Einstellungen zurücksetzen?')) {
    dispatch({ type: 'RESET_ALL' })
  }
}

// Version = git describe (Tag/Hash, ggf. -dirty) + Commit-Zeitstempel.
const gitVersion = __GIT_VERSION__
const commitDate = __GIT_COMMIT_DATE__
  ? new Date(__GIT_COMMIT_DATE__).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
  : ''
</script>

<template>
  <aside class="control-panel">
    <h1>Fehlerpunkte-Prototyp</h1>
    <p
      class="cp-version"
      title="Aktive Version (git describe: Tag/Commits/Hash, -dirty bei lokalen Änderungen) und Zeitstempel des letzten Updates"
    >
      Version <code>{{ gitVersion }}</code>
      <template v-if="commitDate"> · {{ commitDate }}</template>
    </p>
    <p class="intro">
      Prototyp der WKR-Eingabemasken (Vue). Eingabe und Ausdruck sind dieselbe Ansicht - so lässt
      sich jede Eintragung direkt kontrollieren. Alle Daten bleiben lokal im Browser.
    </p>

    <section>
      <label class="field">
        <span>Regelwerk</span>
        <select
          :value="state.regelwerk"
          title="Regelwerk mit Version: bestimmt Fehlercodes, Punkte, Disqualifikationen und Klassen"
          @change="dispatch({ type: 'SET_REGELWERK', regelwerk: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="r in regelwerke" :key="r.id" :value="r.id">{{ r.label }}</option>
        </select>
      </label>
      <label v-if="hatEnglisch" class="field" style="margin-top: 8px">
        <span>Sprache der Listen</span>
        <select
          :value="state.sprache"
          title="Sprache von Listen, Fehlertexten und Legende; die Bedienleiste bleibt deutsch"
          @change="dispatch({ type: 'SET_SPRACHE', sprache: ($event.target as HTMLSelectElement).value as Sprache })"
        >
          <option v-for="s in SPRACHEN" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </label>
      <label class="field" style="margin-top: 8px">
        <span>Aufbau (Setup)</span>
        <select
          :value="state.aufbau"
          title="Bei einem Wettkampf genutzter Aufbau; wechseln erzeugt dessen Bögen neu. Die Eingaben bleiben in den entsprechenden Feldern, Parallelslalom hat eigene."
          @change="dispatch({ type: 'SET_AUFBAU', aufbau: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="a in aufbauten" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </label>
      <label
        v-if="kannZusammenlegen"
        class="cp-check"
        style="margin-top: 8px"
        title="Eine Person überwacht die Einfahrt in Tor 5 und den Parcours auf einer Liste; die extra Parcoursliste entfällt"
      >
        <input
          type="checkbox"
          :checked="state.tor5MitParcours"
          @change="dispatch({ type: 'SET_TOR5_MIT_PARCOURS', on: ($event.target as HTMLInputElement).checked })"
        />
        Tor 5 übernimmt die Parcoursüberwachung
      </label>
      <label v-if="beschriftungen.length > 0" class="field" style="margin-top: 8px">
        <span>Bezeichnung der Bojen-Seiten</span>
        <select
          :value="state.beschriftung"
          title="Kürzel der Bojen-Seiten (Rechts/Links, Land/See …) zur Orientierung der WKR - wirkt sofort auf alle Bögen, die Ergebnislisten bleiben bei R/L"
          @change="
            dispatch({ type: 'SET_BESCHRIFTUNG', beschriftung: ($event.target as HTMLSelectElement).value })
          "
        >
          <option v-for="b in beschriftungen" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </label>
      <label class="field" style="margin-top: 8px">
        <span>Veranstaltung</span>
        <input
          :value="state.eventName"
          @input="dispatch({ type: 'SET_EVENT', eventName: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field field-nums" style="margin-top: 8px">
        <span>Leere Zeilen</span>
        <input
          type="number"
          :min="0"
          :max="30"
          :value="state.emptyRows"
          @input="dispatch({ type: 'SET_EMPTY_ROWS', emptyRows: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>
      <label
        class="field field-nums"
        style="margin-top: 8px"
        title="0 = automatisch: Passt ein Bogen nicht auf ein Blatt, wird er gleichmäßig in 5er-Schritten geteilt (z. B. 24 Starter → 15 + 9, 58 → 20 + 20 + 18). Ab 5: fest nach so vielen Startern. Jede Seite mit Legende/Bild/Leerzeilen und „Seite n / X“."
      >
        <span>Zeilen / Seite</span>
        <input
          type="number"
          :min="0"
          :max="100"
          :value="state.rowsPerPage"
          @input="
            dispatch({ type: 'SET_ROWS_PER_PAGE', rowsPerPage: Number(($event.target as HTMLInputElement).value) })
          "
        />
      </label>
      <label
        class="field field-nums"
        style="margin-top: 8px"
        title="Nur Klassen mit mindestens so vielen Startern werden auf mehrere Seiten aufgeteilt; kleinere bleiben eine Seite. 0 = jede Klasse mit mehr Startern als „Zeilen / Seite“."
      >
        <span>Teilen ab</span>
        <input
          type="number"
          :min="0"
          :max="200"
          :value="state.splitFrom"
          :disabled="state.rowsPerPage === 0"
          @input="dispatch({ type: 'SET_SPLIT_FROM', splitFrom: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>
      <p class="hint">
        Zeilen / Seite: 0 = automatisch (misst, was auf ein Blatt passt, und teilt in 5er-Schritten,
        z. B. 24 → 15 + 9), sonst fest so viele Starter pro Seite (min. 5). Teilen ab (nur bei festem
        Wert): erst Klassen mit so vielen Startern aufteilen, z. B. 15 / 25 = ab 25 Startern je 15 pro
        Seite (0 = immer). Passt eine Seite trotzdem nicht aufs Blatt, wird automatisch geteilt.
      </p>
      <label
        class="cp-check"
        style="margin-top: 8px"
        title="Beschreibung (Legende, Fehlerpunkte, Parcours) auf eine eigene Rückseite je Blatt - für doppelseitigen Druck"
      >
        <input
          type="checkbox"
          :checked="state.descriptionOnBack"
          @change="
            dispatch({ type: 'SET_DESCRIPTION_ON_BACK', on: ($event.target as HTMLInputElement).checked })
          "
        />
        Anne-Feature: Beschreibung auf der Rückseite
      </label>
      <p class="hint">
        Doppelseitig drucken (Wenden an der langen Kante): Die Beschreibung steht dann auf der
        Rückseite - Blatt (z. B. am Klemmbrett) nach oben klappen, und sie steht richtig herum.
        Vorne ist mehr Platz für Starter.
      </p>
      <div class="btn-row" style="margin-top: 10px">
        <button
          title="Kopiert eine URL, die genau diese Zusammenstellung wiederherstellt - ohne eingetragene Werte"
          @click="copyShareLink"
        >
          {{ copied ? '✓ Link kopiert' : '🔗 Einstellungs-Link kopieren' }}
        </button>
      </div>
      <p class="hint">
        Die Adresszeile enthält immer den aktuellen Stand - stelle dir z. B. „alle Wasser-2-Listen"
        zusammen und teile einfach die URL. Eingetragene Werte werden nicht übertragen.
      </p>
    </section>

    <section>
      <h2>Beispielwerte</h2>
      <div class="btn-row">
        <button
          :disabled="state.boegen.length === 0"
          title="Je Start 2 bis 3 Zeiten als Minuten,SekundenHundertstel, z. B. 1,2345"
          @click="fuegeBeispielwerteEin('stoppuhr')"
        >
          🎲 Zufallswerte mit Stoppuhr
        </button>
        <button
          :disabled="state.boegen.length === 0"
          title="Je Start genau eine Zeit als Sekunden,Hundertstel, z. B. 85,34"
          @click="fuegeBeispielwerteEin('lichtschranke')"
        >
          🎲 Zufallswerte mit Lichtschranke
        </button>
      </div>
      <p class="hint">
        Füllt alle angezeigten Bögen mit glaubhaften Werten, zum Erklären des Prototyps. Die
        Statistik stammt von der DM 2026, nach UIM und im Parallelslalom von der WM 2025. Vorhandene
        Werte dieser Bögen werden ersetzt, Bemerkungen und WKR-Namen bleiben.
      </p>
    </section>

    <section>
      <h2>Ergebnislisten</h2>
      <label class="cp-check">
        <input
          type="checkbox"
          :checked="showErgebnisse"
          @change="showErgebnisse = ($event.target as HTMLInputElement).checked"
        />
        Ergebnislisten in der Vorschau zeigen
      </label>
      <label class="cp-check" title="Zeigt und druckt die Gesamtliste hinter den Läufen jeder Klasse">
        <input
          type="checkbox"
          :checked="showGesamtliste"
          @change="zeigeGesamtliste(($event.target as HTMLInputElement).checked)"
        />
        Gesamtliste dazunehmen
      </label>
      <label class="cp-check" title="Sonst wird erst ab drei Läufen gestrichen">
        <input
          type="checkbox"
          :checked="state.streichenAbZwei"
          @change="dispatch({ type: 'SET_STREICHEN_AB_ZWEI', on: ($event.target as HTMLInputElement).checked })"
        />
        Schon ab zwei Läufen einen streichen
      </label>
      <label class="field field-nums" style="margin-top: 8px">
        <span>Klasse</span>
        <select
          :value="ergebnisKlasse"
          title="Nur die Listen dieser Klasse zeigen und drucken"
          @change="ergebnisKlasse = ($event.target as HTMLSelectElement).value as ClassId | ''"
        >
          <option value="">Alle mit Eingaben</option>
          <option v-for="c in klassen" :key="c" :value="c">Klasse {{ c }}</option>
        </select>
      </label>
      <div class="btn-row" style="margin-top: 8px">
        <button
          :disabled="!hatErgebnisse"
          title="Druckt nur die Ergebnislisten (A4 quer) - die Bögen werden dabei ausgelassen"
          @click="printErgebnisse"
        >
          🖨 Nur Ergebnislisten drucken / Als PDF
        </button>
      </div>
      <p class="hint">
        Je Lauf eine Liste nach Startnummer und eine nach Platz. Die Gesamtliste mit Knoten kommt
        nur dazu, wenn du sie anhakst: Ab drei Läufen ist der schlechteste gestrichen. Wer danach
        noch einen disqualifizierten Lauf hat, steht auf dem letzten Platz. Es zählen die Eingaben der
        gewählten Disziplin; die Knoten-Liste wählst du unter „Bögen“. Namen kommen aus „Namen der
        Starter“.
      </p>
    </section>

    <section>
      <h2>Export</h2>
      <div class="btn-row">
        <button
          title="Öffnet den Druckdialog; „Als PDF speichern“ schlägt den Dateinamen unten vor"
          @click="printWithFilename(currentName())"
        >
          🖨 Drucken / Als PDF (empfohlen)
        </button>
        <button :disabled="busy" @click="downloadPdf">
          {{ busy ? '… erzeuge PDF' : '⬇ PDF herunterladen (Bild)' }}
        </button>
      </div>
      <p class="hint">
        <strong>Empfohlen:</strong> Browser-Druck → „Als PDF speichern“ liefert scharfen,
        markierbaren Text inkl. QR-Codes (Tipp: im Dialog „Kopf- und Fußzeilen“ deaktivieren).
        Der Download-Button erzeugt eine gerasterte Bild-PDF (unschärfer) - nur als Fallback.
        <br />
        Dateiname: <code>{{ namePreview }} - …Uhr</code>
      </p>

      <h3 class="cp-subhead">Laufzettel</h3>
      <label class="cp-check">
        <input
          type="checkbox"
          :checked="showLaufzettel"
          @change="showLaufzettel = ($event.target as HTMLInputElement).checked"
        />
        Laufzettel in der Vorschau zeigen
      </label>
      <div class="btn-row" style="margin-top: 8px">
        <button
          :disabled="state.boegen.length === 0"
          title="Druckt nur die Laufzettel (A4 quer) - die Bögen werden dabei ausgelassen"
          @click="printLaufzettel"
        >
          🖨 Nur Laufzettel drucken
        </button>
      </div>
      <p class="hint">
        Je Klasse/Lauf der Bögen-Liste ein A4-Querblatt, das auf A5 gefaltet wird: rechts am Falz
        Klasse und Lauf, daneben eine Checkbox je gedruckter Seite (Reihenfolge wie im Aufbau). Die
        Seitenzahlen kommen aus der Vorschau - „Zeilen / Seite“ vorher einstellen.
      </p>

      <h3 class="cp-subhead">Legende</h3>
      <label class="cp-check">
        <input
          type="checkbox"
          :checked="showLegende"
          @change="showLegende = ($event.target as HTMLInputElement).checked"
        />
        Legende in der Vorschau zeigen
      </label>
      <div class="btn-row" style="margin-top: 8px">
        <button
          title="Druckt nur die Legende (A4) - die Bögen werden dabei ausgelassen"
          @click="printLegende"
        >
          🖨 Nur Legende drucken / Als PDF
        </button>
      </div>
      <p class="hint">
        Alle Fehlercodes, Strafen und Disqualifikationen des gewählten Regelwerks auf einem A4-Blatt.
      </p>

      <h3 class="cp-subhead">Vektor-PDF-Wege zum Vergleich</h3>
      <div class="btn-row">
        <button :disabled="busyPm" title="Echtes Vektor-PDF via pdfmake (deklaratives Layout)" @click="downloadPdfmake">
          {{ busyPm ? '… erzeuge PDF' : '⬇ Vektor-PDF (pdfmake)' }}
        </button>
        <button :disabled="busyJs" title="Echtes Vektor-PDF via jsPDF + autotable" @click="downloadJsPdf">
          {{ busyJs ? '… erzeuge PDF' : '⬇ Vektor-PDF (jsPDF)' }}
        </button>
      </div>
      <a class="alt-link" :href="pdfIslandUrl">
        🧪 react-pdf-Insel öffnen (eigene Seite, Live-Vorschau + Ein-Klick-Download) →
      </a>
      <p class="hint">
        Drei Vektor-Wege zum Vergleich: <strong>pdfmake</strong> und <strong>jsPDF</strong> laden
        direkt herunter (vereinfachtes Layout, ohne Parcoursbild); die <strong>react-pdf-Insel</strong>
        (<code>pdf.html</code>) hat Live-Vorschau und das eingebettete Parcoursbild. Alle nutzen die
        aktuelle Zusammenstellung aus diesem Prototyp.
      </p>
    </section>

    <section>
      <h2>Bögen ({{ state.boegen.length }})</h2>

      <details class="quickpick">
        <summary class="quickpick-title">Schnellauswahl</summary>
        <div class="qp-body">
          <div class="qp-row">
            <label class="qp-label" for="qp-class-order">Klassen-Reihenfolge:</label>
            <div class="qp-order">
              <input
                id="qp-class-order"
                :value="formatClassOrder(state.classOrder)"
                placeholder="z. B. 1, 3, E, 2, 5, 7, 4, 6"
                title="Reihenfolge, in der die Schnellauswahl die Klassen anlegt. Nicht genannte Klassen werden ausgelassen; leer = alle (E, 1 … 7)."
                @change="setClassOrder"
              />
              <button
                v-if="fehlendeKlassen.length > 0"
                class="qp-reset"
                :title="`Fehlende Klassen wieder anhängen: ${fehlendeKlassen.join(', ')}`"
                :aria-label="`Fehlende Klassen wieder anhängen: ${fehlendeKlassen.join(', ')}`"
                @click="restoreClasses"
              >
                ↻
              </button>
            </div>
          </div>

          <div class="qp-row">
            <span class="qp-label">Kompletter Lauf (alle Listen × alle Klassen):</span>
            <div class="qp-btns">
              <button
                v-for="l in LAEUFE"
                :key="l"
                :title="`Alle ${order.length} Listentypen × alle Klassen für den ${l}. Lauf`"
                @click="completeLauf(l)"
              >
                + {{ l }}. Lauf
              </button>
            </div>
          </div>

          <div class="qp-row">
            <span class="qp-label">Lauf für die folgenden Auswahlen:</span>
            <div class="qp-btns qp-lauf">
              <button
                v-for="l in LAEUFE"
                :key="l"
                :class="qpLauf === l ? 'active' : ''"
                @click="qpLauf = l"
              >
                {{ l }}. Lauf
              </button>
              <button
                :class="qpLauf === 'alle' ? 'active' : ''"
                title="Erst Lauf 1 komplett, dann Lauf 2, dann Lauf 3 - jeweils in derselben Klassen-Reihenfolge"
                @click="qpLauf = 'alle'"
              >
                Alle Läufe
              </button>
            </div>
          </div>

          <div class="qp-row">
            <span class="qp-label">Eine Position · alle Klassen · {{ laufLabel(qpLauf) }}:</span>
            <div class="qp-btns">
              <button
                v-for="t in menuOrder"
                :key="t"
                :title="`${getSheetDef(t).menuLabel} für alle Klassen (${laufLabel(qpLauf)})`"
                @click="positionAllClasses(t)"
              >
                {{ buttonLabels[t] }}
              </button>
            </div>
          </div>

          <div class="qp-row">
            <span class="qp-label">Eine Klasse · alle Listen · {{ laufLabel(qpLauf) }}:</span>
            <div class="qp-btns">
              <button
                v-for="c in klassenFolge"
                :key="c"
                :title="`Alle Listentypen für Klasse ${c} (${laufLabel(qpLauf)})`"
                @click="classAllPositions(c)"
              >
                Kl. {{ c }}
              </button>
              <button
                :title="`Alle Klassen in der Klassen-Reihenfolge × alle Listentypen (${laufLabel(qpLauf)})`"
                @click="allClassesAllPositions"
              >
                Alle
              </button>
            </div>
          </div>

          <button v-if="state.boegen.length > 0" class="qp-clear" @click="dispatch({ type: 'CLEAR_BOEGEN' })">
            Liste leeren
          </button>
        </div>
      </details>

      <ul class="bogen-list">
        <li v-for="(b, i) in state.boegen" :key="b.id">
          <select
            :value="b.typeId"
            @change="
              dispatch({ type: 'UPDATE_BOGEN', id: b.id, patch: { typeId: ($event.target as HTMLSelectElement).value } })
            "
          >
            <option v-for="t in menuOrder" :key="t" :value="t">{{ getSheetDef(t).menuLabel }}</option>
          </select>
          <select
            :value="b.klasse"
            @change="
              dispatch({ type: 'UPDATE_BOGEN', id: b.id, patch: { klasse: ($event.target as HTMLSelectElement).value as ClassId } })
            "
          >
            <option v-for="c in klassen" :key="c" :value="c">Kl. {{ c }}</option>
          </select>
          <select
            :value="b.lauf"
            @change="
              dispatch({ type: 'UPDATE_BOGEN', id: b.id, patch: { lauf: Number(($event.target as HTMLSelectElement).value) as Lauf } })
            "
          >
            <option v-for="l in LAEUFE" :key="l" :value="l">{{ l }}. Lauf</option>
          </select>
          <span class="bogen-actions">
            <button :disabled="i === 0" title="nach oben" @click="dispatch({ type: 'MOVE_BOGEN', id: b.id, dir: -1 })">
              ↑
            </button>
            <button
              :disabled="i === state.boegen.length - 1"
              title="nach unten"
              @click="dispatch({ type: 'MOVE_BOGEN', id: b.id, dir: 1 })"
            >
              ↓
            </button>
            <button title="entfernen" @click="dispatch({ type: 'REMOVE_BOGEN', id: b.id })">✕</button>
          </span>
        </li>
      </ul>

      <div class="add-bogen">
        <select :value="addType" @change="addTypeRaw = ($event.target as HTMLSelectElement).value">
          <option v-for="t in menuOrder" :key="t" :value="t">{{ getSheetDef(t).menuLabel }}</option>
        </select>
        <select :value="addKlasse" @change="addClass = ($event.target as HTMLSelectElement).value as ClassId">
          <option v-for="c in klassen" :key="c" :value="c">Kl. {{ c }}</option>
        </select>
        <select :value="addLauf" @change="addLauf = Number(($event.target as HTMLSelectElement).value) as Lauf">
          <option v-for="l in LAEUFE" :key="l" :value="l">{{ l }}. Lauf</option>
        </select>
        <button @click="dispatch({ type: 'ADD_BOGEN', typeId: addType, klasse: addKlasse, lauf: addLauf })">
          + Bogen
        </button>
      </div>
    </section>

    <section>
      <details>
        <summary><h2 style="display: inline">Startnummern</h2></summary>
        <p class="hint">Demo-Nummern (keine echten Daten) - frei editierbar, kommagetrennt.</p>
        <div v-for="c in klassen" :key="c" class="field field-nums">
          <span>Klasse {{ c }}</span>
          <input
            :value="formatNumbers(state.numbers[c] ?? [])"
            @input="dispatch({ type: 'SET_NUMBERS', klasse: c, numbers: parseNumbers(($event.target as HTMLInputElement).value) })"
          />
          <span class="nums-btns">
            <button
              title="3 Startnummern hinzufügen"
              @click="dispatch({ type: 'SET_NUMBERS', klasse: c, numbers: extendNumbers(state.numbers[c] ?? [], 3, c) })"
            >
              +3
            </button>
            <button
              title="3 Startnummern entfernen"
              :disabled="(state.numbers[c] ?? []).length === 0"
              @click="dispatch({ type: 'SET_NUMBERS', klasse: c, numbers: shrinkNumbers(state.numbers[c] ?? [], 3) })"
            >
              −3
            </button>
          </span>
        </div>
      </details>
    </section>

    <section>
      <details>
        <summary><h2 style="display: inline">Namen der Starter</h2></summary>
        <p class="hint">
          Für die Ergebnislisten, je Zeile: Startnummer; Name; Vorname. Aus Excel einfügen geht auch.
          Neue Nummern kommen zu den Startnummern der Klasse dazu. Die Namen bleiben im Browser, der
          Einstellungs-Link enthält sie nicht.
        </p>
        <label v-for="c in klassen" :key="c" class="field" style="margin-top: 8px">
          <span>Klasse {{ c }}</span>
          <textarea
            class="starter-input"
            rows="3"
            :value="formatStarter(state.starter[c])"
            @change="dispatch({ type: 'SET_STARTER', klasse: c, starter: parseStarter(($event.target as HTMLTextAreaElement).value) })"
          />
        </label>
      </details>
    </section>

    <section>
      <button class="danger" @click="resetAll">Alles zurücksetzen</button>
    </section>

    <footer class="cp-footer">Konzept-Prototyp · Eingaben und Namen bleiben im Browser</footer>
  </aside>
</template>
