<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { gridNavKeyDown, timeEnter } from '../lib/gridnav'
import { formatTimeDisplay, parseTime, sanitizeTimeInput } from '../lib/time'

// Zeit-Eingabezelle:
//   • Live wird die Roh-Eingabe (z. B. "1,2345") gezeigt.
//   • Enter übernimmt und springt ins nächste Zeitfeld.
//   • Nach Verlassen zeigt die Zelle "mm:ss,00 (ss,00)".
// Gespeichert wird die Roh-Eingabe - so bleibt sie beim Editieren erhalten und
// der Parser interpretiert sie identisch wieder.

const props = defineProps<{ value: string }>()
const emit = defineEmits<{ (e: 'change', raw: string): void }>()

const editing = ref(false)
const draft = ref(props.value)
const inputRef = ref<HTMLInputElement | null>(null)

// Externe Wertänderung übernehmen, solange nicht gerade editiert wird.
watch(
  () => props.value,
  (v) => {
    if (!editing.value) draft.value = v
  },
)

const display = computed(() => {
  if (editing.value) return draft.value
  const parsed = parseTime(props.value)
  return parsed ? formatTimeDisplay(parsed.centis) : ''
})

function onFocus() {
  draft.value = props.value
  editing.value = true
  // Inhalt selektieren für schnelles Überschreiben
  requestAnimationFrame(() => inputRef.value?.select())
}

function onInput(e: Event) {
  draft.value = sanitizeTimeInput((e.target as HTMLInputElement).value)
}

function onBlur() {
  editing.value = false
  emit('change', draft.value)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    emit('change', draft.value)
    editing.value = false
    if (inputRef.value) timeEnter(inputRef.value)
    return
  }
  // Pfeiltasten: erst übernehmen, dann normale Tabellen-Navigation.
  if (e.key.startsWith('Arrow')) {
    emit('change', draft.value)
    editing.value = false
    gridNavKeyDown(e)
  }
}
</script>

<template>
  <input
    ref="inputRef"
    class="cell-input time-input"
    inputmode="decimal"
    :value="display"
    @focus="onFocus"
    @input="onInput"
    @blur="onBlur"
    @keydown="onKeydown"
  />
</template>
