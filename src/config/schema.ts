// Roh-Struktur der YAML-Konfiguration. Sie ist auf zwei Dateien verteilt:
//   • fehlerpunkte.yaml - Disqualifikationen + Fehler-Kataloge (aus der
//     Ausschreibung, i. d. R. für alle gleich)
//   • positionen.yaml   - Hinweise + Positionen (orts-/personenabhängig),
//     die Kataloge und Hinweise per Verweis (ID) einbinden
// Aus der zusammengeführten Struktur erzeugt build.ts die interne Darstellung.

export interface RawDisq {
  code: string
  text: string
}

export interface RawFehler {
  code: string | number
  text: string
  punkte: number
}

/** Benannter Fehler-Katalog (z. B. "mueb", "steg", "tor5"). */
export interface RawKatalog {
  titel?: string
  fehler: RawFehler[]
}

/** fehlerpunkte.yaml */
export interface RawFehlerpunkte {
  disqualifikationen?: RawDisq[]
  kataloge?: Record<string, RawKatalog>
}

import type { TrennerDesign } from '../types'

// 'trenner' ist keine echte Datenspalte, sondern ein Platzhalter-Eintrag, der
// zwischen zwei Spalten eine Trennlinie erzeugt (linke Kante der Folgespalte).
export type RawSpaltenTyp = 'boje' | 'code' | 'punkte' | 'zeit' | 'disq' | 'text' | 'summe' | 'trenner'

export interface RawSpalte {
  /** Bei `typ: trenner` entfällt der key (reiner Trennlinien-Eintrag). */
  key?: string
  label?: string
  typ: RawSpaltenTyp
  /** Nur bei `typ: trenner`: Linien-Design (Standard: fett). */
  design?: TrennerDesign
  /** Unter-Spalten (z. B. Bojen-Bezeichnungen [H K, H H]) - nur bei 'boje'. */
  sub?: string[]
  /**
   * Welche physische Seite (seiteA/seiteB) an diesem Tor die INNERE Boje ist.
   * Nur an den Toren 1-4 gesetzt. Wird das Schema "Innen/Außen" gewählt, werden
   * die Bojen-Seiten dieser Spalte relativ (Innen/Außen) statt physisch (R/L)
   * beschriftet. Tor 5/Start/Ziel bleiben ohne Angabe bei R/L.
   */
  innen?: 'seiteA' | 'seiteB'
  /** Nur 'code': Schlüssel der 'summe'-Spalte, in der die Punkte erscheinen. */
  punkteSpalte?: string
  /**
   * Element-ID im Parcoursbild (z. B. "Tor1"), die diese Spalte im Bild
   * HERVORHEBT. Genutzt vom Bildgenerator (scripts/generate-parcours.ts): Tore
   * mit `hebt` bleiben voll sichtbar, die übrigen aus DIM_UNIVERSE werden
   * abgeblendet. Der Vorteil: kopiert man eine Spaltenzeile, wandert die
   * Hervorhebung mit. Ohne `hebt` greift die Positions-Liste `abblenden`.
   */
  hebt?: string
  /**
   * Nur 'code': eigener Fehler-Katalog dieser Spalte (Verweis auf
   * fehlerpunkte.kataloge.<id>). Ohne Angabe gilt der positionsweite `katalog`.
   * Damit lassen die Spalten Steg AB/AN je nur ihre eigenen Codes zu.
   */
  katalog?: string
  /** Relative Breite (Flex-Anteil). */
  breite?: number
  /**
   * Kurzform: optische Trennlinie am LINKEN Rand dieser Spalte (trennt sie von
   * der vorherigen). Alternativ - und meist lesbarer - ein eigener Eintrag
   * `{ typ: trenner, design: fett|doppelt|gepunktet|gestrichelt }` DAVOR.
   */
  trenner?: TrennerDesign
  /** Design der Trennlinien zwischen den `sub`-Unter-Spalten dieser Spalte. */
  subTrenner?: TrennerDesign
  /**
   * Nur für diese Klassen anzeigen (z. B. [5, 6, 7] für Speed 1, [7] für
   * Speed 2, [4, 5, 6, 7] für Mann-über-Bord). Fehlt die Angabe → alle Klassen.
   * Ein Bogen gilt genau einer Klasse, daher kann die Spalte je Blatt entfallen.
   */
  klassen?: Array<string | number>
}

