import { ref } from 'vue'

// Die aktive Konfiguration (config/active.ts) ist nicht reaktiv. Ändern sich die eigenen
// Aufbauten, zählt `konfigStand` hoch: Menüs und Bögen, die ihn lesen, bauen sich neu auf.
export const konfigStand = ref(0)

// Der Assistent für eigene Aufbauten (KONZEPT-POSITIONEN.md §7): neu anlegen oder den
// gewählten eigenen Aufbau bearbeiten; null = geschlossen.
export const assistent = ref<null | 'neu' | 'bearbeiten'>(null)

// Die WKR-Einteilung (KONZEPT-NAMEN-FREIHAND.md §1) oberhalb der Bögen: offen oder zu.
export const einteilungOffen = ref(false)
