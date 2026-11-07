import { dump as yamlDump, load as yamlLoad } from 'js-yaml'
import { aufloesen, istInlineKurzform } from './kurzform'
import type { RawAufbau, RawKurzform, RawQuelle, RawRegelwerk } from './schema'
import { kurzformBefunde, validateRawConfig } from './validate'

// Eigene Aufbauten (KONZEPT-POSITIONEN.md §8): Sie liegen im Browser, nicht im Repo, und
// werden per Einstellungs-Link oder YAML-Datei weitergegeben. Ihre Positionen stehen in
// Kurzform direkt im Aufbau und erzeugen ihr Parcoursbild im Browser. Was von außen kommt
// (Datei, Link), läuft vor der Übernahme durch dieselbe Prüfung wie die Dateien im Repo.

/** IDs von Aufbauten und Positionen: Sie stehen auch in Link und QR-Code (§9). */
export const ID_MUSTER = /^[a-z0-9]+$/

/**
 * Die Positionsdateien mit den eigenen Aufbauten dahinter. Ihre Positionen bekommen
 * `bildImBrowser`. Ein eigener Aufbau mit der ID eines Aufbaus aus dem Repo entfällt:
 * Der aus dem Repo gilt (§8, Übernahme ins Repo).
 */
export function mitEigenen(quelle: RawQuelle, eigene: RawAufbau[]): RawQuelle {
  const imRepo = new Set((quelle.aufbauten ?? []).map((a) => a.id))
  const dazu = eigene
    .filter((a) => !imRepo.has(a.id))
    .map(
      (a): RawAufbau => ({
        ...a,
        eigen: true,
        positionen: a.positionen.map((e) => (istInlineKurzform(e) ? { ...e, bildImBrowser: true } : e)),
      }),
    )
  return { ...quelle, aufbauten: [...(quelle.aufbauten ?? []), ...dazu] }
}

/** Eigene Aufbauten, die ein Aufbau aus dem Repo mit derselben ID verdeckt. */
export function verdeckteEigene(quelle: RawQuelle, eigene: RawAufbau[]): RawAufbau[] {
  const imRepo = new Set((quelle.aufbauten ?? []).map((a) => a.id))
  return eigene.filter((a) => imRepo.has(a.id))
}

export interface Pruefung {
  /** Die geprüften Aufbauten; leer, wenn es Fehler gibt. */
  aufbauten: RawAufbau[]
  fehler: string[]
  /** Nicht blockierend, z. B. eine Boje, die keine Liste beobachtet. */
  hinweise: string[]
}

/** Nur die Felder, die ein eigener Aufbau haben darf: ohne interne Kennzeichen. */
function bereinigt(a: RawAufbau): RawAufbau {
  const { eigen: _eigen, ...rest } = a
  return {
    ...rest,
    positionen: rest.positionen.map((e) => {
      if (!istInlineKurzform(e)) return e
      const { bildImBrowser: _bild, ...position } = e
      return position as RawKurzform
    }),
  }
}

/**
 * Prüft eigene Aufbauten aus einer Datei (YAML-Text) oder einem Link (Objekt), bevor sie
 * übernommen werden. `vorhanden` sind die schon gespeicherten eigenen Aufbauten: Einer mit
 * derselben ID wird ersetzt, die übrigen müssen weiter passen.
 */
