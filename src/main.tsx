import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './state/store'
import { App } from './App'
import { initConfig } from './config/active'
import { loadConfig } from './config/load'
import './styles.css'

// Konfiguration (Positionen/Fehlerpunkte) zur Laufzeit laden, dann rendern.
loadConfig(import.meta.env.BASE_URL)
  .then(initConfig)
  .catch((e) => console.error('Konfiguration konnte nicht geladen werden:', e))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <StoreProvider>
          <App />
        </StoreProvider>
      </StrictMode>,
    )
  })
