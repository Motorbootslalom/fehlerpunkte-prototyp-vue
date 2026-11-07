// Machbarkeitsprüfung zu KONZEPT-POSITIONEN.md. Aufruf: `node scripts/konzept-positionen.ts`
//
// Frage: Lassen sich die handgeschriebenen Positionen aus wenigen Angaben ableiten, nämlich
// welche Bojen und Aufgaben eine Position hat und von wo aus sie schaut (die „Kurzform“)?
// Das Skript leitet je Klasse ab und vergleicht mit den echten Quelldateien unter src/config.
//
// Es ändert nichts und gehört nicht zu `npm run check`, denn die App kennt die Kurzform noch
// nicht. Exit-Code 1, wenn Bojen oder Abblendung abweichen. Auch vertauschte Seiten zählen,
// seit Baden-Württemberg korrigiert ist (KONZEPT-POSITIONEN.md §6).
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as yamlLoad } from 'js-yaml'
import { feldKennungen } from '../src/config/feld.ts'
import { mergePositionen, quellDateien } from '../src/config/merge-positionen.ts'
import type { RawDisziplin, RawPosition, RawPositionen, RawSpalte } from '../src/config/schema.ts'
import { deriveDimSet } from './generate-parcours.ts'

type Seite = 'oben' | 'unten'
type Blick = 'hinten' | 'vorne' | 'rechts' | 'links'
type Aufgabe = 'zeit' | 'tor5' | 'mueb' | 'parcours'

interface Kurzform {
  blick?: Blick
  /** IDs aus dem Parcoursbild: ganzes Tor (Tor1) oder Einzelboje (Tor1_innen, Tor5_oben). */
  bojen?: string[]
  aufgaben?: Aufgabe[]
}

// ---- Die Kurzform aller Positionen, die Bojen oder Aufgaben auf dem Kurs haben ---------
// Zeit, Steg, Vorsteg und Knoten bleiben feste Bausteine und werden hier nicht abgeleitet.
const KURZFORM: Record<string, Kurzform> = {
  gate135: { blick: 'hinten', bojen: ['Tor1', 'Tor3', 'Tor5_unten', 'StartZiel_unten', 'Speedboje_unten'] },
  gate135os: { blick: 'hinten', bojen: ['Tor1', 'Tor3', 'Tor5_unten', 'Speedboje_unten'] },
  gate245: { blick: 'hinten', bojen: ['Tor2', 'Tor4', 'Tor5_oben', 'StartZiel_oben', 'Speedboje_oben'] },
  gate245os: { blick: 'hinten', bojen: ['Tor2', 'Tor4', 'Tor5_oben', 'Speedboje_oben'] },
  frontal135: { blick: 'vorne', bojen: ['Tor1', 'Tor3', 'Tor5_unten', 'StartZiel_unten', 'Speedboje_unten'] },
  frontal245: { blick: 'vorne', bojen: ['Tor2', 'Tor4', 'Tor5_oben', 'StartZiel_oben', 'Speedboje_oben'] },
  bstartziel: { bojen: ['StartZiel'], aufgaben: ['zeit'] },
  brechts: { blick: 'rechts', bojen: ['Tor1', 'Tor3'], aufgaben: ['mueb'] },
  blinks: { blick: 'links', bojen: ['Tor2', 'Tor4', 'Tor5', 'Speedboje_oben', 'Speedboje_unten'], aufgaben: ['tor5'] },
  bawueland1: { blick: 'rechts', bojen: ['StartZiel_unten', 'Tor1_aussen', 'Tor2_innen', 'Tor3_aussen'] },
  bawueland2: { blick: 'rechts', bojen: ['Tor4_innen', 'Tor5_unten', 'Speedboje_unten'], aufgaben: ['tor5'] },
  bawuewasser1: { blick: 'links', bojen: ['StartZiel_oben', 'Tor1_innen', 'Tor2_aussen', 'Tor3_innen'], aufgaben: ['mueb'] },
  bawuewasser2: { blick: 'links', bojen: ['Tor4_aussen', 'Tor5_oben', 'Speedboje_oben'] },
  mueb: { blick: 'hinten', aufgaben: ['mueb'] },
  tor5: { aufgaben: ['tor5'] },
  tor5pue: { aufgaben: ['tor5', 'parcours'] },
  tor5puems: { bojen: ['StartZiel'], aufgaben: ['tor5', 'parcours'] },
  parcours: { aufgaben: ['parcours'] },
  parcoursms: { bojen: ['StartZiel'], aufgaben: ['parcours'] },
}

