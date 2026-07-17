// Vektor-PDF-Export über jsPDF + jspdf-autotable. Im Gegensatz zur Raster-
// Variante (lib/exportPdf.ts, html2canvas) wird hier ECHTER Vektor-Text
// gezeichnet und die Tabelle von autotable gesetzt (Kopf wiederholt sich bei
// Umbruch automatisch). Der QR-Code wird als Vektor-Rechtecke gezeichnet.
// Parcoursbilder sind hier nicht eingebettet (dafür Browser-Druck / react-pdf).
//
// Die Bibliotheken werden erst beim Klick dynamisch geladen.

import type { AppState } from '../types'
import { qrModules } from './qr'
import { buildAllPages, type SheetModelPage } from './sheetModel'

const SHADE: [number, number, number] = [238, 238, 238]

/** Zeichnet den QR-Code als Vektor-Rechtecke (scharf, klein). */
function drawQr(doc: any, payload: string, x: number, y: number, sizeMm: number): void {
  const modules = qrModules(payload)
  const n = modules.length
  const margin = 2
  const total = n + margin * 2
  const px = sizeMm / total
  doc.setFillColor(255, 255, 255)
  doc.rect(x, y, sizeMm, sizeMm, 'F')
  doc.setFillColor(0, 0, 0)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r][c]) doc.rect(x + (c + margin) * px, y + (r + margin) * px, px, px, 'F')
    }
  }
}

function drawLegend(doc: any, pg: SheetModelPage, startY: number, marginX: number): number {
  const def = pg.def
  let y = startY
  doc.setFontSize(6)
  const line = (text: string, bold = false, italic = false) => {
    doc.setFont('helvetica', bold ? 'bold' : italic ? 'italic' : 'normal')
    const wrapped = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - marginX * 2)
    doc.text(wrapped, marginX, y)
    y += wrapped.length * 2.6
  }

  if (def.errorGroups && def.errorGroups.length > 0) {
    for (const g of def.errorGroups) {
      line(g.title ?? 'Fehler:', true)
      for (const e of g.rows) line(`${e.code}  ${e.text}  (${e.punkte})`)
    }
  } else if (def.errorTable && def.errorTable.length > 0) {
    line(def.errorTableTitle ?? 'Fehler:', true)
    for (const e of def.errorTable) line(`${e.code}  ${e.text}  (${e.punkte})`)
  }
  if (def.legendNote) line(def.legendNote, false, true)
  if (def.disqTable && def.disqTable.length > 0) {
    line('Disqualifikation:', true)
    for (const d of def.disqTable) line(`${d.code}  ${d.text}`)
  }
  doc.setFont('helvetica', 'normal')
  return y
}

export async function exportJsPdfVector(fileName: string, state: AppState): Promise<void> {
  const pages = buildAllPages(state)
  if (pages.length === 0) return

  const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const autoTable = (autoTableMod as unknown as { default: any }).default

  // Querformat für alle Blätter (auch die breiten Tor-Listen passen so).
  const doc: any = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 8
  const headerBottom = 22 // Platz für Kopf (Veranstaltung + QR)

  pages.forEach((pg, i) => {
    if (i > 0) doc.addPage('a4', 'landscape')

    // Laufender Kopf auf jeder physischen Seite dieses Blatts.
    const drawHeader = () => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(pg.eventName, marginX, 10)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const sub = `${pg.title} · Klasse ${pg.klasse}` + (pg.showLauf ? ` · ${pg.lauf}. Lauf` : '')
      doc.text(sub, marginX, 16)
      drawQr(doc, pg.qrPayload, pageW - marginX - 16, 4, 16)
    }

    autoTable(doc, {
      startY: headerBottom,
      margin: { top: headerBottom, left: marginX, right: marginX },
      head: [['Nr.', ...pg.leaves.map((l) => l.label)]],
      body: pg.rows.map((r) => [r.nr, ...r.cells.map((c) => c.display)]),
      styles: { fontSize: 6, cellPadding: 0.8, lineWidth: 0.1, lineColor: [150, 150, 150], textColor: 20 },
      headStyles: { fillColor: [229, 229, 229], textColor: 20, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10 } },
      didParseCell: (data: any) => {
        if (data.section === 'body' && pg.rows[data.row.index]?.shaded) {
          data.cell.styles.fillColor = SHADE
        }
      },
      didDrawPage: () => drawHeader(),
    })

    let y = (doc.lastAutoTable?.finalY ?? headerBottom) + 4
    y = drawLegend(doc, pg, y, marginX)

    // Unterschrift + ggf. Seitenangabe.
    y += 3
    doc.setFontSize(7)
    if (pg.pageCount > 1) doc.text(`Seite ${pg.pageIndex + 1} / ${pg.pageCount}`, marginX, y)
    doc.text('________________________  Unterschrift WKR', pageW - marginX - 70, y)
  })

  doc.save(fileName)
}
