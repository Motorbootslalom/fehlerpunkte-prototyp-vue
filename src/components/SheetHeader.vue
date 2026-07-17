<script setup lang="ts">
import { bogenPayload } from '../lib/qr'
import type { Bogen, SheetDef } from '../types'
import QrTag from './QrTag.vue'

// Kopfbereich eines Bogens: Event-Titel, Listentyp/Klasse/Lauf, WKR-Feld, QR.
const props = defineProps<{
  def: SheetDef
  bogen: Bogen
  eventName: string
  wkr: string
}>()
const emit = defineEmits<{ (e: 'wkr', name: string): void }>()
</script>

<template>
  <div class="sheet-header">
    <div class="event-bar">
      <span class="event-title">{{ eventName }}</span>
      <QrTag :payload="bogenPayload(eventName, bogen)" :size="62" />
    </div>
    <div class="header-body">
      <div class="header-left">
        <div class="hl-cell hl-title">{{ def.title }}</div>
        <div class="hl-cell">Klasse {{ bogen.klasse }}</div>
        <div v-if="def.showLauf !== false" class="hl-cell">{{ bogen.lauf }}. Lauf</div>
      </div>
      <label class="wkr-box">
        <span class="wkr-label">WKR:</span>
        <input
          class="wkr-input"
          :value="wkr"
          placeholder="Name Wettkampfrichter*in"
          @input="emit('wkr', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>
  </div>
</template>