export interface RawPosition {
  id: string
  titel: string
  menue?: string
  ausrichtung?: 'hoch' | 'quer'
  /** Lauf im Kopf zeigen? false z. B. bei Knoten (nur einmal abgenommen). */
  lauf?: boolean
  /** Bild-Ordner unter public/parcours (z. B. alcatraz_Parcours). */
  bild?: string
  /**
   * Wird `bild` beim Build automatisch aus `bildQuelle` erzeugt? Dann leitet
   * scripts/generate-parcours.ts die Abblendung aus den Spalten (`hebt`) bzw.
   * `abblenden` ab und schreibt gedimmte SVG+PNG nach parcours/<bild>. Fehlt
   * der Schalter, verweist `bild` wie bisher auf ein festes fertiges Bild.
   */
  bildGenerator?: boolean
  /** Quell-Bildordner für den Generator (Default: alcatraz_Parcours). */
  bildQuelle?: string
  /**
   * Element-IDs im Parcoursbild, die abgeblendet (opacity reduziert) werden.
   * Fallback/Ergänzung zur spaltenbasierten `hebt`-Hervorhebung: Ohne `hebt` in
   * den Spalten steuert allein diese Liste, was gedimmt wird; mit `hebt` kann
   * sie zusätzliche Elemente (z. B. SpeedbojeKlasse7) abblenden.
   */
  abblenden?: string[]
  /** Bild-Drehung in Grad: 0 | 90 | -90 | 180. */
  bildDrehung?: number
  /**
   * Diese Position wird von der Gegenseite betrachtet (z. B. Alcatraz von
   * hinten). Bei räumlichen Schemata (Pfeile) werden die Bojen-Seiten dann
   * gespiegelt, damit die Pfeile in dieselbe Bildrichtung zeigen wie im
   * Frontal-Aufbau - auch wenn sie eine andere Boje meinen.
   */
  pfeileSpiegeln?: boolean
  /** Verweis auf hinweise.<id> (oder direkter Text, falls kein Treffer). */
  hinweis?: string
  /** Verweis auf fehlerpunkte.kataloge.<id> (Fehlercodes → Punkte). */
  katalog?: string
  /** Welche Disqualifikationen: 'alle', 'keine' oder Liste von Codes. */
  disq?: 'alle' | 'keine' | string[]
  /**
   * Für welche Klassen diese Position (das ganze Blatt) genutzt wird, z. B.
   * Mann-über-Bord [4, 5, 6, 7]. Fehlt die Angabe → alle Klassen. Beim Erzeugen
   * der Bögen (Schnellauswahl) werden nicht passende Klassen übersprungen.
   */
  klassen?: Array<string | number>
  /** Schlüssel der Spalte, die die Zeilensumme (Σ) berechnet zeigt. */
  summeSpalte?: string
  /**
   * Standard-Design der Trennlinien zwischen Unter-Spalten (`sub`) ALLER Spalten
   * dieser Position, z. B. gepunktet zwischen den beiden Bojen jedes Tores. Pro
   * Spalte via `subTrenner` überschreibbar.
   */
  subTrenner?: TrennerDesign
  spalten: RawSpalte[]
}

/**
 * Ein auf der Seite umschaltbares Bezeichnungs-Schema (z. B. Rechts/Links,
 * Land/See, Hafen/Kai). `tokens` überschreibt die globalen `bezeichnungen`
 * (typischerweise seiteA/seiteB) - so lässt sich die Bojen-Beschriftung ohne
 * YAML-Änderung live umstellen.
 */
export interface RawBeschriftung {
  id: string
  name: string
  tokens: Record<string, string>
  /**
   * Räumliches Schema (z. B. Pfeile →/←): die Kürzel zeigen eine Blickrichtung
   * und müssen daher an "von hinten" betrachteten Positionen gespiegelt werden
   * (siehe RawPosition.pfeileSpiegeln). Bei Buchstaben-Schemata (R/L, L/S …)
   * sind die Kürzel Namen und werden nicht gespiegelt.
   */
  raeumlich?: boolean
}

/** Ein Aufbau (Setup) bündelt die bei einem Wettkampf genutzten Positionen. */
export interface RawAufbau {
  id: string
  name: string
  /** Positions-IDs in Reihenfolge (auch gemeinsame wie zeit, knoten …). */
  positionen: string[]
}

/** positionen.yaml */
export interface RawPositionen {
  /**
   * Globale Bojen-Kürzel als Token-Map, z. B. { hin: "H", rueck: "Z",
   * seiteA: "R", seiteB: "L" }. In Spalten-`sub` und Hinweisen werden diese
   * Tokens (als ganze Wörter) durch die Kürzel ersetzt - so lassen sich die
   * Bezeichnungen (R/L, L/S, H/K …) an einer Stelle umstellen.
   */
  bezeichnungen?: Record<string, string>
  /**
   * Auf der Seite umschaltbare Bezeichnungs-Schemata. Das erste ist der
   * Standard; wird eines gewählt, überschreiben seine `tokens` die
   * `bezeichnungen` und die Konfiguration wird neu gebaut.
   */
  beschriftungen?: RawBeschriftung[]
  /** Wiederverwendbare Hinweistexte (Bojen-Bezeichnungen). */
  hinweise?: Record<string, string>
  /** Aufbauten (Setups); der erste ist der Standard. */
  aufbauten?: RawAufbau[]
  /** Alle Positionen (werden von den Aufbauten per ID referenziert). */
  positionen: RawPosition[]
}

/** Zusammengeführte Roh-Konfiguration (beide Dateien). */
export interface RawConfig extends RawFehlerpunkte, RawPositionen {}
