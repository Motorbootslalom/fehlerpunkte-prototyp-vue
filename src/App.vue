<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { aufbauOrder, getLaufzettelConfig, getLegende, getSheetDef, positionAllowsClass } from './config/active'
import { buildLaufzettel } from './lib/laufzettel'
import { laufzettelCode } from './lib/qr'
import { scanBoegen } from './lib/scan'
import { hoereAufScanner } from './lib/scanner'
import { pageCounts, showErgebnisse, showLaufzettel, showLegende } from './state/laufzettel'
import { scanFehler, scanStand, verarbeiteScan } from './state/scan'
import { useStore } from './state/store'
import { assistent, einteilungOffen, konfigStand } from './state/konfig'
import AufbauAssistent from './components/AufbauAssistent.vue'
import ControlPanel from './components/ControlPanel.vue'
import ErgebnisListen from './components/ErgebnisListen.vue'
import LaufzettelPage from './components/LaufzettelPage.vue'
import LegendePage from './components/LegendePage.vue'
import ScanHinweis from './components/ScanHinweis.vue'
import SheetView from './components/SheetView.vue'
import WkrEinteilung from './components/WkrEinteilung.vue'

const { state } = useStore()
// `konfigStand`: Der Entwurf im Assistenten ändert seine Positionen unter derselben ID.
const order = computed(() => (konfigStand.value, aufbauOrder(state.aufbau, state.tor5MitParcours)))

// Laufzettel je Klasse/Lauf - Seitenzahlen aus den gerenderten Bögen.
const laufzettel = computed(() =>
  buildLaufzettel(
    state.boegen,
    order.value,
    (t) => getSheetDef(t).titelDe,
    (id) => pageCounts[id] ?? 1,
  ),
)
// Arbeitsschritte der Auswertung (einstellungen.yaml → laufzettel).
const lzConfig = getLaufzettelConfig()

// Die aktive Konfiguration ist nicht reaktiv: Der Zustand zeigt an, wann sie sich
// geändert hat. Legende und Bögen werden dann neu aufgebaut.
function schliesseAssistent() {
  assistent.value = null
}
const configKey = computed(() => `${state.regelwerk}:${state.sprache}:${state.beschriftung}:${konfigStand.value}`)
const legende = computed(() => (configKey.value, getLegende()))

// Nach einem Scan nur dessen Listen zeigen - und keine, wenn Regelwerk oder
// Aufbau nicht zum Ausdruck passen (dann bietet ScanHinweis das Umstellen an).
const scanPasst = computed(() => {
  const z = scanStand.value?.ziel
  return !z || (z.regelwerk === state.regelwerk && z.aufbau === state.aufbau)
})
const scanAuswahl = computed(() => {
  const s = scanStand.value
  if (!s || !scanPasst.value) return null
  return scanBoegen(s.ziel, state.boegen, order.value, (t) => getSheetDef(t).showLauf === false, positionAllowsClass)
})
const angezeigt = computed(() => (scanStand.value ? (scanAuswahl.value?.boegen ?? []) : state.boegen))

// Nach jedem Scan zur gescannten Seite bzw. zur ersten Liste springen. Die Seiten
// entstehen erst nach dem Messen (automatische Aufteilung) - daher ein paar Frames warten.
watch(
  () => scanStand.value?.nr,
  async (nr) => {
    if (nr === undefined) return
    await nextTick()
    const seite = scanStand.value?.ziel.seite
    const selektor = seite ? `.sheets .sheet[data-seite="${seite}"]` : '.sheets .sheet[data-seite]'
    let el: Element | null = null
    for (let i = 0; i < 20 && !el; i++) {
      el = document.querySelector(selektor)
      if (!el) await new Promise((r) => requestAnimationFrame(r))
    }
    if (!el) return
    const hinweis = document.querySelector('.scan-hinweis')?.getBoundingClientRect().height ?? 0
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - hinweis - 16 })
  },
)

// Handscanner überall annehmen, außer im Scan-Feld (das liest selbst).
let abmelden = () => {}
onMounted(() => {
  abmelden = hoereAufScanner(
    (code) => verarbeiteScan(code),
    (el) => el instanceof HTMLElement && el.hasAttribute('data-scan-feld'),
  )
})
onBeforeUnmount(() => abmelden())
</script>

<template>
  <div class="app">
    <ControlPanel />
    <main class="sheets">
      <ScanHinweis v-if="scanStand || scanFehler" :passt="scanPasst" :auswahl="scanAuswahl" />
      <!-- Assistent für eigene Aufbauten; die Bögen darunter zeigen den Entwurf live. -->
      <AufbauAssistent v-if="assistent" :key="assistent" :modus="assistent" @schliessen="schliesseAssistent" />
      <!-- WKR-Einteilung: Namen je Liste, wirkt sofort auf die Bögen darunter. -->
      <WkrEinteilung v-else-if="einteilungOffen" @schliessen="einteilungOffen = false" />
      <!-- A4-Legende; gedruckt nur über „Nur Legende drucken“. -->
      <section v-if="showLegende" class="legende-stack">
        <LegendePage :legende="legende" :event-name="state.eventName" />
      </section>
      <!-- Ergebnislisten; gedruckt nur über „Nur Ergebnislisten drucken“. -->
      <section v-if="showErgebnisse" class="ergebnis-stack">
        <ErgebnisListen :key="configKey" />
      </section>
      <p v-if="state.boegen.length === 0 && !scanStand" class="empty">
        Keine Bögen ausgewählt - links einen Bogen hinzufügen.
      </p>
      <template v-else>
        <!-- Laufzettel vor den Bögen; gedruckt nur über „Nur Laufzettel drucken“. -->
        <section v-if="showLaufzettel && state.boegen.length > 0" class="laufzettel-stack">
          <LaufzettelPage
            v-for="z in laufzettel"
            :key="`${z.klasse}:${z.lauf}`"
            :zettel="z"
            :event-name="state.eventName"
            :qr="laufzettelCode(state, z.klasse, z.lauf)"
            :schritte-titel="lzConfig.titel"
            :schritte="lzConfig.schritte"
          />
        </section>
        <SheetView v-for="b in angezeigt" :key="`${b.id}:${configKey}`" :bogen="b" />
      </template>
    </main>
  </div>
</template>
