// Kern-Datenmodell des Fehlerpunkte-Prototyps.
//
// Ein "Bogen" (WKR-Liste) entsteht aus der Kombination von Listentyp,
// Klasse und Lauf. Der Aufbau der Bögen ist datengetrieben über SheetDef
// beschrieben - ein einziger generischer Renderer stellt alle Typen dar.

export type ClassId = 'E' | '1' | '2' | '3' | '4' | '5' | '6' | '7'

/** Design einer Spalten-Trennlinie. */
export type TrennerDesign = 'fett' | 'doppelt' | 'gepunktet' | 'gestrichelt'

/** Gerät einer Zeitspalte: elektronische Zeiterfassung (Lichtschranke) oder Stoppuhr. */
export type Geraet = 'elektronisch' | 'stoppuhr'

export const CLASS_IDS: ClassId[] = ['E', '1', '2', '3', '4', '5', '6', '7']

export type Lauf = 1 | 2 | 3

/** Sprache der Listen und Fehlertexte: deutsch, englisch oder beides. */
export type Sprache = 'de' | 'en' | 'de+en'

/**
 * Kennung einer Position/Liste. Frei konfigurierbar (siehe config/aufbauten.yaml),
 * daher ein String und keine feste Aufzählung.
 */
export type SheetTypeId = string

/** Verhalten einer Eingabezelle. */
export type CellKind =
  | 'buoy' // Anzahl Bojenberührungen → Punkte = Anzahl × weight; Buchstabe A-X = Disq an dieser Stelle
  | 'code' // Fehlercode(s) aus der Legende, kommagetrennt → Punkte laut errorTable
  | 'points' // direkte Punkteingabe → fließt in Σ
  | 'time' // Zeiteingabe (Sonderformatierung, siehe lib/time)
  | 'disq' // Disqualifikations-Buchstabe A-X
  | 'text' // Freitext (Bemerkung)
  | 'sum' // berechnete Σ-Zelle (nur Anzeige)

export interface Column {
  key: string
  label: string
  kind: CellKind
  /**
   * Was die Zellen dieser Spalte erfassen (eine Kennung je Unter-Spalte, siehe
   * config/feld.ts). Fehlt = der `key`.
   */
  felder?: string[]
  /**
   * Unter-Spalten (z. B. Blickrichtungen "H K" / "H H" an einem Tor). Jede
   * erzeugt eine eigene Zelle; der Kopf wird dann zweizeilig dargestellt.
   */
  sub?: string[]
  /**
   * Nur für 'code'-Zellen: Schlüssel der 'sum'-Spalte, in der die aus den
   * Codes berechneten Punkte (read-only) angezeigt werden.
   */
  pointsCol?: string
  /**
   * Nur für 'sum'-Spalten: zeigt die Punkte einzeln in der Reihenfolge der Codes
   * („5 + 5“) statt ihrer Summe. Die Summe steht dann in der Σ-Spalte.
   */
  einzeln?: boolean
  /**
   * Nur für 'code'-Zellen: eigener Fehler-Katalog dieser Spalte. Ist er gesetzt,
   * gelten für Bewertung und Eingabe nur diese Codes (statt des positionsweiten
   * SheetDef.errorTable). Beispiel: Steg "Fehler AB" vs. "Fehler AN".
   */
  errorTable?: ErrorDef[]
  /** Relative Spaltenbreite (CSS-Flexbasis-artig, nur grobe Steuerung). */
  grow?: number
  /**
   * Optische Trennlinie am linken Rand dieser Spalte, z. B. zur Trennung von
   * Hin- und Rückfahrt-Spalten. Wird entweder direkt an der Spalte gesetzt oder
   * über einen eigenen `{ typ: trenner, design }`-Eintrag davor (siehe schema).
   */
  trenner?: TrennerDesign
  /**
   * Design der Trennlinien ZWISCHEN den Unter-Spalten (`sub`) dieser Spalte,
   * z. B. gepunktet zwischen den beiden Bojen eines Tores. Fehlt = normale
   * dünne Linie.
   */
  subTrenner?: TrennerDesign
  /**
   * Klassen, für die diese Spalte erscheint (z. B. Speed/MüB). Leer/undefiniert
   * = alle Klassen. Ein Blatt gilt genau einer Klasse, daher entfällt die
   * Spalte klassenabhängig.
   */
  klassen?: string[]
  /** Nur 'time': das Gerät. Fehlt = Stoppuhr. */
  geraet?: Geraet
}