// ---- Der Kurs, einmal beschrieben -------------------------------------------------------
// Abgelesen aus Alcatraz und Frontal: seiteA ist die untere Boje im Bild, seiteB die obere.
const SEITE: Record<Seite, string> = { unten: 'seiteA', oben: 'seiteB' }
/** Welche Boje eines Tores im Bild die innere ist. */
const INNEN: Record<string, Seite> = { Tor1: 'oben', Tor2: 'unten', Tor3: 'oben', Tor4: 'unten' }
const DREHUNG: Record<Blick, number> = { hinten: 90, vorne: -90, rechts: 0, links: 180 }

const OHNE_4 = ['E', '1', '2', '3', '5', '6', '7']
const AB_4 = ['4', '5', '6', '7']
const AB_5 = ['5', '6', '7']
const NUR_7 = ['7']
const KLASSEN = ['E', '1', '2', '3', '4', '5', '6', '7']

/** Ein Halt auf dem Fahrweg: ein Tor je Richtung, eine Speedboje oder eine Fehler-Aufgabe. */
interface Halt {
  key?: string
  richtung?: 'hin' | 'rueck'
  tor?: string
  speedboje?: string
  katalog?: Aufgabe
  klassen?: string[]
}

const FAHRWEG: Halt[] = [
  { key: 'start', richtung: 'hin', tor: 'StartZiel' },
  { key: 't1a', richtung: 'hin', tor: 'Tor1' },
  { key: 't2a', richtung: 'hin', tor: 'Tor2' },
  { key: 't3a', richtung: 'hin', tor: 'Tor3' },
  { key: 't4a', richtung: 'hin', tor: 'Tor4' },
  { key: 't5', richtung: 'hin', tor: 'Tor5' },
  { katalog: 'tor5' },
  { key: 't5', richtung: 'rueck', tor: 'Tor5' },
  { key: 't4b', richtung: 'rueck', tor: 'Tor4' },
  { key: 't3b', richtung: 'rueck', tor: 'Tor3' },
  { key: 't2b', richtung: 'rueck', tor: 'Tor2' },
  { key: 'speed1', speedboje: 'Speedboje_oben', klassen: AB_5 },
  { key: 't1b', richtung: 'rueck', tor: 'Tor1', klassen: OHNE_4 },
  { katalog: 'mueb', klassen: AB_4 },
  { key: 'speed2', speedboje: 'Speedboje_unten', klassen: NUR_7 },
  { key: 't1c', richtung: 'rueck', tor: 'Tor1', klassen: NUR_7 },
  { key: 'ziel', richtung: 'rueck', tor: 'StartZiel' },
]

const ALLE_BOJEN = [
  ...['Tor1', 'Tor2', 'Tor3', 'Tor4'].flatMap((t) => [`${t}_innen`, `${t}_aussen`]),
  ...['Tor5', 'StartZiel'].flatMap((t) => [`${t}_oben`, `${t}_unten`]),
  'Speedboje_oben',
  'Speedboje_unten',
  'Schikane',
]

/** Die Einzelboje eines Tores auf einer Seite des Bildes. */
function bojeId(tor: string, seite: Seite): string {
  const innen = INNEN[tor]
  return innen ? `${tor}_${seite === innen ? 'innen' : 'aussen'}` : `${tor}_${seite}`
}

/** Ganze Tore in ihre Einzelbojen zerlegen. */
function einzelbojen(ids: Iterable<string>): Set<string> {
  const out = new Set<string>()
  for (const id of ids) {
    if (/^Tor[1-4]$/.test(id)) for (const s of ['innen', 'aussen']) out.add(`${id}_${s}`)
    else if (id === 'Tor5' || id === 'StartZiel') for (const s of ['oben', 'unten']) out.add(`${id}_${s}`)
    else out.add(id)
  }
  return out
}

