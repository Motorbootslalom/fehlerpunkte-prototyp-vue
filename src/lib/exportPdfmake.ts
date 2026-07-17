// Vektor-PDF-Export über pdfmake (deklarativer Dokument-Ansatz, dem react-pdf am
// nächsten). Erzeugt echten, markierbaren Vektor-Text und einen Vektor-QR (in
// pdfmake eingebaut). Das Bogen-Layout ist bewusst vereinfacht: ein Kopf je
// Blatt-Spalte (Bojen-Unterspalten als „Tor 1 H R" ausgeschrieben) statt der
// zweizeiligen Gruppenköpfe der WYSIWYG-Ansicht. Parcoursbilder sind hier nicht
// eingebettet (dafür Browser-Druck oder die react-pdf-Insel nutzen).
//
// Die schwere Bibliothek wird erst beim Klick dynamisch geladen.

import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { AppState } from '../types'
import { buildAllPages, type SheetModelPage } from './sheetModel'

const SHADE = '#eeeeee'

function leafWidth(kind: string): number | '*' {
  if (kind === 'sum') return 18
  if (kind === 'disq') return 24
  if (kind === 'text') return '*' as const
  return 22
}

function legendContent(pg: SheetModelPage): Content[] {
  const out: Content[] = []
  const def = pg.def

  if (def.errorGroups && def.errorGroups.length > 0) {
    for (const g of def.errorGroups) {
      out.push({ text: g.title ?? 'Fehler:', bold: true, fontSize: 6, margin: [0, 2, 0, 0] })
      out.push({
        text: g.rows.map((e) => `${e.code}  ${e.text}  (${e.punkte})`).join('\n'),
        fontSize: 6,
      })
    }
  } else if (def.errorTable && def.errorTable.length > 0) {
    out.push({ text: def.errorTableTitle ?? 'Fehler:', bold: true, fontSize: 6, margin: [0, 2, 0, 0] })
    out.push({
      text: def.errorTable.map((e) => `${e.code}  ${e.text}  (${e.punkte})`).join('\n'),
      fontSize: 6,
    })
  }

  if (def.legendNote) out.push({ text: def.legendNote, italics: true, fontSize: 6, margin: [0, 2, 0, 0] })

  if (def.disqTable && def.disqTable.length > 0) {
    out.push({ text: 'Disqualifikation:', bold: true, fontSize: 6, margin: [0, 2, 0, 0] })
    out.push({
      text: def.disqTable.map((d) => `${d.code}  ${d.text}`).join('\n'),
      fontSize: 6,
    })
  }
  return out
}

function pageContent(pg: SheetModelPage): Content[] {
  // Kopf: Veranstaltung + Vektor-QR, darunter Listentyp/Klasse/Lauf.
  const subTitle =
    `${pg.title} · Klasse ${pg.klasse}` + (pg.showLauf ? ` · ${pg.lauf}. Lauf` : '')

  const headerRow: TableCell[] = [
    { text: 'Nr.', style: 'th' },
    ...pg.leaves.map((l) => ({ text: l.label, style: 'th' })),
  ]
  const bodyRows: TableCell[][] = pg.rows.map((r) => [
    { text: r.nr, style: 'td' },
    ...r.cells.map((c) => ({ text: c.display, style: 'td' })),
  ])
  const widths = ['auto', ...pg.leaves.map((l) => leafWidth(l.kind))]

  const content: Content[] = [
    {
      columns: [
        { text: pg.eventName, bold: true, fontSize: 10 },
        { qr: pg.qrPayload, fit: 46, alignment: 'right', width: 50 },
      ],
    },
    { text: subTitle, fontSize: 8, margin: [0, 2, 0, 4] },
    {
      table: { headerRows: 1, widths, body: [headerRow, ...bodyRows] },
      layout: {
        fillColor: (rowIndex: number) =>
          rowIndex > 0 && pg.rows[rowIndex - 1]?.shaded ? SHADE : null,
        hLineWidth: () => 0.4,
        vLineWidth: () => 0.4,
        hLineColor: () => '#999999',
        vLineColor: () => '#999999',
      },
    },
    { stack: legendContent(pg), margin: [0, 6, 0, 0] },
    {
      columns: [
        pg.pageCount > 1
          ? { text: `Seite ${pg.pageIndex + 1} / ${pg.pageCount}`, fontSize: 7, alignment: 'center' }
          : { text: '' },
        { text: '________________________\nUnterschrift WKR', fontSize: 7, alignment: 'right', width: 160 },
      ],
      margin: [0, 8, 0, 0],
    },
  ]
  return content
}

export async function exportPdfmake(fileName: string, state: AppState): Promise<void> {
  const pages = buildAllPages(state)
  if (pages.length === 0) return

  const pdfMakeMod = (await import('pdfmake/build/pdfmake')) as unknown as { default: any }
  const vfsMod = (await import('pdfmake/build/vfs_fonts')) as unknown as Record<string, any>
  const pdfMake = pdfMakeMod.default ?? pdfMakeMod
  // vfs (eingebettete Schriften) liegt je nach pdfmake-Version an anderer Stelle.
  const vfs =
    vfsMod.default?.pdfMake?.vfs ?? vfsMod.pdfMake?.vfs ?? vfsMod.default?.vfs ?? vfsMod.vfs
  if (vfs) pdfMake.vfs = vfs

  const content: Content[] = []
  pages.forEach((pg, i) => {
    if (i > 0) content.push({ text: '', pageBreak: 'before' })
    content.push(...pageContent(pg))
  })

  const doc: TDocumentDefinitions = {
    // Querformat, damit auch breite Tor-Blätter passen.
    pageOrientation: 'landscape',
    pageSize: 'A4',
    pageMargins: [24, 24, 24, 24],
    content,
    defaultStyle: { fontSize: 7 },
    styles: {
      th: { bold: true, fontSize: 6.5, fillColor: '#e5e5e5' },
      td: { fontSize: 7 },
    },
  }

  pdfMake.createPdf(doc).download(fileName)
}
