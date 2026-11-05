<script setup lang="ts">
import type { LegendeModel } from '../config/build'

// A4-Blatt mit allen Fehlercodes, Strafen und Disqualifikationen eines
// Regelwerks: zum Aushängen und als Nachschlagewerk für die Wettkampfrichter.
defineProps<{
  legende: LegendeModel
  eventName: string
}>()
</script>

<template>
  <div class="sheet legende-sheet">
    <header class="lg-head">
      <h1>{{ legende.texte.titel }}</h1>
      <p v-if="eventName.trim()" class="lg-event">{{ eventName }}</p>
      <p v-if="legende.quelle" class="lg-quelle">{{ legende.quelle }}</p>
    </header>

    <section class="lg-section">
      <h2>{{ legende.texte.fehlercodes }}</h2>
      <div class="lg-grid">
        <table v-for="g in legende.gruppen" :key="g.title" class="lg-table">
          <caption>{{ g.title }}</caption>
          <tbody>
            <tr v-for="e in g.rows" :key="e.code">
              <td class="lg-code">{{ e.code }}</td>
              <td>{{ e.text }}</td>
              <td class="lg-pts">{{ e.punkte }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="legende.fehlerHinweis" class="lg-hinweis">{{ legende.fehlerHinweis }}</p>
    </section>

    <section v-if="legende.direkt.length > 0" class="lg-section">
      <h2>{{ legende.texte.ohneCode }}</h2>
      <table class="lg-table">
        <tbody>
          <tr v-for="d in legende.direkt" :key="d.titel">
            <td class="lg-titel">{{ d.titel }}</td>
            <td>{{ d.text }}</td>
            <td class="lg-pts">{{ d.punkte }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="lg-section">
      <h2>{{ legende.texte.disq }}</h2>
      <table class="lg-table">
        <tbody>
          <tr v-for="d in legende.disq" :key="d.code">
            <td class="lg-code">{{ d.code }}</td>
            <td>{{ d.text }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <ul v-if="legende.hinweise.length > 0" class="lg-hinweise">
      <li v-for="h in legende.hinweise" :key="h">{{ h }}</li>
    </ul>
  </div>
</template>