/** Ein benannter Fehlerblock in der Legende (z. B. Ablegen / Anlegen). */
export interface ErrorGroup {
  title?: string
  rows: ErrorDef[]
}

export interface ErrorDef {
  code: string
  text: string
  punkte: number
}

export interface DisqDef {
  code: string
  text: string
}

export interface SheetDef {
  typeId: SheetTypeId
  /** Kurzname (erscheint links im Kopf), z. B. "Mann-über-Bord". */
  title: string
  /** Kurzname auf Deutsch: für Bedienleiste, Laufzettel und Dateinamen. */
  titelDe: string
  /** Ausführlicher Name für Auswahl-Menüs. */
  menuLabel: string
  orientation: 'portrait' | 'landscape'
  /** Lauf im Kopf anzeigen (Default true; false z. B. bei Knoten). */
  showLauf?: boolean
  /**
   * Klassen, für die dieses Blatt genutzt wird (z. B. MüB [4,5,6,7]). Leer =
   * alle. Steuert die Bogen-Erzeugung (nicht passende Klassen werden ausgelassen).
   */
  klassen?: string[]
  columns: Column[]
  /** Schlüssel der Spalte, die die berechnete Σ zeigt (falls vorhanden). */
  sumColumnKey?: string
  /** Fehlercodes → Punkte (für Legende und Auto-Summe der 'code'-Zellen). */
  errorTable?: ErrorDef[]
  /** Überschrift über der errorTable-Legende. */
  errorTableTitle?: string
  /**
   * Getrennte Fehlerblöcke (je Spalte ein eigener Katalog), z. B. Steg
   * Ablegen/Anlegen. Ist dies gesetzt, zeigt die Legende die Blöcke
   * nebeneinander (statt der einzelnen errorTable).
   */
  errorGroups?: ErrorGroup[]
  /** Für diese Position gültige Disqualifikationen (bereits gefiltert). */
  disqTable?: DisqDef[]
  /** Überschrift über der disqTable-Legende, mit Regelwerk und Version. */
  disqTableTitle?: string
  /** Disq-Legende zweispaltig: bei querliegendem Bild, das darunter Höhe braucht. */
  disqZweispaltig?: boolean
  /** Zeigt die Disqualifikations-Tabelle in der Legende (= disqTable vorhanden). */
  showDisqTable?: boolean
  /** Zusätzliche Hinweiszeile in der Legende. */
  legendNote?: string
  /**
   * Zweisprachig: derselbe Hinweis getrennt nach [deutsch, englisch], damit die
   * Legende beide nebeneinander zeigt. Die Vektor-PDF-Wege nutzen `legendNote`.
   */
  legendNoteSpalten?: [string, string]
  /** Bildordner unter public/parcours (z. B. alcatraz_Parcours). */
  courseImageDir?: string
  /**
   * Ohne vorgebautes Bild (`bildImBrowser`): Der Browser erzeugt es aus dem Quellbild in
   * `courseImageDir` (siehe lib/parcoursbild.ts).
   */
  bildErzeugen?: { dim: string[]; aus: string[] }
  /** Bild-Drehung in Grad: 0 | 90 | -90 | 180. */
  bildDrehung?: number
  /** Breite des gedrehten Bildes neben der Legende in mm (Standard siehe CSS). */
  bildBreite?: number
  /** Bild rechts neben Fehlerpunkten und Beschreibung, darunter die Disqualifikationen. */
  bildNeben?: boolean
  /**
   * Was die Legende zeigt, wenn eine Klasse keine Fehler-Spalte hat (z. B. Berlin
   * Rechts unter Klasse 4 ohne MüB). Siehe defFuerKlasse.
   */
  ohneCodes?: { legendNote?: string; legendNoteSpalten?: [string, string]; disqTable?: DisqDef[] }
}

/** Ein Bogen = konkrete Instanz eines Listentyps für Klasse + Lauf. */
export interface Bogen {
  id: string
  typeId: SheetTypeId
  klasse: ClassId
  lauf: Lauf
}

/**
 * Eingetragene Werte: Lauf → Zeile → Feld → Wert, z. B.
 * eingaben["manoevrieren/4/1"]["401"]["t1a|hin seiteA"] = "5". Der Lauf-Schlüssel enthält
 * Disziplin, Klasse und Lauf (siehe lib/eingaben), das Feld die Kennung aus config/feld.ts.
 * Die Werte hängen damit nicht an der Bogen-Auswahl und nicht am Aufbau.
 */
export type Eingaben = Record<string, Record<string, Record<string, string>>>

