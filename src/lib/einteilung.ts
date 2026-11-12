import { CLASS_IDS, type ClassId, type Einteilung, type ParcoursNr } from '../types'

// WKR-Einteilung (KONZEPT-NAMEN-FREIHAND.md §1): Wer an welcher Liste sitzt, einmal für die
// Veranstaltung statt auf jedem Bogen. Mit zwei Parcours fährt jede Klasse auf einem von
// beiden, und jeder hat eigene Namen. Die Einteilung gehört zur Veranstaltung, nicht zum
// Aufbau: Sie bleibt im Browser und steht weder im Aufbau noch im Einstellungs-Link.

export function leereEinteilung(): Einteilung {
  return { zweiParcours: false, parcours2: [], namen: { 1: {}, 2: {} } }
}

/** Der Parcours einer Klasse; mit nur einem Parcours immer 1. */
export function parcoursVon(e: Einteilung, klasse: string): ParcoursNr {
  return e.zweiParcours && (e.parcours2 as string[]).includes(klasse) ? 2 : 1
}

/** Der Name aus der Einteilung für eine Liste in einer Klasse, '' wenn keiner da ist. */
export function nameAusEinteilung(e: Einteilung | undefined, typeId: string, klasse: string): string {
  if (!e) return ''
  return e.namen[parcoursVon(e, klasse)][typeId]?.trim() ?? ''
}

/** Setzt den Namen einer Liste auf einem Parcours; leer entfernt ihn. */
export function setzeName(e: Einteilung, parcours: ParcoursNr, typeId: string, name: string): Einteilung {
  const { [typeId]: _alt, ...rest } = e.namen[parcours]
  const liste = name.trim() ? { ...rest, [typeId]: name } : rest
  return { ...e, namen: { ...e.namen, [parcours]: liste } }
}

/** Schiebt eine Klasse auf den anderen Parcours. */
export function klasseWechseln(e: Einteilung, klasse: ClassId): Einteilung {
  const parcours2 = e.parcours2.includes(klasse) ? e.parcours2.filter((k) => k !== klasse) : [...e.parcours2, klasse]
  return { ...e, parcours2: CLASS_IDS.filter((k) => parcours2.includes(k)) }
}

function namenListe(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}
  return Object.fromEntries(Object.entries(raw).filter((x): x is [string, string] => typeof x[1] === 'string'))
}

/** Eine gespeicherte Einteilung, bereinigt; Unbrauchbares wird zur leeren. */
export function normalisiereEinteilung(raw: unknown): Einteilung {
  if (!raw || typeof raw !== 'object') return leereEinteilung()
  const r = raw as Partial<Record<keyof Einteilung, unknown>>
  const namen = (r.namen && typeof r.namen === 'object' ? r.namen : {}) as Record<string, unknown>
  return {
    zweiParcours: r.zweiParcours === true,
    parcours2: Array.isArray(r.parcours2) ? CLASS_IDS.filter((k) => (r.parcours2 as unknown[]).includes(k)) : [],
    namen: { 1: namenListe(namen[1]), 2: namenListe(namen[2]) },
  }
}
