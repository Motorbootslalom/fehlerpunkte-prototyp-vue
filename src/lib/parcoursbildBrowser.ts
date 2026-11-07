import { bildSvg } from './parcoursbild'

// Parcoursbilder ohne vorgebauten Ordner (`bildImBrowser`): Der Browser lädt das Quellbild,
// blendet mit demselben Code ab wie der Build (lib/parcoursbild.ts) und gibt eine Blob-URL
// zurück. Gleiche Bilder entstehen nur einmal; die URLs bleiben für die Sitzung gültig.

const erzeugt = new Map<string, Promise<string>>()

/** Das abgeblendete Bild zu einem Quellbild (SVG-URL) als Blob-URL. */
export function erzeugtesBild(quelleUrl: string, vorgabe: { dim: string[]; aus: string[] }): Promise<string> {
  const schluessel = `${quelleUrl}|${vorgabe.dim.join(',')}|${vorgabe.aus.join(',')}`
  const bekannt = erzeugt.get(schluessel)
  if (bekannt) return bekannt
  const neu = fetch(quelleUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`${quelleUrl}: HTTP ${res.status}`)
      return res.text()
    })
    .then((text) => URL.createObjectURL(new Blob([bildSvg(text, vorgabe).svg], { type: 'image/svg+xml' })))
  // Ein Fehler (z. B. offline) soll beim nächsten Versuch nicht wieder aus dem Speicher kommen.
  neu.catch(() => erzeugt.delete(schluessel))
  erzeugt.set(schluessel, neu)
  return neu
}
