// Verkleinert die Schrift einer Zelle, wenn ihr Text nicht hineinpasst, z. B.
// "01:14,53 (74,53)" in einer schmalen Zeit-Spalte. Die Größe steht inline an der
// Zelle und gilt damit auch im Druck.

/** Kleinster Faktor: Darunter wäre der Text nicht mehr lesbar, er wird dann abgeschnitten. */
export const FIT_MIN = 0.5

/** Luft, damit Rundung und Tabellenziffern (misst die Canvas nicht) nichts abschneiden. */
const FIT_LUFT = 0.98

const ZELLEN = '.cell-input, .col-sum-cell, .erg-fit'

/** Faktor für die Schrift: 1, wenn der Text passt, sonst so klein wie nötig (mindestens `min`). */
export function fitFactor(textWidth: number, available: number, min = FIT_MIN): number {
  if (textWidth <= 0 || available <= 0 || textWidth <= available) return 1
  return Math.max(min, Math.floor((available / textWidth) * 100) / 100)
}

let ctx: CanvasRenderingContext2D | null | undefined
function canvas(): CanvasRenderingContext2D | null {
  if (ctx === undefined) ctx = document.createElement('canvas').getContext?.('2d') ?? null
  return ctx
}

/** Zuletzt gemessener Stand je Zelle: Unverändertes wird nicht erneut gemessen. */
const gemessen = new WeakMap<HTMLElement, string>()

function setFactor(el: HTMLElement, factor: number, basePx: number): void {
  if (factor === 1) {
    el.style.fontSize = ''
    delete el.dataset.fit
  } else {
    el.style.fontSize = `${basePx * factor}px`
    el.dataset.fit = String(factor)
  }
}

/** Passt die Schrift einer Zelle (Eingabefeld oder Tabellenzelle) an ihren Text an. */
export function fitCell(el: HTMLElement): void {
  const text = el instanceof HTMLInputElement ? el.value : (el.textContent ?? '').trim()
  if (text === '') {
    if (el.dataset.fit) el.style.fontSize = ''
    delete el.dataset.fit
    gemessen.delete(el)
    return
  }
  const breite = el.clientWidth
  if (breite <= 0) return // ohne Layout (z. B. Test-DOM) nichts messen
  const stand = `${breite}|${text}`
  if (gemessen.get(el) === stand) return
  const c = canvas()
  if (!c) return
  gemessen.set(el, stand)

  const s = getComputedStyle(el)
  const faktor = Number(el.dataset.fit ?? 1)
  c.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
  const abstand = parseFloat(s.letterSpacing) || 0
  // Gemessen wird in der aktuellen Größe, zurückgerechnet auf die volle Schrift.
  const textBreite = (c.measureText(text).width + abstand * text.length) / faktor
  const platz = (breite - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)) * FIT_LUFT
  setFactor(el, fitFactor(textBreite, platz), parseFloat(s.fontSize) / faktor)
}

/** Passt alle Zellen eines Bogens an. */
export function fitCells(root: HTMLElement | null | undefined): void {
  root?.querySelectorAll<HTMLElement>(ZELLEN).forEach(fitCell)
}

/** Passt die Zelle an, aus der ein Ereignis stammt (andere Felder bleiben unberührt). */
export function fitEventTarget(target: EventTarget | null): void {
  if (target instanceof HTMLElement && target.matches(ZELLEN)) fitCell(target)
}
