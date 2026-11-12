<script setup lang="ts">
import { getBogenTexte } from '../config/active'
import type { Bogen, SheetDef } from '../types'
import QrTag from './QrTag.vue'

// Kopfbereich eines Bogens: Event-Titel, Listentyp/Klasse/Lauf, WKR-Feld, QR.
defineProps<{
  def: SheetDef
  bogen: Bogen
  eventName: string
  wkr: string
  /** Der Name kommt aus der WKR-Einteilung, nicht vom Bogen selbst. */
  wkrAusEinteilung?: boolean
  /** Bei zwei Parcours: der Parcours der Klasse. */
  parcours?: number
  /** Inhalt des QR-Codes dieser Druckseite (lib/qr). */
  qr: string
}>()
const emit = defineEmits<{ (e: 'wkr', name: string): void }>()
// Bögen werden bei einem Sprachwechsel neu aufgebaut (Key in App.vue).
const texte = getBogenTexte()
</script>

<template>
  <div class="sheet-header">
    <div class="event-bar">
      <span class="event-title">{{ eventName }}</span>
      <QrTag :payload="qr" :size="62" />
    </div>
    <div class="header-body">
      <div class="header-left">
        <div class="hl-cell hl-title">{{ def.title }}</div>
        <div class="hl-cell">{{ texte.klasse(bogen.klasse) }}</div>
        <div v-if="def.showLauf !== false" class="hl-cell">{{ texte.lauf(bogen.lauf) }}</div>
        <div v-if="parcours" class="hl-cell">{{ texte.parcours(parcours) }}</div>
      </div>
      <label class="wkr-box">
        <span class="wkr-label">{{ texte.wkr }}</span>
        <span class="wkr-field">
          <input
            class="wkr-input"
            :class="{ 'aus-einteilung': wkrAusEinteilung }"
            :title="wkrAusEinteilung ? 'Aus der WKR-Einteilung. Ein anderer Name hier gilt nur für diesen Bogen.' : undefined"
            :value="wkr"
            :placeholder="texte.wkrPlatzhalter"
            @input="emit('wkr', ($event.target as HTMLInputElement).value)"
          />
          <!-- Im Druck sähe der Platzhalter wie ein eingetragener Name aus. -->
          <span class="wkr-caption">{{ texte.wkrPlatzhalter }}</span>
        </span>
      </label>
    </div>
  </div>
</template>