// ---- Ableitung aus der Kurzform ---------------------------------------------------------
/** Die Felder einer Position für eine Klasse, in der Reihenfolge der Spalten. */
function felderAbgeleitet(k: Kurzform, klasse: string): string[] {
  const bojen = einzelbojen(k.bojen ?? [])
  const aufgaben = k.aufgaben ?? []
  // Von vorne liegt die obere Boje links, und Tor 5 zeigt zuerst die Rückfahrt.
  const seiten: Seite[] = k.blick === 'vorne' ? ['oben', 'unten'] : ['unten', 'oben']
  const halte =
    k.blick === 'vorne'
      ? FAHRWEG.map((h): Halt => (h.key === 't5' ? { ...h, richtung: h.richtung === 'hin' ? 'rueck' : 'hin' } : h))
      : FAHRWEG
  const out = aufgaben.includes('zeit') ? ['zeit1', 'zeit2', 'zeit3'] : []
  for (const h of halte) {
    if (h.klassen && !h.klassen.includes(klasse)) continue
    if (h.katalog) {
      if (aufgaben.includes(h.katalog)) out.push(`katalog:${h.katalog}`)
    } else if (h.speedboje) {
      if (bojen.has(h.speedboje)) out.push(h.key!)
    } else {
      for (const s of seiten) if (bojen.has(bojeId(h.tor!, s))) out.push(`${h.key}|${h.richtung} ${SEITE[s]}`)
    }
  }
  return out
}

/** Abgeblendet wird, was die Position nicht beobachtet; die Parcoursüberwachung sieht alles. */
function abblendungAbgeleitet(k: Kurzform): Set<string> {
  if (k.aufgaben?.includes('parcours')) return new Set()
  const hell = einzelbojen(k.bojen ?? [])
  if (k.aufgaben?.includes('mueb')) hell.add('Schikane')
  return new Set(ALLE_BOJEN.filter((b) => !hell.has(b)))
}

const hatBildAbgeleitet = (k: Kurzform) =>
  (k.bojen?.length ?? 0) > 0 || !!k.aufgaben?.includes('mueb') || !!k.aufgaben?.includes('parcours')

// ---- Ist-Zustand aus den Quelldateien ---------------------------------------------------
const gilt = (klassen: Array<string | number> | undefined, klasse: string) =>
  !klassen || klassen.map(String).includes(klasse)

function felderIst(p: RawPosition, klasse: string): string[] {
  if (!gilt(p.klassen, klasse)) return []
  return p.spalten
    .filter((s) => ['boje', 'code', 'zeit'].includes(s.typ) && gilt(s.klassen, klasse))
    .flatMap((s) => feldKennungen(s, p.katalog))
}

const tausche = (feld: string) => feld.replace(/seite([AB])/, (_, s) => (s === 'A' ? 'seiteB' : 'seiteA'))
const ohneKatalog = (felder: string[]) => felder.filter((f) => !f.startsWith('katalog:'))
const gleich = (a: unknown[], b: unknown[]) => JSON.stringify(a) === JSON.stringify(b)
const menge = (s: Iterable<string>) => [...s].sort()

type Urteil = 'ok' | 'getauscht' | 'ABWEICHUNG'

function vergleicheBojen(p: RawPosition, k: Kurzform): { urteil: Urteil; detail: string } {
  let tausch = false
  for (const klasse of KLASSEN) {
    const ist = ohneKatalog(felderIst(p, klasse))
    const soll = ohneKatalog(felderAbgeleitet(k, klasse))
    if (gleich(ist, soll)) continue
    if (gleich(ist, soll.map(tausche))) tausch = true
    else return { urteil: 'ABWEICHUNG', detail: `Klasse ${klasse}\n      ist : ${ist.join(', ')}\n      soll: ${soll.join(', ')}` }
  }
  return { urteil: tausch ? 'getauscht' : 'ok', detail: '' }
}

/** Steht die Fehlerspalte dort, wo sie der Fahrweg hinsetzt? Nennt die Klassen, wo nicht. */
function vergleicheFehlerspalten(p: RawPosition, k: Kurzform): string {
  const betroffen = KLASSEN.filter((klasse) => {
    const ist = felderIst(p, klasse)
    const soll = felderAbgeleitet(k, klasse)
    return !gleich(ist, soll) && !gleich(ist, soll.map(tausche))
  })
  if (betroffen.length === 0) return 'ok'
  return `anderer Platz (${betroffen.length === KLASSEN.length ? 'alle Klassen' : `Kl. ${betroffen.join(', ')}`})`
}

