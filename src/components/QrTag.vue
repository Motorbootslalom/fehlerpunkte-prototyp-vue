<script setup lang="ts">
import { computed } from 'vue'
import { qrSvgDataUri } from '../lib/qr'

// Kleiner QR-Code (SVG) zur späteren automatischen Scanner-Erfassung.
const props = withDefaults(defineProps<{ payload: string; size?: number }>(), {
  size: 64,
})

const uri = computed(() => qrSvgDataUri(props.payload))
</script>

<template>
  <img class="qr" :src="uri" :width="size" :height="size" :alt="`QR: ${payload}`" :title="payload" />
</template>
