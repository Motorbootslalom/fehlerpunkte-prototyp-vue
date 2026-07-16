import { getSheetDef } from '../config/active'
import type { Bogen } from '../types'
import { courseKey, type CourseImages } from './SheetsDocument'

// react-pdf <Image> kann nur PNG/JPEG (kein SVG). Wir laden die Parcours-PNGs
// und zeichnen sie - für die Tor-Bögen um 90° gedreht - auf ein Canvas, um sie
// als Data-URI einzubetten.

async function loadCourseImage(url: string, drehung: number): Promise<string> {
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
  canvas.width = swap ? img.naturalHeight : img.naturalWidth
  canvas.height = swap ? img.naturalWidth : img.naturalHeight
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((drehung * Math.PI) / 180)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
  return canvas.toDataURL('image/png')
}

/** Lädt (und dreht) alle für die Bögen benötigten Parcoursbilder. */
export async function loadCourseImages(boegen: Bogen[], baseUrl: string): Promise<CourseImages> {
  const needed = new Map<string, { dir: string; klasse: string; drehung: number }>()
  for (const b of boegen) {
    const def = getSheetDef(b.typeId)
    if (def.courseImageDir) {
      const drehung = def.bildDrehung ?? 0
      needed.set(courseKey(def.courseImageDir, b.klasse, drehung), {
        dir: def.courseImageDir,
        klasse: b.klasse,
        drehung,
      })
    }
  }
  const entries = await Promise.all(
    [...needed].map(async ([key, { dir, klasse, drehung }]) => {
      try {
        const uri = await loadCourseImage(`${baseUrl}parcours/${dir}/Klasse${klasse}.png`, drehung)
        return [key, uri] as const
      } catch {
        return null
      }
    }),
  )
  return Object.fromEntries(entries.filter((e): e is [string, string] => e !== null))
}
