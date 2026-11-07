import { beforeEach, describe, expect, it } from 'vitest'
import { applyRegelwerk, aufbauOrder, bundledConfig, getAufbauten, initConfig, positionAllowsClass } from '../config/active'
import { defaultState } from '../state/initState'
import { reducer } from '../state/store'
import type { AppState, Bogen, ClassId, Lauf } from '../types'
import { beispielEingaben, beispielwerteErsetzen } from './beispielwerte'
import { bogenLauf, felderJeKennung, laufSchluessel, listenFelder, OHNE_LAUF } from './eingaben'
import { klassenErgebnis } from './ergebnis'
import { parseTime } from './time'

beforeEach(() => {
  initConfig(bundledConfig())
  applyRegelwerk('dm-2026')
})

/** Reproduzierbarer Zufall (mulberry32). */
function zufallAus(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const bogen = (typeId: string, klasse: ClassId = '4', lauf: Lauf = 1): Bogen => ({ id: `${typeId}-${klasse}-${lauf}`, typeId, klasse, lauf })
const nummern = (n: number) => Array.from({ length: n }, (_, i) => String(401 + i))

function stand(boegen: Bogen[], numbers: string[] = nummern(20), klasse: ClassId = '4'): AppState {
  return { ...defaultState(), boegen, numbers: { [klasse]: numbers } }
}

const lauf1 = (lauf: number = 1, klasse = '4') => laufSchluessel('manoevrieren', klasse, lauf)

function median(werte: number[]): number {
  return [...werte].sort((a, b) => a - b)[Math.floor(werte.length / 2)]
}

describe('Zeiten', () => {
  it('Stoppuhr: 2 bis 3 Zeiten als Minuten,SekundenHundertstel, die nah beieinander liegen', () => {
    const state = stand([bogen('zeit')])
    const zeilen = beispielEingaben(state, 'stoppuhr', zufallAus(1))[lauf1()]
    const anzahlen = new Set<number>()
    for (const nr of nummern(20)) {
      const zeiten = Object.values(zeilen[nr])
      anzahlen.add(zeiten.length)
      for (const z of zeiten) expect(z).toMatch(/^\d,\d{4}$/)
      const centis = zeiten.map((z) => parseTime(z)!.centis)
      expect(Math.max(...centis) - Math.min(...centis)).toBeLessThan(150)
    }
    expect(anzahlen).toEqual(new Set([2, 3]))
  })

  it('Lichtschranke: genau eine Zeit als Sekunden,Hundertstel in der ersten Spalte', () => {
    const state = stand([bogen('zeit')])
    const zeilen = beispielEingaben(state, 'lichtschranke', zufallAus(2))[lauf1()]
    for (const nr of nummern(20)) {
      expect(Object.keys(zeilen[nr])).toEqual(['zeit1'])
      expect(zeilen[nr].zeit1).toMatch(/^\d{2,3},\d{2}$/)
      const [sek, hundertstel] = zeilen[nr].zeit1.split(',').map(Number)
      expect(parseTime(zeilen[nr].zeit1)?.centis).toBe(sek * 100 + hundertstel)
    }
  })

  it('Lichtschranke räumt die Stoppuhr-Zeiten eines früheren Klicks weg', () => {
    const state = stand([bogen('zeit')])
    const eingaben = beispielEingaben(state, 'stoppuhr', zufallAus(3))
    const danach = beispielEingaben({ ...state, eingaben }, 'lichtschranke', zufallAus(4))
    for (const nr of nummern(20)) expect(Object.keys(danach[lauf1()][nr])).toEqual(['zeit1'])
  })

  it('schreibt bei Alcatraz-DM26 die Stoppuhr-Zeiten auf die Stoppuhr-Listen, die Lichtschranke auf ihre', () => {
    const state = { ...stand(['zeit-1', 'zeit-2', 'zeit-3'].map((t) => bogen(t))), aufbau: 'alcatrazdm26' }
    const stoppuhr = beispielEingaben(state, 'stoppuhr', zufallAus(5))[lauf1()]
    for (const nr of nummern(20)) expect(Object.keys(stoppuhr[nr]).sort()).toEqual(['zeit1~2', 'zeit1~3'])
    const lichtschranke = beispielEingaben(state, 'lichtschranke', zufallAus(5))[lauf1()]
    for (const nr of nummern(20)) expect(Object.keys(lichtschranke[nr])).toEqual(['zeit1'])
  })

  it('trifft die Zeiten der Klasse aus der DM 2026', () => {
    const median7 = (klasse: ClassId, nrs: string[]) => {
      const state = stand([bogen('zeit', klasse)], nrs, klasse)
      const zeilen = beispielEingaben(state, 'lichtschranke', zufallAus(6))[lauf1(1, klasse)]
      return median(nrs.map((nr) => parseTime(zeilen[nr].zeit1)!.centis / 100))
    }
    const viele = Array.from({ length: 800 }, (_, i) => `N${i}`)
    expect(median7('2', viele)).toBeGreaterThan(70)
    expect(median7('2', viele)).toBeLessThan(80)
    expect(median7('7', viele)).toBeGreaterThan(112)
    expect(median7('7', viele)).toBeLessThan(128)
  })

  it('lässt eine Person über die Läufe ähnlich schnell, auch wenn sie einzeln gefüllt werden', () => {
    const viele = Array.from({ length: 300 }, (_, i) => `N${i}`)
    const erst = stand([bogen('zeit', '7', 1)], viele, '7')
    const zeit = (e: AppState['eingaben'], lauf: number, nr: string) => parseTime(e[lauf1(lauf, '7')][nr].zeit1)!.centis / 100
    const eins = beispielEingaben(erst, 'lichtschranke', zufallAus(7))
    const zwei = beispielEingaben({ ...erst, boegen: [bogen('zeit', '7', 2)], eingaben: eins }, 'lichtschranke', zufallAus(8))
    const differenzen = viele.map((nr) => Math.abs(zeit(zwei, 1, nr) - zeit(zwei, 2, nr)))
    expect(median(differenzen)).toBeLessThan(5)
  })
})

describe('Geltungsbereich', () => {
  it('ändert nur die angezeigten Bögen', () => {
    const state = reducer(stand([bogen('zeit')]), {
      type: 'SET_VALUE',
      bogen: bogen('steg'),
      cell: '401:fehlerAB',
      value: '3',
    })
    const anderer = reducer(state, { type: 'SET_VALUE', bogen: bogen('zeit', '4', 2), cell: '401:zeit1', value: '80,00' })
    const eingaben = beispielEingaben(anderer, 'stoppuhr', zufallAus(9))
    expect(eingaben[lauf1()]['401']['katalog:stegAblegen']).toBe('3')
    expect(eingaben[lauf1(2)]).toEqual(anderer.eingaben[lauf1(2)])
    expect(eingaben[lauf1()]['401'].zeit1).toBeTruthy()
  })

  it('lässt Bemerkungen, Leerzeilen und WKR-Namen stehen', () => {
    const steg = bogen('steg')
    let state = stand([steg])
    state = reducer(state, { type: 'SET_VALUE', bogen: steg, cell: '401:bemerkung', value: 'Motor aus' })
    state = reducer(state, { type: 'SET_VALUE', bogen: steg, cell: '_p0_x0:__nr', value: '499' })
    state = reducer(state, { type: 'SET_WKR', bogen: steg, name: 'Muster' })
    const danach = reducer(state, { type: 'SET_BEISPIELWERTE', zeitnahme: 'stoppuhr' })
    expect(danach.eingaben[lauf1()]['401']['bemerkung@steg']).toBe('Motor aus')
    expect(danach.eingaben[lauf1()]['_p0_x0']).toEqual({ __nr: '499' })
    expect(danach.wkr).toEqual(state.wkr)
  })

  it('schreibt die Knoten einmal je Starter, ohne Lauf und ohne Zeit', () => {
    const state = stand([bogen('knoten', 'E')], Array.from({ length: 60 }, (_, i) => `E${i}`), 'E')
    const eingaben = beispielEingaben(state, 'stoppuhr', zufallAus(10))
    const zeilen = eingaben[laufSchluessel('manoevrieren', 'E', OHNE_LAUF)]
    const werte = Object.values(zeilen).flatMap((z) => Object.values(z))
    expect(werte.length).toBeGreaterThan(0)
    expect(new Set(werte)).toEqual(new Set(['5']))
    expect(Object.keys(eingaben)).toHaveLength(1)
  })

  it('meldet vorhandene Werte vor dem Ersetzen, Bemerkungen zählen nicht', () => {
    const steg = bogen('steg')
    const leer = stand([steg])
    expect(beispielwerteErsetzen(leer)).toBe(false)
    const mitBemerkung = reducer(leer, { type: 'SET_VALUE', bogen: steg, cell: '401:bemerkung', value: 'x' })
    expect(beispielwerteErsetzen(mitBemerkung)).toBe(false)
    const mitWert = reducer(leer, { type: 'SET_VALUE', bogen: steg, cell: '401:fehlerAB', value: '3' })
    expect(beispielwerteErsetzen(mitWert)).toBe(true)
    expect(beispielwerteErsetzen({ ...mitWert, boegen: [bogen('zeit')] })).toBe(false)
  })
})

describe('Gültigkeit', () => {
  it.each(['dm-2026', 'uim-2026'])('erzeugt in %s in jedem Aufbau nur gültige Werte', (regelwerk) => {
    applyRegelwerk(regelwerk)
    const klassen: ClassId[] = regelwerk === 'uim-2026' ? ['E', '1', '4', '5'] : ['E', '1', '4', '7']
    for (const aufbau of getAufbauten()) {
      for (const klasse of klassen) {
        const boegen = aufbauOrder(aufbau.id, false)
          .filter((t) => positionAllowsClass(t, klasse))
          .map((t) => bogen(t, klasse))
        const numbers = Array.from({ length: 40 }, (_, i) => `N${i}`)
        const state = { ...stand(boegen, numbers, klasse), aufbau: aufbau.id }
        const eingaben = beispielEingaben(state, 'stoppuhr', zufallAus(11))
        const felder = felderJeKennung(klasse, aufbauOrder(aufbau.id, false))
        for (const zeile of Object.values(eingaben[bogenLauf(aufbau.id, boegen[0])])) {
          for (const [kennung, wert] of Object.entries(zeile)) expect(felder.get(kennung)?.gueltig(wert)).toBe(wert)
        }
      }
    }
  })

  it('schreibt keine Fehlercodes, die der Katalog nicht kennt, und wiederholt nur Versuche', () => {
    const felder = listenFelder('mueb', '4')
    const katalog = new Set(felder.find((f) => f.kind === 'code')?.katalog?.map((e) => e.code))
    const numbers = Array.from({ length: 300 }, (_, i) => `N${i}`)
    const zeilen = beispielEingaben(stand([bogen('mueb')], numbers), 'stoppuhr', zufallAus(12))[lauf1()]
    const eintraege = Object.values(zeilen).flatMap((z) => (z['katalog:mueb'] ?? '').split(', ').filter((e) => /^\d/.test(e)))
    expect(eintraege.length).toBeGreaterThan(50)
    for (const e of eintraege) {
      const [code, faktor] = e.split('x').reverse()
      expect(katalog.has(code)).toBe(true)
      if (faktor) expect(code).toBe('19')
    }
  })
})

describe('Ergebnis', () => {
  function kompletterLauf(klasse: ClassId, n: number, seed: number) {
    const boegen = aufbauOrder('alcatraz', false)
      .filter((t) => positionAllowsClass(t, klasse))
      .map((t) => bogen(t, klasse))
    const numbers = Array.from({ length: n }, (_, i) => `N${i}`)
    const state: AppState = { ...stand(boegen, numbers, klasse), aufbau: 'alcatraz' }
    return { ...state, eingaben: beispielEingaben(state, 'stoppuhr', zufallAus(seed)) }
  }

  it('trifft bei einem kompletten Lauf die Quoten der DM 2026', () => {
    const zeilen = klassenErgebnis(kompletterLauf('6', 1000, 13), '6')!.laeufe[0].nachNummer
    const disq = zeilen.filter((z) => z.disq).length / zeilen.length
    expect(disq).toBeGreaterThan(0.25)
    expect(disq).toBeLessThan(0.37)
    const strafe = zeilen.reduce((s, z) => s + z.strafpunkte, 0) / zeilen.length
    expect(strafe).toBeGreaterThan(4)
    expect(strafe).toBeLessThan(12)
  })

  it('liefert eine Ergebnisliste mit Plätzen', () => {
    const liste = klassenErgebnis(kompletterLauf('4', 25, 14), '4')!.laeufe[0]
    expect(liste.nachPlatz).toHaveLength(25)
    expect(liste.nachPlatz.every((z) => z.platz !== null && z.zeit !== null)).toBe(true)
    expect(liste.nachPlatz[0].platz).toBe(1)
  })

  it('nimmt beim Füllen einer einzelnen Liste nicht die Disq.-Quote des ganzen Laufs', () => {
    const numbers = Array.from({ length: 1000 }, (_, i) => `N${i}`)
    const zeilen = beispielEingaben(stand([bogen('steg', '6')], numbers, '6'), 'stoppuhr', zufallAus(15))[lauf1(1, '6')]
    const disq = Object.values(zeilen).filter((z) => /[A-Z]/.test(Object.values(z).join(''))).length / numbers.length
    expect(disq).toBeLessThan(0.15)
  })
})

describe('Wettkampf nach UIM', () => {
  const uim = (state: AppState): AppState => reducer(state, { type: 'SET_REGELWERK', regelwerk: 'uim-2026' })
  const viele = (n: number) => Array.from({ length: n }, (_, i) => `N${i}`)

  /** Alle Listen eines Aufbaus für eine Klasse, nach UIM. */
  function aufbauStand(aufbau: string, klasse: ClassId, n: number): AppState {
    const state = uim(stand([], viele(n), klasse))
    const boegen = aufbauOrder(aufbau, false)
      .filter((t) => positionAllowsClass(t, klasse))
      .map((t) => bogen(t, klasse))
    return { ...state, aufbau, boegen }
  }

  const gefuellt = (state: AppState, seed: number, zeitnahme: 'stoppuhr' | 'lichtschranke' = 'stoppuhr'): AppState => ({
    ...state,
    eingaben: beispielEingaben(state, zeitnahme, zufallAus(seed)),
  })

  const medianZeit = (state: AppState, disziplin: string, klasse: ClassId) => {
    const zeilen = beispielEingaben(state, 'lichtschranke', zufallAus(21))[laufSchluessel(disziplin, klasse, 1)]
    return median(Object.values(zeilen).map((z) => parseTime(z.zeit1)!.centis / 100))
  }

  it('fährt im Manövrieren die Zeiten der WM, nicht die der DM', () => {
    const dm = stand([bogen('zeit', '1')], viele(800), '1')
    expect(medianZeit(dm, 'manoevrieren', '1')).toBeLessThan(74)
    expect(medianZeit(uim(dm), 'manoevrieren', '1')).toBeGreaterThan(75)
    expect(medianZeit(uim(dm), 'manoevrieren', '1')).toBeLessThan(84)
  })

  it('fährt im Parallelslalom eigene, kürzere Zeiten', () => {
    for (const [klasse, unten, oben] of [['E', 70, 80], ['5', 55, 62]] as const) {
      const state = { ...uim(stand([bogen('zeit', klasse)], viele(800), klasse)), aufbau: 'parallel' }
      const zeit = medianZeit(state, 'parallel', klasse)
      expect(zeit).toBeGreaterThan(unten)
      expect(zeit).toBeLessThan(oben)
    }
  })

  it('schreibt Stoppuhr-Zeiten unter einer Minute so, dass sie wieder als Sekunden gelten', () => {
    const state = gefuellt({ ...uim(stand([bogen('zeit', '5')], viele(50), '5')), aufbau: 'parallel' }, 22)
    for (const z of Object.values(state.eingaben[laufSchluessel('parallel', '5', 1)])) {
      expect(z.zeit1).toMatch(/^[01],\d{4}$/)
      expect(parseTime(z.zeit1)!.centis).toBeGreaterThan(4500)
      expect(parseTime(z.zeit1)!.centis).toBeLessThan(10000)
    }
  })

  it('trifft im Parallelslalom die Quoten der WM: selten Bojen, öfter das Ziel', () => {
    const state = gefuellt(aufbauStand('parallel', 'E', 2000), 23)
    const zeilen = Object.values(state.eingaben[laufSchluessel('parallel', 'E', 1)])
    const quote = (kennung: string) => zeilen.filter((z) => z[kennung] === '5').length / zeilen.length
    expect(quote('ziel|seiteB seiteA')).toBeGreaterThan(0.22)
    expect(quote('ziel|seiteB seiteA')).toBeLessThan(0.32)
    expect(quote('start|seiteB seiteA')).toBeGreaterThan(0.11)
    expect(quote('b3a')).toBeLessThan(0.05)
  })

  it('hat im Parallelslalom weniger Strafen und Disqualifikationen als im Manövrieren', () => {
    const zeilen = (aufbau: string) => klassenErgebnis(gefuellt(aufbauStand(aufbau, '4', 1000), 24), '4')!.laeufe[0].nachNummer
    const strafe = (z: ReturnType<typeof zeilen>) => z.reduce((s, x) => s + x.strafpunkte, 0) / z.length
    const disq = (z: ReturnType<typeof zeilen>) => z.filter((x) => x.disq).length / z.length
    const manoevrieren = zeilen('alcatraz')
    const parallel = zeilen('parallel')
    expect(strafe(parallel)).toBeLessThan(3)
    expect(strafe(manoevrieren)).toBeGreaterThan(strafe(parallel) * 2)
    expect(disq(manoevrieren)).toBeGreaterThan(0.05)
    expect(disq(manoevrieren)).toBeLessThan(0.14)
    expect(disq(parallel)).toBeLessThan(0.02)
  })

  it('schreibt nur Werte, die das Regelwerk an der Stelle zulässt, ohne „2x“', () => {
    for (const aufbau of ['alcatraz', 'parallel']) {
      const state = gefuellt(aufbauStand(aufbau, '4', 400), 25)
      const felder = felderJeKennung('4', aufbauOrder(aufbau, false))
      const disziplin = aufbau === 'parallel' ? 'parallel' : 'manoevrieren'
      for (const z of Object.values(state.eingaben[laufSchluessel(disziplin, '4', 1)])) {
        for (const [kennung, wert] of Object.entries(z)) {
          expect(felder.get(kennung)?.gueltig(wert)).toBe(wert)
          expect(wert).not.toContain('2x')
        }
      }
    }
  })

  it('nimmt beim Rückwechsel zur DM wieder deren Quoten', () => {
    const numbers = viele(1000)
    const nachUim = uim(stand([bogen('knoten', '1')], numbers, '1'))
    const zaehle = (state: AppState) =>
      Object.values(beispielEingaben(state, 'stoppuhr', zufallAus(26))[laufSchluessel('manoevrieren', '1', OHNE_LAUF)] ?? {}).length
    expect(zaehle(nachUim)).toBeLessThan(100)
    const dm = reducer(nachUim, { type: 'SET_REGELWERK', regelwerk: 'dm-2026' })
    expect(zaehle(dm)).toBeGreaterThan(300)
  })

  it('liefert im Parallelslalom eine Ergebnisliste mit Plätzen', () => {
    const liste = klassenErgebnis(gefuellt(aufbauStand('parallel', '5', 25), 27), '5')!.laeufe[0]
    expect(liste.nachPlatz).toHaveLength(25)
    expect(liste.nachPlatz.every((z) => z.zeit !== null)).toBe(true)
    expect(liste.nachPlatz[0].platz).toBe(1)
  })
})
