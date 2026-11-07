import { bildDatei, getSheetDef } from '../config/active'
import { erzeugtesBild } from '../lib/parcoursbildBrowser'
import type { Bogen } from '../types'
import { courseKey, type CourseImages } from './SheetsDocument'

// react-pdf <Image> kann nur PNG/JPEG (kein SVG). Wir laden die Parcours-PNGs
// und zeichnen sie - für die Tor-Bögen um 90° gedreht - auf ein Canvas, um sie
// als Data-URI einzubetten. Bilder ohne vorgebauten Ordner (`bildImBrowser`) erzeugt
// der Browser als SVG; sie werden mit `zoom` so scharf gerastert wie die PNGs des Builds.

/** Wie PNG_ZOOM im Bildgenerator: doppelte Auflösung für scharfen Druck. */
const SVG_ZOOM = 2

async function loadCourseImage(url: string, drehung: number, zoom = 1): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new window.Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Bild nicht ladbar: ' + url))
    i.src = url
  })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return url
  const swap = Math.abs(drehung % 180) === 90
  const [w, h] = [img.naturalWidth * zoom, img.naturalHeight * zoom]
  canvas.width = swap ? h : w
  canvas.height = swap ? w : h
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((drehung * Math.PI) / 180)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  return canvas.toDataURL('image/png')
}

/** Lädt (und dreht) alle für die Bögen benötigten Parcoursbilder, je Klasse aus der Kursvariante. */
export async function loadCourseImages(boegen: Bogen[], baseUrl: string, aufbau: string): Promise<CourseImages> {
  const needed = new Map<string, { dir: string; datei: string; drehung: number; erzeugen?: { dim: string[]; aus: string[] } }>()
  for (const b of boegen) {
    const def = getSheetDef(b.typeId)
    if (def.courseImageDir) {
      const drehung = def.bildDrehung ?? 0
      const datei = bildDatei(aufbau, b.klasse)
      needed.set(courseKey(def.courseImageDir, datei, drehung, def.bildErzeugen), {
        dir: def.courseImageDir,
        datei,
        drehung,
        erzeugen: def.bildErzeugen,
      })
    }
  }
  const entries = await Promise.all(
    [...needed].map(async ([key, { dir, datei, drehung, erzeugen }]) => {
      try {
        const uri = erzeugen
          ? await loadCourseImage(await erzeugtesBild(`${baseUrl}parcours/${dir}/${datei}.svg`, erzeugen), drehung, SVG_ZOOM)
          : await loadCourseImage(`${baseUrl}parcours/${dir}/${datei}.png`, drehung)
        return [key, uri] as const
      } catch {
        return null
      }
    }),
  )
  return Object.fromEntries(entries.filter((e): e is [string, string] => e !== null))
}
