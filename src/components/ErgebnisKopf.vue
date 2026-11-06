<script setup lang="ts">
// Kopf einer Ergebnisliste: Klasse, Lauf (oder „Gesamt“) und Veranstaltung.
defineProps<{ klasse: string; titel: string; eventName: string }>()
</script>

<template>
  <div class="erg-kopf">
    <span class="erg-kopf-klasse">{{ klasse }}</span>
    <span class="erg-kopf-titel">{{ titel }}</span>
    <span class="erg-kopf-event">{{ eventName }}</span>
  </div>
</template>
