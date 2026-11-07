import qrcode from 'qrcode-generator'
import { CLASS_IDS, type Bogen, type ClassId, type Lauf, type SheetTypeId } from '../types'

// QR-Codes auf Bögen und Laufzetteln. Ein Handscanner holt damit in der App das
// richtige Blatt nach vorn, und eingescannte oder fotografierte Blätter lassen
// sich später sicher zuordnen. Ein Link ist nicht nötig.
//
// Format FP2 („Fehlerpunkte“, Format 2), Teile durch Punkte getrennt:
//   Laufzettel  FP2.<REGELWERK>.<AUFBAU>.<KLASSE>.<LAUF>
//   Liste       FP2.<REGELWERK>.<AUFBAU>.<KLASSE>.<LAUF>.<POSITION>[.<NR>].S<SEITE>
// z. B. FP2.DM2026.ALCATRAZDM26.3.1 und FP2.DM2026.ALCATRAZDM26.3.1.ZEIT.2.S1.
// <NR> unterscheidet mehrfach vorhandene Positionen (intern zeit-2), <SEITE> die
// Druckseiten einer Liste.
//
// Nur Großbuchstaben, Ziffern und Punkt: Diese Zeichen tippt ein Handscanner auch
// dann richtig, wenn er auf eine andere Tastaturbelegung eingestellt ist als der PC
// (US/DE). Dann sind nur Y und Z vertauscht, das fängt `leseCode` ab. Außerdem
// nutzt der QR-Code so den platzsparenden alphanumerischen Modus und hat bei
// gleicher Größe gröbere Kästchen.

export const QR_FORMAT = 'FP2'

/** Regelwerk und Aufbau, mit denen gedruckt wird (passt auf den AppState). */
export interface QrKontext {
  regelwerk: string
  aufbau: string
}

/** ID als Code-Teil: nur A-Z und 0-9 (dm-2026 → DM2026). */
function teil(id: string): string {
  return id.replace(/[^a-z0-9]/gi, '').toUpperCase()
}

/** Mehrfach vorhandene Positionen heißen zeit-1, zeit-2 …; sonst ohne Nummer. */
function zerlegePosition(typeId: SheetTypeId): { basis: string; nr?: number } {
  const m = /^(.+)-(\d+)$/.exec(typeId)
  return m ? { basis: m[1], nr: Number(m[2]) } : { basis: typeId }
}

/** Code eines Laufzettels: alle Listen einer Klasse in einem Lauf. */
export function laufzettelCode(k: QrKontext, klasse: ClassId, lauf: Lauf): string {
  return [QR_FORMAT, teil(k.regelwerk), teil(k.aufbau), klasse, String(lauf)].join('.')
}

/** Code einer Druckseite einer Liste (Seite ab 1). */
export function bogenCode(k: QrKontext, b: Pick<Bogen, 'typeId' | 'klasse' | 'lauf'>, seite: number): string {
  const { basis, nr } = zerlegePosition(b.typeId)
  return [
    laufzettelCode(k, b.klasse, b.lauf),
    teil(basis),
    ...(nr !== undefined ? [String(nr)] : []),
    `S${seite}`,
  ].join('.')
}

// ---- Lesen ------------------------------------------------------------------

/** Was ein gescannter Code bezeichnet, aufgelöst auf die IDs der Konfiguration. */
export interface QrZiel {
  regelwerk: string
  aufbau: string
  klasse: ClassId
  lauf: Lauf
  /** Nur bei Listen; ohne Position ist es ein Laufzettel. */
  typeId?: SheetTypeId
  seite?: number
}

/** Bekannte IDs, gegen die ein Code aufgelöst wird. */
export interface QrBekannt {
  regelwerke: string[]
  aufbauten: string[]
  positionen: SheetTypeId[]
}

export type QrLesung = { ok: true; ziel: QrZiel } | { ok: false; fehler: string }

/**
 * Liest einen gescannten oder getippten Code. Groß-/Kleinschreibung und Leerraum
 * am Rand sind egal. Klappt es nicht, wird es mit vertauschtem Y/Z noch einmal
 * versucht (Scanner auf US-Tastatur, PC auf deutscher, oder umgekehrt).
 */
