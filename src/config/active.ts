import { load as yamlLoad } from 'js-yaml'
import type { DisqDef, SheetDef, Sprache } from '../types'
import {
  buildConfig,
  regelwerkInfo,
  type BeschriftungScheme,
  type LegendeModel,
  type RegelwerkInfo,
  type ResolvedAufbau,
  type ResolvedConfig,
} from './build'
import type { RawAufbau, RawConfig, RawDisziplin, RawPositionen, RawQuelle, RawRegelwerk, RawRegelwerkListe } from './schema'
import { aufloesen } from './kurzform'
import { aufbauYaml, mitEigenen, pruefeEigene, verdeckteEigene, type Pruefung } from './eigene'
import type { BogenTexte } from './sprache'
// Gebündelte Standard-Konfiguration - immer verfügbar, auch ohne Netz. Die
// Dateien public/config/ (zur Laufzeit geladen) überschreiben sie.
import bundledListe from './regelwerke.yaml?raw'
import bundledAufbauten from './aufbauten.yaml?raw'
import { mergePositionen, quellDateien } from './merge-positionen'

const bundledRegelwerke = import.meta.glob('./regelwerke/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const bundledPositionenTeile = import.meta.glob(['./einstellungen.yaml', './i18n/*.yaml', './aufbauten/*.yaml'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// Aktive Konfiguration. Wird beim Start via initConfig gesetzt (Laufzeit-YAML);
// solange nicht gesetzt, lazy aus den gebündelten YAMLs geladen (z. B. Tests).
let active: ResolvedConfig | null = null
// Roh-Konfiguration: nötig, um bei einem Wechsel von Regelwerk, Sprache oder
// Bezeichnungs-Schema neu zu bauen.
let rawRegelwerke: RawRegelwerk[] = []
let rawPositionen: RawPositionen = { positionen: [] }
// Die Positionsdateien, wie sie geladen wurden, und die eigenen Aufbauten aus dem Browser.
let rawQuelle: RawQuelle = { positionen: [] }
let eigene: RawAufbau[] = []
let auswahl: { regelwerk?: string; sprache?: Sprache; beschriftung?: string } = {}

/** Baut die Konfiguration aus den Rohdaten und der aktuellen Auswahl. */
function neuBauen(): ResolvedConfig {
  const regelwerk = rawRegelwerke.find((r) => r.id === auswahl.regelwerk) ?? rawRegelwerke[0] ?? {}
  const scheme = rawPositionen.beschriftungen?.find((b) => b.id === auswahl.beschriftung)
  const raw: RawConfig = {
    ...regelwerk,
    ...rawPositionen,
    bezeichnungen: { ...(rawPositionen.bezeichnungen ?? {}), ...(scheme?.tokens ?? {}) },
  }
  return buildConfig(raw, { raeumlich: scheme?.raeumlich, sprache: auswahl.sprache, schema: scheme?.id })
}

/**
 * Parst die YAML-Texte und baut die Konfiguration. Das erste Regelwerk ist der
 * Standard; die Auswahl beginnt wieder bei den Standardwerten.
 */
export function mergeAndBuild(regelwerkTexte: string | string[], positionen: string | RawQuelle): ResolvedConfig {
  const texte = Array.isArray(regelwerkTexte) ? regelwerkTexte : [regelwerkTexte]
  rawRegelwerke = texte.map((t) => (yamlLoad(t) as RawRegelwerk) ?? {})
  rawQuelle = typeof positionen === 'string' ? ((yamlLoad(positionen) as RawQuelle) ?? { positionen: [] }) : positionen
  rawPositionen = aufloesen(mitEigenen(rawQuelle, eigene))
  auswahl = {}
  return neuBauen()
}

/** Regelwerk-IDs in Menü-Reihenfolge aus dem Text von regelwerke.yaml. */
export function regelwerkIds(listeText: string): string[] {
  return ((yamlLoad(listeText) as RawRegelwerkListe) ?? {}).regelwerke ?? []
}

export function bundledConfig(): ResolvedConfig {
  const texte = regelwerkIds(bundledListe).map((id) => bundledRegelwerke[`./regelwerke/${id}.yaml`] ?? '')
  const teile = quellDateien(bundledAufbauten).map((name) => yamlLoad(bundledPositionenTeile[`./${name}.yaml`] ?? ''))
  return mergeAndBuild(texte, mergePositionen(teile))
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

/**
 * Gilt diese Position (das ganze Blatt) für diese Klasse? Die Klasse muss es im
 * Regelwerk geben und die Position muss für sie gelten (z. B. MüB ab Kl. 4).
 */
export function positionAllowsClass(typeId: string, klasse: string): boolean {
  if (!cfg().regelwerk.klassen.includes(klasse)) return false
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
  return a ?? cfg().aufbauten[0] ?? { id: 'standard', name: 'Standard', disziplin: 'standard', order: [], zusatz: [] }
}

/**
 * Setzt die eigenen Aufbauten aus dem Browser und baut die Konfiguration neu. Sie
 * stehen hinter denen aus dem Repo; einen mit derselben ID verdeckt der aus dem Repo.
 */
export function setzeEigeneAufbauten(liste: RawAufbau[]): void {
  cfg() // sicherstellen, dass die Rohdaten geladen sind
  eigene = liste
  rawPositionen = aufloesen(mitEigenen(rawQuelle, eigene))
  active = neuBauen()
}

/** Die gespeicherten eigenen Aufbauten, so wie sie gespeichert sind. */
export function getEigeneAufbauten(): RawAufbau[] {
  return eigene
}

/** Eigene Aufbauten, die es inzwischen im Repo gibt (der aus dem Repo gilt). */
export function getVerdeckteEigene(): RawAufbau[] {
  cfg()
  return verdeckteEigene(rawQuelle, eigene)
}

/** Prüft eigene Aufbauten aus einer Datei oder einem Link gegen das aktive Regelwerk. */
export function pruefeEigeneAufbauten(eingabe: unknown): Pruefung {
  cfg()
  const regelwerk = rawRegelwerke.find((r) => r.id === auswahl.regelwerk) ?? rawRegelwerke[0] ?? {}
  return pruefeEigene(eingabe, rawQuelle, regelwerk, eigene)
}

/** Ein Aufbau als YAML-Datei: eigene mit ihren Positionen, die aus dem Repo mit Verweisen. */
export function aufbauAlsYaml(id: string, kopf: { datum: string; version: string }): string | undefined {
  cfg()
  const aufbau = eigene.find((a) => a.id === id) ?? rawQuelle.aufbauten?.find((a) => a.id === id)
  return aufbau && aufbauYaml(aufbau, { ...kopf, regelwerk: cfg().regelwerk.label })
}

/** Das Parcoursbild einer Klasse im Aufbau: die Datei der Kursvariante, sonst Klasse<k>. */
export function bildDatei(aufbauId: string, klasse: string): string {
  return getAufbau(aufbauId).kurs?.bilder[klasse] ?? `Klasse${klasse}`
}

/** Disziplin nach ID; ohne Eintrag eine ohne Ergebnis-Spalten. */
export function getDisziplin(id: string): RawDisziplin {
  return cfg().disziplinen.find((d) => d.id === id) ?? { id, name: id }
}

/** Positionen eines Aufbaus, wahlweise mit zusammengelegten Listen. */
export function aufbauOrder(id: string, kombiAktiv: boolean): string[] {
  const a = getAufbau(id)
  return kombiAktiv && a.kombi ? a.kombi.order : a.order
}

export function allDisqs(): DisqDef[] {
  return cfg().allDisqs
}

/** Laufzettel-Konfiguration (Arbeitsschritte der Auswertung). */
export function getLaufzettelConfig(): ResolvedConfig['laufzettel'] {
  return cfg().laufzettel
}

/** Verfügbare Regelwerke in Menü-Reihenfolge. */
export function getRegelwerke(): RegelwerkInfo[] {
  cfg() // sicherstellen, dass die Rohdaten geladen sind
  return rawRegelwerke.map(regelwerkInfo)
}

/** Das aktive Regelwerk. */
export function getRegelwerk(): RegelwerkInfo {
  return cfg().regelwerk
}

/** Inhalt der A4-Legende des aktiven Regelwerks. */
export function getLegende(): LegendeModel {
  return cfg().legende
}

/** Feste Texte auf den Listen in der gewählten Sprache. */
export function getBogenTexte(): BogenTexte {
  return cfg().bogenTexte
}

/** ID des Standard-Regelwerks (erstes in regelwerke.yaml). */
export function defaultRegelwerkId(): string {
  return getRegelwerke()[0]?.id ?? ''
}

/** Die ID, falls es das Regelwerk gibt, sonst der Standard (z. B. alter Link). */
export function resolveRegelwerkId(id: string): string {
  return getRegelwerke().some((r) => r.id === id) ? id : defaultRegelwerkId()
}

/**
 * Stellt das Regelwerk um: baut die Konfiguration mit dessen Katalogen und
 * Disqualifikationen neu. Wirkt sofort auf alle folgenden getSheetDef-Aufrufe
 * (Neu-Render nötig).
 */
export function applyRegelwerk(id: string): void {
  cfg() // sicherstellen, dass die Rohdaten geladen sind
  if (!rawRegelwerke.some((r) => r.id === id)) return
  auswahl = { ...auswahl, regelwerk: id }
  active = neuBauen()
}

/**
 * Stellt die Sprache der Listen um (wirkt nur, wenn das Regelwerk Englisch
 * anbietet). Wirkt sofort auf alle folgenden getSheetDef-Aufrufe (Neu-Render nötig).
 */
export function applySprache(sprache: Sprache): void {
  cfg() // sicherstellen, dass die Rohdaten geladen sind
  auswahl = { ...auswahl, sprache }
  active = neuBauen()
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
  cfg() // sicherstellen, dass die Rohdaten geladen sind
  if (!rawPositionen.beschriftungen?.some((b) => b.id === id)) return
  auswahl = { ...auswahl, beschriftung: id }
  active = neuBauen()
}
