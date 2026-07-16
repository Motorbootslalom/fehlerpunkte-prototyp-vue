import { bundledConfig, mergeAndBuild } from './active'
import type { ResolvedConfig } from './build'

// Lädt die Konfiguration zur Laufzeit aus public/config/*.yaml:
//   • fehlerpunkte.yaml - Disqualifikationen + Fehler-Kataloge (Ausschreibung)
//   • positionen.yaml   - Hinweise + Positionen (orts-/personenabhängig)
// Schlägt das fehl, wird die gebündelte Standard-Konfiguration verwendet.

export async function loadConfig(baseUrl: string): Promise<ResolvedConfig> {
  try {
    const [fehler, positionen] = await Promise.all([
      fetch(`${baseUrl}config/fehlerpunkte.yaml`, { cache: 'no-cache' }),
      fetch(`${baseUrl}config/positionen.yaml`, { cache: 'no-cache' }),
    ])
    if (fehler.ok && positionen.ok) {
      const cfg = mergeAndBuild(await fehler.text(), await positionen.text())
      if (cfg.positions.length > 0) return cfg
    }
  } catch {
    // Fällt unten auf die gebündelte Konfiguration zurück.
  }
  return bundledConfig()
}
