import { load as yamlLoad } from 'js-yaml'
import type { DisqDef, SheetDef } from '../types'
import { buildConfig, type BeschriftungScheme, type ResolvedAufbau, type ResolvedConfig } from './build'
import type { RawConfig, RawFehlerpunkte, RawPositionen } from './schema'
// Gebündelte Standard-Konfiguration - immer verfügbar, auch ohne Netz. Die
// Dateien public/config/*.yaml (zur Laufzeit geladen) überschreiben sie.
import bundledFehler from './fehlerpunkte.yaml?raw'
import bundledPositionen from './positionen.yaml?raw'

// Aktive Konfiguration. Wird beim Start via initConfig gesetzt (Laufzeit-YAML);
// solange nicht gesetzt, lazy aus den gebündelten YAMLs geladen (z. B. Tests).
let active: ResolvedConfig | null = null
// Zusammengeführte Roh-Konfiguration - nötig, um bei einem Wechsel des
// Bezeichnungs-Schemas mit anderen Tokens neu zu bauen.
let rawActive: RawConfig | null = null

/** Führt die beiden YAML-Dateien zusammen und baut die Konfiguration. */
export function mergeAndBuild(fehlerText: string, positionenText: string): ResolvedConfig {
  const f = (yamlLoad(fehlerText) as RawFehlerpunkte) ?? {}
  const p = (yamlLoad(positionenText) as RawPositionen) ?? { positionen: [] }
  const raw: RawConfig = { ...f, ...p }
  rawActive = raw
  return buildConfig(raw)
}

export function bundledConfig(): ResolvedConfig {
  return mergeAndBuild(bundledFehler, bundledPositionen)
}

export function initConfig(cfg: ResolvedConfig): void {
  active = cfg
}

function cfg(): ResolvedConfig {
  if (!active) active = bundledConfig()
  return active
}

export function getSheetDef(typeId: string): SheetDef {
  const def = cfg().positions.find((p) => p.typeId === typeId)
  if (!def) throw new Error(`Unbekannte Position: ${typeId}`)
  return def
}

export function getPositions(): SheetDef[] {
  return cfg().positions
}

/** Gilt diese Position (das ganze Blatt) für diese Klasse? (z. B. MüB ab Kl. 4) */
export function positionAllowsClass(typeId: string, klasse: string): boolean {
  const d = cfg().positions.find((p) => p.typeId === typeId)
  return !d?.klassen || d.klassen.length === 0 || d.klassen.includes(klasse)
}

export function getAufbauten(): ResolvedAufbau[] {
  return cfg().aufbauten
}

export function defaultAufbauId(): string {
  return cfg().aufbauten[0]?.id ?? 'standard'
}

/** Aufbau nach ID (Fallback: erster/Standard-Aufbau). */
export function getAufbau(id: string): ResolvedAufbau {
  const a = cfg().aufbauten.find((x) => x.id === id)
  return a ?? cfg().aufbauten[0] ?? { id: 'standard', name: 'Standard', order: [] }
}

export function allDisqs(): DisqDef[] {
  return cfg().allDisqs
}

/** Verfügbare Bezeichnungs-Schemata (Bojen-Kürzel), für die Umschaltung. */
export function getBeschriftungen(): BeschriftungScheme[] {
  return cfg().beschriftungen
}

/** ID des Standard-Schemas (erstes), oder '' wenn keine definiert sind. */
export function defaultBeschriftungId(): string {
  return cfg().beschriftungen[0]?.id ?? ''
}

/**
 * Stellt das Bezeichnungs-Schema um: baut die Konfiguration aus der Roh-YAML
 * neu, wobei die Schema-Tokens die globalen `bezeichnungen` überschreiben.
 * Wirkt sofort auf alle folgenden getSheetDef-Aufrufe (Neu-Render nötig).
 */
export function applyBeschriftung(id: string): void {
  cfg() // sicherstellen, dass rawActive gesetzt ist
  if (!rawActive) return
  const scheme = (rawActive.beschriftungen ?? []).find((b) => b.id === id)
  if (!scheme) return
  const merged: RawConfig = {
    ...rawActive,
    bezeichnungen: { ...(rawActive.bezeichnungen ?? {}), ...(scheme.tokens ?? {}) },
  }
  active = buildConfig(merged, { raeumlich: scheme.raeumlich })
}
