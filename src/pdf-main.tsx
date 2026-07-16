import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './state/store'
import { PdfApp } from './pdf/PdfApp'
import { initConfig } from './config/active'
import { loadConfig } from './config/load'
import './styles.css'
import './pdf.css'

loadConfig(import.meta.env.BASE_URL)
  .then(initConfig)
  .catch((e) => console.error('Konfiguration konnte nicht geladen werden:', e))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <StoreProvider>
          <PdfApp />
        </StoreProvider>
      </StrictMode>,
    )
  })