function vergleicheInnen(p: RawPosition): Urteil {
  const spalten = p.spalten.filter((s) => s.innen && /^t[1-4][abc]$/.test(s.key ?? ''))
  const soll = (s: RawSpalte) => SEITE[INNEN[`Tor${s.key![1]}`]]
  if (spalten.every((s) => s.innen === soll(s))) return 'ok'
  return spalten.every((s) => s.innen === tausche(soll(s))) ? 'getauscht' : 'ABWEICHUNG'
}

/** Was die Kurzform noch nicht ableitet: reine Darstellung dieser Position. */
function darstellung(p: RawPosition): string[] {
  const out: string[] = []
  const standard = (key: string) => {
    const tor = /^t([1-5])[abc]?$/.exec(key)
    if (tor) return `Tor ${tor[1]}`
    return { start: 'Start', ziel: 'Ziel', speed1: 'Speed 1', speed2: 'Speed 2' }[key]
  }
  const labels = new Set<string>()
  for (const s of p.spalten) {
    if (s.typ === 'boje' && s.key && s.label !== standard(s.key)) labels.add(s.label ?? '')
    if (s.typ === 'code') labels.add(s.label ?? '')
  }
  if (labels.size > 0) out.push(`Beschriftung: ${[...labels].join(', ')}`)
  const trenner = p.spalten.filter((s) => s.typ === 'trenner').length
  if (trenner > 0) out.push(`Trennlinien: ${trenner}`)
  if (p.subTrenner) out.push(`subTrenner: ${p.subTrenner}`)
  if (p.bildNeben) out.push('bildNeben')
  if (p.bildBreite) out.push(`bildBreite: ${p.bildBreite}`)
  if (p.hinweis) out.push(`hinweis: ${p.hinweis}`)
  const zusatz = [
    p.spalten.some((s) => s.typ === 'disq') && 'Disq.',
    p.spalten.some((s) => s.key === 'sum') && 'Σ',
    p.spalten.some((s) => s.key === 'bemerkung') && 'Bemerkung',
  ].filter(Boolean)
  out.push(`Zusatzspalten: ${zusatz.join(', ') || 'keine'}`)
  return out
}

// ---- Auswertung -------------------------------------------------------------------------
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lies = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const dateien = quellDateien(lies('src/config/aufbauten.yaml'))
const raw: RawPositionen = mergePositionen(dateien.map((n) => yamlLoad(lies(`src/config/${n}.yaml`))))
const positionVon = (id: string) => {
  const p = raw.positionen.find((x) => x.id === id)
  if (!p) throw new Error(`Position ${id} fehlt in den Quelldateien`)
  return p
}

let fehler = 0
console.log('Position      Bojen+Klassen  Abblendung  Drehung  Pfeile  innen      disq  katalog  Fehlerspalte')
const details: string[] = []
const zaehler = { ok: 0, getauscht: 0, ABWEICHUNG: 0 }
for (const [id, k] of Object.entries(KURZFORM)) {
  const p = positionVon(id)
  const bojen = vergleicheBojen(p, k)
  zaehler[bojen.urteil]++
  if (bojen.urteil === 'ABWEICHUNG') details.push(`  ${id}: ${bojen.detail}`)

  const hatBild = !!p.bild
  const dimIst = menge(einzelbojen(deriveDimSet(p)))
  const dimSoll = menge(abblendungAbgeleitet(k))
  const abblendung = hatBild !== hatBildAbgeleitet(k) ? 'BILD?' : !hatBild ? '-' : gleich(dimIst, dimSoll) ? 'ok' : 'ABWEICHUNG'
  if (abblendung !== 'ok' && abblendung !== '-') details.push(`  ${id}: Abblendung ist ${dimIst.join(' ')} | soll ${dimSoll.join(' ')}`)
  if (bojen.urteil !== 'ok' || (abblendung !== 'ok' && abblendung !== '-')) fehler++

  const drehungIst = p.bildDrehung ?? 0
  const drehungSoll = k.blick ? DREHUNG[k.blick] : 0
  const drehung = !hatBild ? '-' : drehungIst === drehungSoll ? 'ok' : `${drehungIst}/${drehungSoll}`
  const pfeile = !!p.pfeileSpiegeln === (k.blick === 'hinten' && (k.bojen?.length ?? 0) > 0) ? 'ok' : 'ANDERS'
  const disq = p.disq === (k.aufgaben?.includes('mueb') ? 'mueb' : 'parcours') ? 'ok' : `${p.disq}`
  const katalogSoll = k.aufgaben?.includes('mueb') ? 'mueb' : k.aufgaben?.includes('tor5') ? 'tor5' : undefined
  const katalog = p.katalog === katalogSoll ? 'ok' : `${p.katalog ?? '-'}/${katalogSoll ?? '-'}`
  console.log(
    `${id.padEnd(14)}${bojen.urteil.padEnd(15)}${abblendung.padEnd(12)}${drehung.padEnd(9)}${pfeile.padEnd(8)}` +
      `${vergleicheInnen(p).padEnd(11)}${disq.padEnd(6)}${katalog.padEnd(9)}${vergleicheFehlerspalten(p, k)}`,
  )
}
if (details.length > 0) console.log(`\nDetails:\n${details.join('\n')}`)
console.log(
  `\n${Object.keys(KURZFORM).length} Positionen: ${zaehler.ok} gleich, ${zaehler.getauscht} mit vertauschten Seiten, ${zaehler.ABWEICHUNG} abweichend.`,
)
console.log('Drehung und katalog: ist/soll. „getauscht“: seiteA und seiteB sind gegenüber Alcatraz vertauscht.')