export function pruefeEigene(eingabe: unknown, quelle: RawQuelle, regelwerk: RawRegelwerk, vorhanden: RawAufbau[] = []): Pruefung {
  const fehler: string[] = []
  let daten = eingabe
  if (typeof eingabe === 'string') {
    try {
      daten = yamlLoad(eingabe)
    } catch (e) {
      return { aufbauten: [], fehler: [`Die Datei ist kein gültiges YAML: ${(e as Error).message.split('\n')[0]}`], hinweise: [] }
    }
  }
  const liste = (daten as { aufbauten?: unknown })?.aufbauten
  if (!Array.isArray(liste) || liste.length === 0)
    return { aufbauten: [], fehler: ['Die Datei enthält keinen Aufbau (Abschnitt „aufbauten:“ fehlt oder ist leer).'], hinweise: [] }
  if ((daten as { positionen?: unknown }).positionen !== undefined)
    fehler.push('Positionen stehen bei eigenen Aufbauten direkt im Aufbau, nicht in einem eigenen Abschnitt „positionen:“.')

  const imRepo = new Set((quelle.aufbauten ?? []).map((a) => a.id))
  const positionenImRepo = new Set(quelle.positionen.map((p) => p.id))
  const aufbauten: RawAufbau[] = []
  for (const roh of liste) {
    const a = roh as Partial<RawAufbau>
    const name = `„${a?.name ?? a?.id ?? '?'}“`
    if (!a || typeof a !== 'object' || typeof a.id !== 'string' || !ID_MUSTER.test(a.id)) {
      fehler.push(`Aufbau ${name}: Die id darf nur Kleinbuchstaben und Ziffern enthalten.`)
      continue
    }
    if (typeof a.name !== 'string' || !a.name.trim()) fehler.push(`Aufbau „${a.id}“ hat keinen Namen.`)
    if (imRepo.has(a.id)) fehler.push(`Den Aufbau „${a.id}“ gibt es schon im Prototyp. Bitte eine andere id wählen.`)
    if (!Array.isArray(a.positionen) || a.positionen.length === 0) {
      fehler.push(`Aufbau „${a.id}“ hat keine Positionen.`)
      continue
    }
    for (const e of a.positionen) {
      if (!istInlineKurzform(e)) continue
      if (typeof e.id !== 'string' || !ID_MUSTER.test(e.id))
        fehler.push(`Aufbau „${a.id}“: Die id der Position „${e.titel ?? '?'}“ darf nur Kleinbuchstaben und Ziffern enthalten.`)
      else if (positionenImRepo.has(e.id)) fehler.push(`Aufbau „${a.id}“: Die Position „${e.id}“ gibt es schon im Prototyp.`)
    }
    aufbauten.push(bereinigt(a as RawAufbau))
  }
  if (fehler.length > 0) return { aufbauten: [], fehler, hinweise: [] }

  // Dieselbe Prüfung wie für die Dateien im Repo, mit den übrigen eigenen Aufbauten.
  const neu = new Set(aufbauten.map((a) => a.id))
  const zusammen = mitEigenen(quelle, [...vorhanden.filter((a) => !neu.has(a.id)), ...aufbauten])
  const befunde = [...kurzformBefunde(zusammen), ...validateRawConfig({ ...regelwerk, ...aufloesen(zusammen) })]
  const text = (b: { message: string }) => b.message
  return {
    aufbauten: befunde.some((b) => b.severity === 'error') ? [] : aufbauten,
    fehler: befunde.filter((b) => b.severity === 'error').map(text),
    hinweise: befunde.filter((b) => b.severity === 'warning').map(text),
  }
}

/** Ein Aufbau als YAML-Datei in der Form, die auch im Repo gilt (§4.1, §8). */
export function aufbauYaml(aufbau: RawAufbau, kopf: { datum: string; version: string; regelwerk: string }): string {
  return (
    `# Aufbau „${aufbau.name}“ aus dem Fehlerpunkte-Prototyp\n` +
    `# Datum: ${kopf.datum} · App-Version: ${kopf.version} · Regelwerk: ${kopf.regelwerk}\n` +
    '# Laden: „Eigenen Aufbau laden“ in der App. Übernahme ins Repo: Datei nach\n' +
    '# src/config/aufbauten/ legen und in aufbauten.yaml eintragen (KONZEPT-POSITIONEN.md §8).\n' +
    yamlDump({ aufbauten: [bereinigt(aufbau)] }, { lineWidth: -1, noRefs: true })
  )
}

/**
 * Übernimmt einen eigenen Aufbau aus einem Link: Der Link hat Vorrang. Gibt es lokal einen
 * mit derselben ID, aber anderem Inhalt, bleibt der lokale als Kopie unter neuer ID erhalten.
 */
export function ausLinkUebernehmen(lokal: RawAufbau[], ausLink: RawAufbau): RawAufbau[] {
  const bisher = lokal.find((a) => a.id === ausLink.id)
  const andere = lokal.filter((a) => a.id !== ausLink.id)
  if (!bisher || JSON.stringify(bereinigt(bisher)) === JSON.stringify(bereinigt(ausLink))) return [...andere, ausLink]
  const vergeben = new Set(lokal.map((a) => a.id))
  let n = 2
  while (vergeben.has(`${bisher.id}kopie${n}`)) n++
  // Positionen gelten überall unter ihrer ID: Die Kopie bekommt eigene.
  const kopie: RawAufbau = {
    ...bisher,
    id: `${bisher.id}kopie${n}`,
    name: `${bisher.name} (Kopie)`,
    positionen: bisher.positionen.map((e) => (istInlineKurzform(e) ? { ...e, id: `${e.id}k${n}` } : e)),
  }
  return [...andere, kopie, ausLink]
}