export function leseCode(text: string, bekannt: QrBekannt): QrLesung {
  const code = text.trim().toUpperCase()
  const erst = loese(code, bekannt)
  if (erst.ok || !/[YZ]/.test(code)) return erst
  const getauscht = loese(code.replace(/[YZ]/g, (c) => (c === 'Y' ? 'Z' : 'Y')), bekannt)
  return getauscht.ok ? getauscht : erst
}

function loese(code: string, bekannt: QrBekannt): QrLesung {
  const fehler = (f: string): QrLesung => ({ ok: false, fehler: f })
  if (code === '') return fehler('Kein Code eingegeben.')
  if (code.startsWith('FP1')) return fehler('Code im alten Format (FP1) ohne Aufbau - Blatt bitte neu drucken.')
  const teile = code.split('.')
  if (teile[0] !== QR_FORMAT) return fehler('Kein Code dieser App (er beginnt nicht mit FP2).')
  if (teile.length < 5 || teile.some((t) => !/^[A-Z0-9]+$/.test(t))) return fehler('Code unvollständig oder beschädigt.')
  const [, rw, ab, kl, la, ...rest] = teile

  const regelwerk = bekannt.regelwerke.find((id) => teil(id) === rw)
  if (!regelwerk) return fehler(`Regelwerk „${rw}“ ist unbekannt.`)
  const aufbau = bekannt.aufbauten.find((id) => teil(id) === ab)
  if (!aufbau) return fehler(`Aufbau „${ab}“ ist unbekannt.`)
  if (!CLASS_IDS.includes(kl as ClassId)) return fehler(`Klasse „${kl}“ ist unbekannt.`)
  const lauf = Number(la)
  if (lauf !== 1 && lauf !== 2 && lauf !== 3) return fehler(`Lauf „${la}“ ist ungültig.`)
  const ziel: QrZiel = { regelwerk, aufbau, klasse: kl as ClassId, lauf }
  if (rest.length === 0) return { ok: true, ziel }

  // Liste: Position, ggf. Nummer, dann die Seite.
  const [pos, ...danach] = rest
  const nr = danach[0] && /^\d+$/.test(danach[0]) ? Number(danach.shift()) : undefined
  const seiteTeil = danach.shift()
  const seite = seiteTeil && /^S\d+$/.test(seiteTeil) ? Number(seiteTeil.slice(1)) : undefined
  if (seite === undefined || seite < 1 || danach.length > 0) return fehler('Code unvollständig oder beschädigt.')
  const typeId = bekannt.positionen.find((id) => {
    const p = zerlegePosition(id)
    return teil(p.basis) === pos && p.nr === nr
  })
  if (!typeId) return fehler(`Position „${nr === undefined ? pos : `${pos} ${nr}`}“ ist unbekannt.`)
  return { ok: true, ziel: { ...ziel, typeId, seite } }
}

// ---- Zeichnen ---------------------------------------------------------------

/** Zeichen des alphanumerischen QR-Modus (unsere Codes passen immer hinein). */
const ALPHANUMERISCH = /^[0-9A-Z $%*+\-./:]*$/

function qrMatrix(text: string): ReturnType<typeof qrcode> {
  const qr = qrcode(0, 'M')
  qr.addData(text, ALPHANUMERISCH.test(text) ? 'Alphanumeric' : 'Byte')
  qr.make()
  return qr
}

/** QR-Modulmatrix (true = dunkles Modul) - z. B. zum Zeichnen auf ein Canvas. */
export function qrModules(text: string): boolean[][] {
  const qr = qrMatrix(text)
  const count = qr.getModuleCount()
  const out: boolean[][] = []
  for (let r = 0; r < count; r++) {
    const row: boolean[] = []
    for (let c = 0; c < count; c++) row.push(qr.isDark(r, c))
    out.push(row)
  }
  return out
}

/** Erzeugt einen scharfen SVG-QR-Code als data:-URI (für <img> und Druck). */
export function qrSvgDataUri(text: string): string {
  const qr = qrMatrix(text)
  const count = qr.getModuleCount()
  const parts: string[] = []
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) parts.push(`M${c} ${r}h1v1h-1z`)
    }
  }
  const margin = 2
  const size = count + margin * 2
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<path transform="translate(${margin} ${margin})" d="${parts.join('')}" fill="#000"/>` +
    `</svg>`
  return 'data:image/svg+xml;base64,' + btoa(svg)
}
