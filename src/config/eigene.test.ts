import { afterEach, describe, expect, it } from 'vitest'
import { reducer } from '../state/store'
import { defaultState } from '../state/initState'
import { decodeShareConfig, encodeShareConfig, toShareConfig } from '../lib/sharelink'
import {
  aufbauAlsYaml,
  getAufbau,
  getAufbauten,
  getEigeneAufbauten,
  getSheetDef,
  getVerdeckteEigene,
  pruefeEigeneAufbauten,
  setzeEigeneAufbauten,
} from './active'
import { ausLinkUebernehmen } from './eigene'
import type { RawAufbau } from './schema'

/** Ein eigener Aufbau wie aus dem Assistenten oder einer Datei (KONZEPT-POSITIONEN.md §4.1). */
const sommercup: RawAufbau = {
  id: 'sommercupx7k2',
  name: 'Sommercup',
  positionen: [
    'zeit',
    'steg',
    { id: 'sc135', titel: 'Tor 1 / 3 / 5', blick: 'hinten', bojen: ['StartZiel_unten', 'Tor1', 'Tor3', 'Tor5_unten', 'Speedboje_unten'], aufgaben: ['tor5'] },
    { id: 'sc245', titel: 'Tor 2 / 4 / 5', blick: 'links', bojen: ['StartZiel_oben', 'Tor2', 'Tor4', 'Tor5_oben', 'Speedboje_oben'], bildNeben: true },
    'mueb',
    'parcours',
  ],
}

const fehlerVon = (aufbau: unknown) => pruefeEigeneAufbauten({ aufbauten: [aufbau] }).fehler

afterEach(() => setzeEigeneAufbauten([]))

describe('Prüfung eigener Aufbauten', () => {
  it('übernimmt einen vollständigen Aufbau ohne Fehler und Hinweise', () => {
    const p = pruefeEigeneAufbauten({ aufbauten: [sommercup] })
    expect(p.fehler).toEqual([])
    expect(p.hinweise).toEqual([])
    expect(p.aufbauten.map((a) => a.id)).toEqual(['sommercupx7k2'])
  })

  it('weist kaputte Dateien und Kollisionen mit dem Prototyp ab', () => {
    expect(pruefeEigeneAufbauten('aufbauten: [').fehler[0]).toMatch(/kein gültiges YAML/)
    expect(pruefeEigeneAufbauten('positionen: []').fehler[0]).toMatch(/keinen Aufbau/)
    expect(fehlerVon({ ...sommercup, id: 'Sommer-Cup' })[0]).toMatch(/Kleinbuchstaben und Ziffern/)
    expect(fehlerVon({ ...sommercup, id: 'alcatraz' })[0]).toMatch(/gibt es schon im Prototyp/)
    const mitGate = { ...sommercup, positionen: [{ id: 'gate135', titel: 'X', bojen: ['Tor1'] }] }
    expect(fehlerVon(mitGate)[0]).toMatch(/Position „gate135“ gibt es schon/)
  })

  it('prüft Bojen und Verweise wie die Dateien im Repo', () => {
    expect(fehlerVon({ ...sommercup, positionen: [{ id: 'x1', titel: 'X', bojen: ['Tor9'] }] }).join()).toMatch(/Unbekannte Boje "Tor9"/)
    expect(fehlerVon({ ...sommercup, positionen: ['gibtsnicht'] }).join()).toMatch(/unbekannte Position "gibtsnicht"/)
  })

  it('übernimmt einen lückenhaften Aufbau mit Hinweisen', () => {
    const p = pruefeEigeneAufbauten({ aufbauten: [{ id: 'nursteg', name: 'Nur Steg', positionen: ['steg'] }] })
    expect(p.fehler).toEqual([])
    expect(p.aufbauten).toHaveLength(1)
    expect(p.hinweise.length).toBeGreaterThan(0)
  })
})

describe('Eigene Aufbauten in der Konfiguration', () => {
  it('stehen hinter denen aus dem Repo, ihre Positionen erzeugen das Bild im Browser', () => {
    setzeEigeneAufbauten([sommercup])
    expect(getAufbauten().at(-1)?.id).toBe('sommercupx7k2')
    expect(getAufbau('sommercupx7k2')).toMatchObject({ eigen: true, order: ['zeit', 'steg', 'sc135', 'sc245', 'mueb', 'parcours'] })
    expect(getSheetDef('sc135').courseImageDir).toBe('alcatraz_Parcours')
    expect(getSheetDef('sc245').bildErzeugen?.aus.length).toBeGreaterThan(0) // neben der Legende: ohne Ziffern
  })

  it('weichen einem Aufbau aus dem Repo mit derselben ID', () => {
    setzeEigeneAufbauten([{ ...sommercup, id: 'alcatraz', positionen: ['steg'] }])
    expect(getAufbau('alcatraz').eigen).toBeUndefined()
    expect(getVerdeckteEigene().map((a) => a.id)).toEqual(['alcatraz'])
  })

  it('gehen als YAML hin und zurück, ohne interne Kennzeichen', () => {
    setzeEigeneAufbauten([sommercup])
    const text = aufbauAlsYaml('sommercupx7k2', { datum: '2026-11-08', version: 'test' })!
    expect(text).toContain('# Aufbau „Sommercup“')
    expect(text).not.toMatch(/eigen:|bildImBrowser/)
    setzeEigeneAufbauten([])
    expect(pruefeEigeneAufbauten(text).aufbauten).toEqual([sommercup])
  })
})

describe('Weitergabe per Link', () => {
  it('nimmt den eigenen Aufbau in den Einstellungs-Link mit', () => {
    setzeEigeneAufbauten([sommercup])
    const cfg = toShareConfig({ ...defaultState(), aufbau: 'sommercupx7k2' })
    expect(cfg.eigenerAufbau).toEqual(sommercup)
    expect(decodeShareConfig(encodeShareConfig(cfg))?.eigenerAufbau).toEqual(sommercup)
    expect(toShareConfig({ ...defaultState(), aufbau: 'alcatraz' }).eigenerAufbau).toBeUndefined()
  })

  it('der Link hat Vorrang, ein abweichender lokaler bleibt als Kopie mit eigenen Positionen', () => {
    expect(ausLinkUebernehmen([sommercup], sommercup)).toEqual([sommercup])
    const geaendert = { ...sommercup, name: 'Sommercup 2' }
    const liste = ausLinkUebernehmen([sommercup], geaendert)
    expect(liste.map((a) => a.id)).toEqual(['sommercupx7k2kopie2', 'sommercupx7k2'])
    expect(liste[0].positionen).toContainEqual(expect.objectContaining({ id: 'sc135k2' }))
    expect(liste[1]).toEqual(geaendert)
  })
})

describe('Laden und Löschen im Zustand', () => {
  it('wechselt zum geladenen Aufbau und räumt beim Löschen seine Bögen weg', () => {
    const geladen = reducer(defaultState(), { type: 'SET_EIGENE_AUFBAUTEN', aufbauten: [sommercup], aufbau: 'sommercupx7k2' })
    expect(geladen.aufbau).toBe('sommercupx7k2')
    expect(geladen.boegen.some((b) => b.typeId === 'sc135')).toBe(true)
    expect(getEigeneAufbauten()).toEqual([sommercup])

    const geloescht = reducer(geladen, { type: 'SET_EIGENE_AUFBAUTEN', aufbauten: [], aufbau: 'alcatraz' })
    expect(geloescht.aufbau).toBe('alcatraz')
    expect(geloescht.boegen.some((b) => b.typeId === 'sc135')).toBe(false)
  })
})
