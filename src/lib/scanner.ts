// Handscanner verhalten sich wie eine Tastatur: Sie tippen den Code, nur viel
// schneller als ein Mensch (wenige Millisekunden je Zeichen), und schließen meist
// mit Enter ab. Erkennt die App den Anfang eines Codes („FP“, Ziffer, Punkt) in
// so einem schnellen Schwall, fängt sie die restlichen Zeichen ab. War gerade ein
// Eingabefeld aktiv (z. B. eine Tabellenzelle), bekommt es seinen Stand von vor
// dem Schwall zurück - die ersten vier Zeichen waren schon hineingetippt.
//
// Ein Mensch tippt nie vier Zeichen in so kurzem Abstand; normale Eingaben
// bleiben also unberührt. Schickt der Scanner kein Enter, gilt der Code nach
// einer kurzen Pause als vollständig.

/** Größter Abstand zwischen zwei Zeichen eines Scans. */
const MAX_ABSTAND_MS = 60
/** Pause, nach der ein Scan ohne Enter als vollständig gilt. */
const ENDE_OHNE_ENTER_MS = 250
const CODE_ANFANG = /^FP\d\.$/i

type Feld = HTMLInputElement | HTMLTextAreaElement

function eingabefeld(el: Element | null): Feld | null {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el : null
}

/**
 * Hört auf Scans im ganzen Fenster und meldet jeden Code. `ausnahme` = Element,
 * das Codes selbst annimmt (das Scan-Feld); dort greift der Mitschnitt nicht.
 * Liefert eine Funktion zum Abmelden.
 */
export function hoereAufScanner(
  onCode: (code: string) => void,
  ausnahme: (el: Element | null) => boolean = () => false,
): () => void {
  let puffer = ''
  let letzte = Number.NEGATIVE_INFINITY
  let aktiv = false
  let feld: Feld | null = null
  let vorher = ''
  let timer: ReturnType<typeof setTimeout> | undefined

  function zuruecksetzen() {
    puffer = ''
    aktiv = false
    feld = null
    clearTimeout(timer)
  }

  function abschliessen() {
    const code = puffer
    zuruecksetzen()
    if (code) onCode(code)
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.altKey || e.metaKey) return
    if (!aktiv && ausnahme(document.activeElement)) return
    const jetzt = performance.now()

    if (e.key === 'Enter' || e.key === 'Tab') {
      if (aktiv) {
        e.preventDefault()
        e.stopPropagation()
        abschliessen()
      } else {
        zuruecksetzen()
      }
      return
    }
    if (e.key.length !== 1) return // Umschalt-Taste & Co.

    // Ein erkannter Scan läuft bis Enter oder zur Pause (Timer); davor beginnt
    // nach jeder Pause ein neuer Schwall.
    if (!aktiv && jetzt - letzte > MAX_ABSTAND_MS) {
      puffer = ''
      feld = eingabefeld(document.activeElement)
      vorher = feld?.value ?? ''
    }
    letzte = jetzt
    puffer += e.key

    if (!aktiv && CODE_ANFANG.test(puffer)) {
      aktiv = true
      if (feld && feld.value !== vorher) {
        feld.value = vorher
        feld.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    if (aktiv) {
      e.preventDefault()
      e.stopPropagation()
      clearTimeout(timer)
      timer = setTimeout(abschliessen, ENDE_OHNE_ENTER_MS)
    }
  }

  window.addEventListener('keydown', onKeydown, true)
  return () => {
    window.removeEventListener('keydown', onKeydown, true)
    clearTimeout(timer)
  }
}
