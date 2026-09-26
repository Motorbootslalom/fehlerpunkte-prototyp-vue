<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  getAufbau,
  getAufbauten,
  getBeschriftungen,
  getSheetDef,
  positionAllowsClass,
} from '../config/active'
import { extendNumbers, formatNumbers, parseNumbers, shrinkNumbers } from '../lib/demo'
import { exportSheetsToPdf } from '../lib/exportPdf'
import { exportPdfmake } from '../lib/exportPdfmake'
import { exportJsPdfVector } from '../lib/exportJsPdfVector'
import { describeBoegen, exportBaseName, printWithFilename } from '../lib/print'
import {
  LAEUFE,
  classAllPositionsItems,
  completeLaufItems,
  formatClassOrder,
  laufLabel,
  parseClassOrder,
  positionAllClassesItems,
  positionButtonLabels,
  withoutLaufRepeats,
  type QuickLauf,
} from '../lib/quickpick'
import { buildShareUrl } from '../lib/sharelink'
import { showLaufzettel } from '../state/laufzettel'
import { useStore } from '../state/store'
import { CLASS_IDS, type ClassId, type Lauf, type SheetTypeId } from '../types'

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
const order = computed(() => getAufbau(state.aufbau).order)
// Wählbar (Menüs, „Eine Position · alle Klassen“): der Aufbau plus alle
// Positionen mit `schnellauswahl: true` aus der YAML.
const menuOrder = computed(() => [...order.value, ...getAufbau(state.aufbau).zusatz])
const buttonLabels = computed(() => positionButtonLabels(menuOrder.value.map(getSheetDef)))
const beschriftungen = computed(() => getBeschriftungen())
const aufbauten = computed(() => getAufbauten())
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

function setClassOrder(e: Event) {
  const input = e.target as HTMLInputElement
  const classOrder = parseClassOrder(input.value)
  dispatch({ type: 'SET_CLASS_ORDER', classOrder })
  // Bereinigte Form zurückschreiben - auch wenn sich der Zustand nicht ändert.
  input.value = formatClassOrder(classOrder)
}

// Beschreibung aus der aktuellen Bogen-Auswahl (Position/Klasse/Lauf, nur
// eindeutige Teile) - für den Export-Dateinamen.
const describe = () => describeBoegen(state.boegen, (t) => getSheetDef(t).title)
const namePreview = computed(() => exportBaseName(state.eventName, describe()))
const currentName = () => exportBaseName(state.eventName, describe(), new Date())

// Nur die Laufzettel drucken: Die Bögen bleiben in der Vorschau (sie liefern die
// Seitenzahlen), die Druck-CSS blendet sie über die body-Klasse aus.
async function printLaufzettel() {
  showLaufzettel.value = true
  await nextTick()
  document.body.classList.add('print-laufzettel')
  const done = () => {
    document.body.classList.remove('print-laufzettel')
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  printWithFilename(exportBaseName(state.eventName, 'Laufzettel', new Date()))
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
        <span>Aufbau (Setup)</span>
        <select
          :value="state.aufbau"
          title="Bei einem Wettkampf genutzter Aufbau; wechseln erzeugt dessen Bögen neu"
          @change="dispatch({ type: 'SET_AUFBAU', aufbau: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="a in aufbauten" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </label>
      <label v-if="beschriftungen.length > 0" class="field" style="margin-top: 8px">
        <span>Bezeichnung der Bojen-Seiten</span>
        <select
          :value="state.beschriftung"
          title="Kürzel der Bojen-Seiten (Rechts/Links, Land/See …) - wirkt sofort auf alle Listen"
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
            <input
              id="qp-class-order"
              :value="formatClassOrder(state.classOrder)"
              placeholder="z. B. 1, 3, E, 2, 5, 7, 4, 6"
              title="Reihenfolge, in der die Schnellauswahl die Klassen anlegt. Nicht genannte Klassen kommen ans Ende; leer = Standard (E, 1 … 7)."
              @change="setClassOrder"
            />
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
                v-for="c in state.classOrder"
                :key="c"
                :title="`Alle Listentypen für Klasse ${c} (${laufLabel(qpLauf)})`"
                @click="classAllPositions(c)"
              >
                Kl. {{ c }}
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
            <option v-for="c in CLASS_IDS" :key="c" :value="c">Kl. {{ c }}</option>
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
        <select :value="addClass" @change="addClass = ($event.target as HTMLSelectElement).value as ClassId">
          <option v-for="c in CLASS_IDS" :key="c" :value="c">Kl. {{ c }}</option>
        </select>
        <select :value="addLauf" @change="addLauf = Number(($event.target as HTMLSelectElement).value) as Lauf">
          <option v-for="l in LAEUFE" :key="l" :value="l">{{ l }}. Lauf</option>
        </select>
        <button @click="dispatch({ type: 'ADD_BOGEN', typeId: addType, klasse: addClass, lauf: addLauf })">
          + Bogen
        </button>
      </div>
    </section>

    <section>
      <details>
        <summary><h2 style="display: inline">Startnummern</h2></summary>
        <p class="hint">Demo-Nummern (keine echten Daten) - frei editierbar, kommagetrennt.</p>
        <div v-for="c in CLASS_IDS" :key="c" class="field field-nums">
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
      <button class="danger" @click="resetAll">Alles zurücksetzen</button>
    </section>

    <footer class="cp-footer">Konzept-Prototyp · keine echten personenbezogenen Daten</footer>
  </aside>
</template>
