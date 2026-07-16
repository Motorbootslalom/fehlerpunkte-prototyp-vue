import { useEffect, useMemo, useState } from 'react'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { getSheetDef } from '../config/active'
import { describeBoegen, exportBaseName } from '../lib/print'
import { useStore } from '../state/store'
import { SheetsDocument, type CourseImages, type LegendWidths } from './SheetsDocument'
import { loadCourseImages } from './courseImages'

// Misst die längste Fehlerbeschreibung je Listentyp (Arial ≈ Liberation Sans,
// die im PDF eingebettete Schrift), damit die Beschreibungsspalte genau passt
// und die Punkte als bündige Spalte direkt dahinter stehen.
function measureLegendWidths(typeIds: string[]): LegendWidths {
  const ctx = document.createElement('canvas').getContext('2d')
  const widths: LegendWidths = {}
  if (!ctx) return widths
  ctx.font = '7px Arial'
  for (const t of new Set(typeIds)) {
    const table = getSheetDef(t as never).errorTable
    if (table) {
      const max = Math.max(...table.map((e) => ctx.measureText(e.text).width))
      widths[t] = Math.ceil(max) + 4
    }
  }
  return widths
}

// Zweiter Prototyp: echtes Vektor-PDF via @react-pdf/renderer.
// Konfiguriert wird im Haupt-Prototyp (gemeinsamer localStorage-Zustand);
// hier gibt es eine Live-Vorschau und einen echten Ein-Klick-Download.

export function PdfApp() {
  const { state } = useStore()
  const [images, setImages] = useState<CourseImages>({})
  const [withImages, setWithImages] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!withImages) {
      setImages({})
      return
    }
    loadCourseImages(state.boegen, import.meta.env.BASE_URL).then((imgs) => {
      if (!cancelled) setImages(imgs)
    })
    return () => {
      cancelled = true
    }
  }, [state.boegen, withImages])

  const legendWidths = useMemo(
    () => measureLegendWidths(state.boegen.map((b) => b.typeId)),
    [state.boegen],
  )

  const doc = <SheetsDocument state={state} images={images} legendWidths={legendWidths} />
  const name =
    exportBaseName(
      state.eventName,
      describeBoegen(state.boegen, (t) => getSheetDef(t).title),
      new Date(),
    ) + '.pdf'

  return (
    <div className="pdf-app">
      <header className="pdf-bar">
        <div className="pdf-bar-left">
          <strong>Vektor-PDF-Prototyp</strong>
          <span className="pdf-sub">react-pdf · scharfer Text · Vektor-QR · Ein-Klick-Download</span>
        </div>
        <div className="pdf-bar-right">
          <label className="pdf-toggle" title="Parcoursbild als PNG einbetten">
            <input
              type="checkbox"
              checked={withImages}
              onChange={(e) => setWithImages(e.target.checked)}
            />
            Parcoursbild
          </label>
          <a href="./index.html" className="pdf-back">
            ← Haupt-Prototyp
          </a>
          {state.boegen.length > 0 && (
            <PDFDownloadLink document={doc} fileName={name} className="pdf-dl">
              {({ loading }) => (loading ? '… erzeuge PDF' : '⬇ PDF herunterladen')}
            </PDFDownloadLink>
          )}
        </div>
      </header>

      {state.boegen.length === 0 ? (
        <p className="pdf-empty">
          Keine Bögen ausgewählt. Bitte im{' '}
          <a href="./index.html">Haupt-Prototyp</a> Bögen zusammenstellen und diese Seite neu
          laden.
        </p>
      ) : (
        <PDFViewer className="pdf-viewer" showToolbar>
          {doc}
        </PDFViewer>
      )}
    </div>
  )
}
