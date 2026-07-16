// Kern-Datenmodell des Fehlerpunkte-Prototyps.
//
// Ein "Bogen" (WKR-Liste) entsteht aus der Kombination von Listentyp,
// Klasse und Lauf. Der Aufbau der Bögen ist datengetrieben über SheetDef
// beschrieben - ein einziger generischer Renderer stellt alle Typen dar.

export type ClassId = 'E' | '1' | '2' | '3' | '4' | '5' | '6' | '7'

/** Design einer Spalten-Trennlinie. */
export type TrennerDesign = 'fett' | 'doppelt' | 'gepunktet' | 'gestrichelt'

export const CLASS_IDS: ClassId[] = ['E', '1', '2', '3', '4', '5', '6', '7']

export type Lauf = 1 | 2 | 3

/**
 * Kennung einer Position/Liste. Frei konfigurierbar (siehe config/positionen.yaml),
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
  /** Zeigt die Disqualifikations-Tabelle in der Legende (= disqTable vorhanden). */
  showDisqTable?: boolean
  /** Zusätzliche Hinweiszeile in der Legende. */
  legendNote?: string
  /** Bildordner unter public/parcours (z. B. alcatraz_Parcours). */
  courseImageDir?: string
  /** Bild-Drehung in Grad: 0 | 90 | -90 | 180. */
  bildDrehung?: number
}

/** Ein Bogen = konkrete Instanz eines Listentyps für Klasse + Lauf. */
export interface Bogen {
  id: string
  typeId: SheetTypeId
  klasse: ClassId
  lauf: Lauf
}

/** Zellwerte werden flach als Map gespeichert: bogenId → "nr:colKey" → value. */
export type SheetValues = Record<string, Record<string, string>>

export interface AppState {
  eventName: string
  /** Gewählter Aufbau (Setup), z. B. "alcatraz" oder "frontal". */
  aufbau: string
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
  /** Startnummern je Klasse (Reihenfolge = Startreihenfolge). */
  numbers: Partial<Record<ClassId, number[]>>
  /** WKR-Name je Bogen. */
  wkr: Record<string, string>
  /** Aktuell im Setup zusammengestellte Bögen. */
  boegen: Bogen[]
  /** Eingetragene Zellwerte. */
  values: SheetValues
  initialized: boolean
}
