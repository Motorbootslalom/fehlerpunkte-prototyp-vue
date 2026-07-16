// PDF-Export über JavaScript-Bibliotheken (html2canvas + jsPDF).
//
// Dies ist die ZWEITE Export-Variante zum Vergleich mit dem Browser-Druck.
// Sie rastert jede Bogen-Seite in ein Bild und legt es auf eine A4-Seite.
// Vorteil: echter Download ohne Druckdialog. Nachteil: rasterisierter Text
// (nicht so scharf/selektierbar wie beim Browser-Druck / "Als PDF speichern").
//
// Die schweren Bibliotheken werden erst beim Klick dynamisch geladen.

import { qrModules } from './qr'

// Kompromiss aus Schärfe und Dateigröße: höhere Auflösung als Standard, aber
// JPEG (PNG einer A4-Vollseite wäre zig MB groß). Für scharfen, vektorbasierten
// Text ist der Browser-Druck die bessere Wahl.
const SCALE = 2.5
const JPEG_QUALITY = 0.94

export async function exportSheetsToPdf(fileName: string): Promise<void> {
  const [{ default: html2canvas }, jspdf] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const { jsPDF } = jspdf

  const sheets = Array.from(document.querySelectorAll<HTMLElement>('.sheet'))
  if (sheets.length === 0) return

  const firstLandscape = sheets[0].classList.contains('sheet--landscape')
  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: firstLandscape ? 'landscape' : 'portrait',
  })

  for (let i = 0; i < sheets.length; i++) {
    const el = sheets[i]
    const landscape = el.classList.contains('sheet--landscape')
    const canvas = await html2canvas(el, {
      scale: SCALE,
      backgroundColor: '#ffffff',
      useCORS: true,
      // html2canvas kann SVG-<img> (unsere QR-Codes) nicht zeichnen - deshalb
      // ersetzen wir sie im Klon durch ein frisch gezeichnetes Canvas.
      onclone: (doc) => replaceQrWithCanvas(doc),
    })
    const img = canvas.toDataURL('image/jpeg', JPEG_QUALITY)

    const pageW = landscape ? 297 : 210
    const pageH = landscape ? 210 : 297

    if (i > 0) pdf.addPage('a4', landscape ? 'landscape' : 'portrait')
    // Bild in die Seite einpassen (Seitenverhältnis erhalten).
    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height)
    const w = canvas.width * ratio
    const h = canvas.height * ratio
    const x = (pageW - w) / 2
    const y = (pageH - h) / 2
    pdf.addImage(img, 'JPEG', x, y, w, h)
  }

  pdf.save(fileName)
}

/** Ersetzt alle QR-<img> im Klon-Dokument durch ein gezeichnetes Canvas. */
function replaceQrWithCanvas(doc: Document): void {
  doc.querySelectorAll<HTMLImageElement>('img.qr').forEach((img) => {
    const payload = img.getAttribute('title') ?? ''
    if (!payload) return
    const cssSize = img.getAttribute('width') ?? '62'
    const modules = qrModules(payload)
    const n = modules.length
    const margin = 2
    const px = 4
    const size = (n + margin * 2) * px

    const canvas = doc.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas.className = 'qr'
    canvas.style.width = `${cssSize}px`
    canvas.style.height = `${cssSize}px`

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, size, size)
      ctx.fillStyle = '#000'
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (modules[r][c]) ctx.fillRect((c + margin) * px, (r + margin) * px, px, px)
        }
      }
    }
    img.replaceWith(canvas)
  })
}