// Jede abgeleitete Kennung muss in den Ergebnislisten vorkommen, sonst ginge der Wert dort unter.
const manoevrieren: RawDisziplin | undefined = raw.disziplinen?.find((d) => d.id === 'manoevrieren')
const ergebnisfelder = new Set(
  (manoevrieren?.ergebnisspalten ?? []).flatMap((s) => [
    ...(s.felder ?? []),
    ...(s.unter ?? []).map((u) => (typeof u === 'string' ? u : u.feld)),
  ]),
)
const fehlend = new Set(
  Object.values(KURZFORM)
    .flatMap((k) => KLASSEN.flatMap((klasse) => felderAbgeleitet(k, klasse)))
    .filter((f) => !/^zeit\d$/.test(f) && !ergebnisfelder.has(f)),
)
console.log(`\nErgebnislisten: ${fehlend.size === 0 ? 'jedes abgeleitete Feld kommt vor' : `es fehlen ${[...fehlend].join(', ')}`}.`)

// Dasselbe Feld auf zwei Listen teilt sich einen Wert. Das soll der Assistent melden.
const doppelt: string[] = []
for (const a of raw.aufbauten ?? []) {
  if (a.eigeneStrecke) continue
  const ids = [...new Set(a.positionen)]
  for (const klasse of KLASSEN) {
    const anzahl = new Map<string, string[]>()
    for (const id of ids) for (const f of felderIst(positionVon(id), klasse)) anzahl.set(f, [...(anzahl.get(f) ?? []), id])
    for (const [f, listen] of anzahl) if (listen.length > 1) doppelt.push(`${a.id}/Kl. ${klasse}: ${f} auf ${listen.join(', ')}`)
  }
}
console.log(`Doppelte Felder in den heutigen Aufbauten: ${doppelt.length === 0 ? 'keine' : `\n  ${doppelt.join('\n  ')}`}`)

console.log('\nNoch nicht abgeleitet (Darstellung):')
for (const id of Object.keys(KURZFORM)) console.log(`  ${id.padEnd(14)}${darstellung(positionVon(id)).join(' · ')}`)

// Umfang: die Dateien mit den handgeschriebenen Tor-Positionen, samt ihrer Kommentare.
const torDateien = ['alcatraz', 'frontal', 'berlin', 'bawue'].map((d) => lies(`src/config/aufbauten/${d}.yaml`))
const torIds = torDateien.flatMap((t) => (yamlLoad(t) as RawPositionen).positionen.map((p) => p.id))
const kurzZeichen = JSON.stringify(torIds.map((id) => KURZFORM[id])).length
console.log(
  `\nUmfang: ${torIds.length} Tor-Positionen in ${torDateien.join('').length} Zeichen YAML, ` +
    `als Kurzform ${kurzZeichen} Zeichen (ohne Darstellung und Titel).`,
)

process.exit(fehler > 0 ? 1 : 0)
