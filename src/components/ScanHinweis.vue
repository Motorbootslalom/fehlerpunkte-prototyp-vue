<script setup lang="ts">
import { computed } from 'vue'
import { getAufbau, getRegelwerke, getSheetDef } from '../config/active'
import type { ScanAuswahl } from '../lib/scan'
import { scanBeenden, scanFehler, scanStand } from '../state/scan'
import { useStore } from '../state/store'

// Balken über der Vorschau nach einem Scan: was gezeigt wird, der Weg zurück zu
// allen Bögen und ein Hinweis, wenn Regelwerk oder Aufbau nicht zum Ausdruck passen.
const props = defineProps<{ passt: boolean; auswahl: ScanAuswahl | null }>()
const { state, dispatch } = useStore()

const regelwerkName = (id: string) => getRegelwerke().find((r) => r.id === id)?.label ?? id
const ziel = computed(() => scanStand.value?.ziel)
const was = computed(() => (ziel.value?.typeId ? getSheetDef(ziel.value.typeId).titelDe : 'Laufzettel'))
const anzahl = computed(() => props.auswahl?.boegen.length ?? 0)
const anderesRegelwerk = computed(() => !!ziel.value && ziel.value.regelwerk !== state.regelwerk)
const andererAufbau = computed(() => !!ziel.value && ziel.value.aufbau !== state.aufbau)

function umstellen() {
  const z = ziel.value
  if (!z) return
  if (z.regelwerk !== state.regelwerk) dispatch({ type: 'SET_REGELWERK', regelwerk: z.regelwerk })
  if (z.aufbau !== state.aufbau) dispatch({ type: 'SET_AUFBAU', aufbau: z.aufbau })
}
</script>

<template>
  <div class="scan-hinweis">
    <p v-if="scanFehler" class="scan-fehler">
      Code nicht erkannt: <code>{{ scanFehler.code || '(leer)' }}</code> - {{ scanFehler.fehler }}
    </p>
    <template v-if="ziel">
      <div class="scan-zeile">
        <span>
          <strong>{{ was }}</strong> · Klasse {{ ziel.klasse }} · {{ ziel.lauf }}. Lauf
          <template v-if="ziel.seite"> · Seite {{ ziel.seite }}</template>
          <template v-if="!ziel.typeId && passt"> · {{ anzahl }} {{ anzahl === 1 ? 'Liste' : 'Listen' }}</template>
        </span>
        <button type="button" @click="scanBeenden">Alle Bögen zeigen</button>
      </div>
      <div v-if="!passt" class="scan-warnung">
        <span>
          Gedruckt mit
          <template v-if="anderesRegelwerk">Regelwerk {{ regelwerkName(ziel.regelwerk) }}</template>
          <template v-if="anderesRegelwerk && andererAufbau"> und </template>
          <template v-if="andererAufbau">Aufbau {{ getAufbau(ziel.aufbau).name }}</template>,
          eingestellt ist
          <template v-if="anderesRegelwerk">{{ regelwerkName(state.regelwerk) }}</template>
          <template v-if="anderesRegelwerk && andererAufbau"> und </template>
          <template v-if="andererAufbau">{{ getAufbau(state.aufbau).name }}</template>.
          Die Listen passen so nicht zum Ausdruck.
        </span>
        <button
          type="button"
          :title="andererAufbau ? 'Der Wechsel des Aufbaus bildet die Bögen-Liste neu' : undefined"
          @click="umstellen"
        >
          Umstellen
        </button>
      </div>
      <p v-else-if="auswahl?.ausAufbau" class="scan-info">
        Diese Listen stehen nicht in der Bögen-Liste. Die Vorschau bildet sie aus dem Aufbau; Eingaben
        werden wie gewohnt gespeichert.
      </p>
      <p class="scan-code">{{ scanStand?.code }}</p>
    </template>
  </div>
</template>