/** Name eines Starters für die Ergebnislisten. */
export interface Starter {
  name: string
  vorname: string
}

/** Wann sich eine Ergebnisliste zuletzt geändert hat. */
export interface ListenStand {
  /** Prüfsumme dessen, was auf der Liste steht. */
  inhalt: number
  /** Zeitpunkt der letzten Änderung in Millisekunden. */
  zeit: number
}

/** Parcours einer Veranstaltung: 1, oder 2 bei zwei Parcours. */
export type ParcoursNr = 1 | 2

/**
 * WKR-Einteilung der Veranstaltung (KONZEPT-NAMEN-FREIHAND.md §1): Namen je Liste, mit zwei
 * Parcours je Parcours. Der Name auf einem Bogen (`wkr`) geht vor.
 */
export interface Einteilung {
  zweiParcours: boolean
  /** Klassen auf Parcours 2; die übrigen fahren auf Parcours 1. */
  parcours2: ClassId[]
  /** Namen je Parcours und Liste, z. B. namen[1]["steg"]. */
  namen: Record<ParcoursNr, Record<string, string>>
}

export interface AppState {
  eventName: string
  /** Gewähltes Regelwerk mit Version, z. B. "dm-2026" oder "uim-2026". */
  regelwerk: string
  /** Sprache der Listen; wirkt nur, wenn das Regelwerk Englisch anbietet. */
  sprache: Sprache
  /** Gewählter Aufbau (Setup), z. B. "alcatraz" oder "frontal". */
  aufbau: string
  /** Eine Person übernimmt Tor 5 und die Parcoursüberwachung (wo der Aufbau es erlaubt). */
  tor5MitParcours: boolean
  /** Gesamtliste: schon ab zwei Läufen einen streichen; sonst (Regelfall) erst ab drei. */
  streichenAbZwei: boolean
  /** Gewähltes Bezeichnungs-Schema (Bojen-Kürzel), z. B. "rl" oder "ls". */
  beschriftung: string
  /** Anzahl leerer Zeilen, die nach den Startnummern angehängt werden. */
  emptyRows: number
  /**
   * Startnummern pro Druckseite. 0 = keine feste Aufteilung (eine durchlaufende
   * Seite, Browser bricht bei Bedarf selbst um). > 0 = nach so vielen Startern
   * beginnt eine neue Seite (Minimum 5); jede Seite trägt Legende/Bild/Leerzeilen
   * und eine mittige „Seite n / X"-Angabe.
   */
  rowsPerPage: number
  /**
   * Aufteilen erst ab so vielen Startern (nur mit rowsPerPage > 0): kleinere
   * Klassen bleiben eine Seite, z. B. ab 25 Startern je 15 pro Seite, 16-24
   * bleiben zusammen. 0 = jede Klasse mit mehr als rowsPerPage Startern.
   */
  splitFrom: number
  /**
   * „Anne-Feature“: Die Beschreibung (Legende + Parcoursbild) steht nicht unter
   * der Tabelle, sondern auf einer eigenen Rückseite je Blatt - für den
   * doppelseitigen Druck, so ausgerichtet, dass sie beim Nach-oben-Klappen des
   * Blatts von unten lesbar ist.
   */
  descriptionOnBack: boolean
  /** Startnummern je Klasse (Reihenfolge = Startreihenfolge). */
  numbers: Partial<Record<ClassId, string[]>>
  /**
   * Klassen-Reihenfolge der Schnellauswahl, z. B. 1, 3, E, 2, 5, 7, 4, 6. Nicht
   * enthaltene Klassen lässt die Schnellauswahl aus. Standard: E, 1 … 7.
   */
  classOrder: ClassId[]
  /** WKR-Name je Lauf und Liste, z. B. wkr["manoevrieren/4/1/steg"]. Geht der Einteilung vor. */
  wkr: Record<string, string>
  /** WKR-Einteilung: Namen je Liste für alle Bögen, mit zwei Parcours je Parcours. */
  einteilung: Einteilung
  /** Aktuell im Setup zusammengestellte Bögen. */
  boegen: Bogen[]
  /** Eingetragene Zellwerte. */
  eingaben: Eingaben
  /** Namen je Klasse und Startnummer. Bleiben lokal, der Einstellungs-Link enthält sie nicht. */
  starter: Partial<Record<ClassId, Record<string, Starter>>>
  /** Stand je Ergebnisliste, unter ihrem Lauf-Schlüssel bzw. gesamtSchluessel (lib/ergebnis). */
  listenStand: Record<string, ListenStand>
  initialized: boolean
}
