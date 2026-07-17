import { createApp } from 'vue'
import App from './App.vue'
import { createStore } from './state/store'
import { initConfig } from './config/active'
import { loadConfig } from './config/load'
import './styles.css'

// Konfiguration (Positionen/Fehlerpunkte) zur Laufzeit laden, dann rendern. Der
// Store wird erst NACH initConfig erzeugt, damit die Standard-Zusammenstellung
// die aktive Konfiguration nutzt (wie im React-Prototyp der StoreProvider).
loadConfig(import.meta.env.BASE_URL)
  .then(initConfig)
  .catch((e) => console.error('Konfiguration konnte nicht geladen werden:', e))
  .finally(() => {
    const app = createApp(App)
    app.use(createStore())
    app.mount('#app')
  })
