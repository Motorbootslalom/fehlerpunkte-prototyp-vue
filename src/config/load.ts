import { load as yamlLoad } from 'js-yaml'
import { bundledConfig, mergeAndBuild, regelwerkIds } from './active'
import type { ResolvedConfig } from './build'
import type { RawRegelwerk } from './schema'

// Lädt die Konfiguration zur Laufzeit aus public/config/:
//   • regelwerke.yaml      - Liste der Regelwerke (Menü-Reihenfolge)
//   • regelwerke/<id>.yaml - Disqualifikationen + Fehler-Kataloge (Ausschreibung)
//   • positionen.yaml      - Hinweise + Positionen (orts-/personenabhängig)
// Schlägt das fehl, wird die gebündelte Standard-Konfiguration verwendet.

async function text(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.text()
}

export async function loadConfig(baseUrl: string): Promise<ResolvedConfig> {
  try {
    const ids = regelwerkIds(await text(`${baseUrl}config/regelwerke.yaml`))
    const [positionen, ...regelwerke] = await Promise.all([
      text(`${baseUrl}config/positionen.yaml`),
      ...ids.map((id) => text(`${baseUrl}config/regelwerke/${id}.yaml`)),
    ])
    // Server mit SPA-Fallback liefern für fehlende Dateien HTML mit Status 200.
    // Das darf nicht als leeres Regelwerk durchgehen (Listen ohne Legende).
    const gueltig = ids.length > 0 && ids.every((id, i) => (yamlLoad(regelwerke[i]) as RawRegelwerk)?.id === id)
    if (gueltig) {
      const cfg = mergeAndBuild(regelwerke, positionen)
      if (cfg.positions.length > 0) return cfg
    }
  } catch {
    // Fällt unten auf die gebündelte Konfiguration zurück.
  }
  return bundledConfig()
}
