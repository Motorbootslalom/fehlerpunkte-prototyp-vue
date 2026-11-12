import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import { bildDatei, getBogenTexte, getSheetDef } from '../config/active'
import { bogenLeser, parcoursImKopf, wkrVon } from '../lib/eingaben'
import { cellKey, columnsForClass, defFuerKlasse, scoreRow, summenText } from '../lib/scoring'
import { pageChunks } from '../lib/paging'
import { formatTimeDisplay, parseTime } from '../lib/time'
import { bogenCode } from '../lib/qr'
import type { AppState, Bogen, CellKind, Column, SheetDef, TrennerDesign } from '../types'
import { QrPdf } from './Qr'

// Echtes Vektor-PDF via @react-pdf/renderer - zum Vergleich mit dem
// Browser-Druck / Raster-Export. Nutzt dieselben Sheet-Definitionen und
// dieselbe Punkte-/Disq-Logik wie der Haupt-Prototyp.

// Eingebettete Schrift (Liberation Sans, Arial-metrisch) - enthält Σ und
// Umlaute, anders als die eingebaute Helvetica.
Font.register({
  family: 'Sheet',
  fonts: [
    { src: `${import.meta.env.BASE_URL}fonts/LiberationSans-Regular.ttf`, fontWeight: 400 },
    { src: `${import.meta.env.BASE_URL}fonts/LiberationSans-Bold.ttf`, fontWeight: 700 },
  ],
})

const INK = '#000000'

const s = StyleSheet.create({
  page: { paddingTop: 16, paddingBottom: 26, paddingHorizontal: 16, fontSize: 8, fontFamily: 'Sheet' },
  headerBox: { borderWidth: 1.4, borderColor: INK, marginBottom: 5 },
  eventBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1.4,
    borderColor: INK,
    minHeight: 30,
    position: 'relative',
    paddingVertical: 3,
  },
  eventTitle: { fontSize: 15, fontWeight: 'bold' },
  qrWrap: { position: 'absolute', right: 3, top: 3, width: 40, height: 40 },
  headerBody: { flexDirection: 'row' },
  headerLeft: { width: 110, borderRightWidth: 1.4, borderColor: INK },
  hlCell: { borderBottomWidth: 1, borderColor: INK, paddingVertical: 3, textAlign: 'center', fontSize: 9 },
  hlTitle: { fontWeight: 'bold' },
  wkrBox: { flex: 1, flexDirection: 'row', padding: 4, gap: 4 },
  wkrLabel: { fontSize: 9 },

  table: { borderTopWidth: 0.5, borderLeftWidth: 0.5, borderColor: INK },
  row: { flexDirection: 'row' },
  cell: {
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: INK,
    paddingVertical: 2,
    paddingHorizontal: 2,
    textAlign: 'center',
    justifyContent: 'center',
    minHeight: 14,
  },
  headCell: { fontWeight: 'bold', fontSize: 7.5, backgroundColor: '#fff' },
  groupCell: { padding: 0, flexDirection: 'column' },
  groupLabel: { textAlign: 'center', fontWeight: 'bold', fontSize: 7.5, borderBottomWidth: 0.5, borderColor: INK, paddingVertical: 1 },
  subRow: { flexDirection: 'row', flexGrow: 1 },
  shaded: { backgroundColor: '#dcdcdc' },
  // Kein eigener Hintergrund: sonst überdeckt er die Grau-Schattierung der
  // 5. Zeile. Die fette Schrift kennzeichnet die berechnete Spalte.
  sumCell: { fontWeight: 'bold' },
  leftText: { textAlign: 'left' },

  legend: { marginTop: 6, fontSize: 7 },
  legendTitle: { fontWeight: 'bold', textDecoration: 'underline', marginBottom: 2, marginTop: 4 },
  legendRow: { flexDirection: 'row', marginBottom: 0.5 },
  lcCode: { width: 16, fontWeight: 'bold', textAlign: 'center' },
  lcText: {}, // Breite/Flex wird je Kontext inline gesetzt
  lcPts: { width: 24, textAlign: 'right', fontWeight: 'bold', marginLeft: 6 }, // ausgerichtete Punkte-Spalte
  // Kein fontStyle: 'italic' - die eingebettete Schrift hat keine Kursiv-Variante
  // registriert (react-pdf würde sonst beim Auflösen hängen).
  note: { fontSize: 7, color: '#333', marginBottom: 1 },

  // marginTop = Platz zum Unterschreiben über der Linie.
  signatureRow: { marginTop: 42, position: 'relative', alignItems: 'flex-end' },
  pageIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
    color: INK,
  },
  signature: { alignItems: 'flex-end' },
  sigLine: { width: 160, borderTopWidth: 0.6, borderColor: INK, marginBottom: 2 },
  sigLabel: { fontSize: 8 },
  course: { marginTop: 6 },
  courseImg: { objectFit: 'contain' },
})

interface Leaf {
  colKey: string
  subIndex?: number
  kind: CellKind
  /** Trennlinie am linken Rand (nur am ersten Blatt einer Spalte gesetzt). */
  trenner?: TrennerDesign
}

function toLeaves(columns: Column[]): Leaf[] {
  return columns.flatMap((col) =>
    col.sub && col.sub.length > 0
      ? col.sub.map((_, i) => ({
          colKey: col.key,
          subIndex: i,
          kind: col.kind,
          trenner: i === 0 ? col.trenner : col.subTrenner,
        }))
      : [{ colKey: col.key, kind: col.kind, trenner: col.trenner }],
  )
}

/** Linke Trennlinie als react-pdf-Style (kennt nur solid/dashed/dotted). */
function trennerStyle(trenner?: TrennerDesign): Style {
  if (!trenner) return {}
  const borderLeftColor = INK
  if (trenner === 'gepunktet') return { borderLeftWidth: 1.5, borderLeftColor, borderLeftStyle: 'dotted' }
  if (trenner === 'gestrichelt') return { borderLeftWidth: 1.5, borderLeftColor, borderLeftStyle: 'dashed' }
  // fett / doppelt: react-pdf kann kein 'double' → dicke durchgezogene Linie.
  return { borderLeftWidth: trenner === 'doppelt' ? 2 : 1.5, borderLeftColor }
}

/** Feste Breite bzw. Flex-Anteil je Spaltenart (für die Ausrichtung). */
function colFlex(kind: CellKind, grow?: number, einzeln?: boolean): { width?: number; flexGrow?: number; flexBasis?: number } {
  if (kind === 'sum') return { width: einzeln ? 52 : 26 }
  if (kind === 'disq') return { width: 40 }
  if (grow) return { flexGrow: grow, flexBasis: 0 }
  return { flexGrow: 1, flexBasis: 0 }
}

const NR_WIDTH = 26

interface RowData {
  id: string
  nr: string
  fixed: boolean
  shaded: boolean
}

/**
 * key = "<dir>/<datei>/<drehung>" → data-URI; die Datei kommt aus der Kursvariante (bildDatei).
 * Im Browser erzeugte Bilder teilen sich den Quellordner, ihre Abblendung gehört deshalb dazu.
 */
export type CourseImages = Record<string, string>

export function courseKey(dir: string, datei: string, drehung: number, erzeugen?: { dim: string[]; aus: string[] }): string {
  const vorgabe = erzeugen ? `/${erzeugen.dim.join(',')}|${erzeugen.aus.join(',')}` : ''
  return `${dir}/${datei}/${drehung}${vorgabe}`
}

/** Breite der Beschreibungsspalte je Listentyp (in pt), im Browser gemessen. */
export type LegendWidths = Record<string, number>

export function SheetsDocument({
  state,
  images,
  legendWidths,
}: {
  state: AppState
  images: CourseImages
  legendWidths?: LegendWidths
}) {
  return (
    <Document title="Fehlerpunkte">
      {state.boegen.flatMap((b) => {
        // rowsPerPage 0 = durchlaufend (react-pdf bricht selbst um); sonst je
        // Block eine eigene A4-Seite mit Kopf, Legende/Bild und Unterschrift
        // (bei splitFrom erst ab so vielen Startern).
        const chunks = pageChunks(state.numbers[b.klasse] ?? [], state.rowsPerPage, state.splitFrom)
        return chunks.map((chunkNums, pi) => (
          <SheetPage
            key={`${b.id}:${pi}`}
            state={state}
            bogen={b}
            chunkNums={chunkNums}
            pageIndex={pi}
            pageCount={chunks.length}
            images={images}
            descWidth={legendWidths?.[b.typeId]}
          />
        ))
      })}
    </Document>
  )
}

function SheetPage({
  state,
  bogen,
  chunkNums,
  pageIndex,
  pageCount,
  images,
  descWidth,
}: {
  state: AppState
  bogen: Bogen
  chunkNums: string[]
  pageIndex: number
  pageCount: number
  images: CourseImages
  descWidth?: number
}) {
  const def = defFuerKlasse(getSheetDef(bogen.typeId), bogen.klasse)
  const get = bogenLeser(state, bogen)

  const rows: RowData[] = chunkNums.map((n) => ({ id: n, nr: n, fixed: true, shaded: false }))
  // Leerzeilen je Seite (einstellbar). Seiten-Präfix hält die Zeilen-IDs im
  // Dokument eindeutig und deckt sich mit den Zellschlüsseln der HTML-Ansicht.
  for (let i = 0; i < state.emptyRows; i++) {
    rows.push({ id: `_p${pageIndex}_x${i}`, nr: '', fixed: false, shaded: false })
  }
  rows.forEach((r, i) => (r.shaded = (i + 1) % 5 === 0))

  // Nur die für diese Klasse gültigen Spalten (z. B. Speed/MüB je Klasse).
  const cols = columnsForClass(def.columns, bogen.klasse)
  const viewDef = { ...def, columns: cols }
  const leaves = toLeaves(cols)

  return (
    <Page size="A4" orientation={def.orientation} style={s.page}>
      {/* Kopf + Spaltenüberschriften wiederholen sich auf JEDER Seite. */}
      <View fixed>
        <Header state={state} bogen={bogen} def={def} ersteSeite={pageIndex + 1} />
        <View style={[s.table, { borderBottomWidth: 0 }]}>
          <HeaderRows def={viewDef} />
        </View>
      </View>

      <View style={[s.table, { borderTopWidth: 0 }]}>
        {rows.map((row) => {
          const rowKey = row.fixed ? row.nr : row.id
          const score = scoreRow(viewDef, rowKey, get)
          const autoDisq = Array.from(
            new Set(score.disqs.filter((d) => d.where !== 'Disq.').map((d) => d.code)),
          ).join(', ')
          const nrText = row.fixed ? row.nr : get(cellKey(row.id, '__nr'))
          return (
            <View key={row.id} style={[s.row, row.shaded ? s.shaded : {}]} wrap={false}>
              <Text style={[s.cell, { width: NR_WIDTH }, s.headCell]}>{nrText}</Text>
              {leaves.map((leaf, li) => (
                <DataCell
                  key={li}
                  leaf={leaf}
                  col={cols.find((c) => c.key === leaf.colKey)!}
                  rowKey={rowKey}
                  get={get}
                  score={score}
                  autoDisq={autoDisq}
                />
              ))}
            </View>
          )
        })}
      </View>

      <CourseFooter def={def} bogen={bogen} aufbau={state.aufbau} images={images} descWidth={descWidth} />

      {/* Fuß: mittige „Seite n / X" (nur mehrseitig) auf Höhe der rechts-
          bündigen Unterschrift - wie in der HTML-Ansicht. */}
      <View style={s.signatureRow}>
        {pageCount > 1 && (
          <Text style={s.pageIndicator}>
            {getBogenTexte().seite(pageIndex + 1, pageCount)}
          </Text>
        )}
        <View style={s.signature}>
          <View style={s.sigLine} />
          <Text style={s.sigLabel}>{getBogenTexte().unterschrift}</Text>
        </View>
      </View>
    </Page>
  )
}

function Header({
  state,
  bogen,
  def,
  ersteSeite,
}: {
  state: AppState
  bogen: Bogen
  def: SheetDef
  /** Seite dieses <Page>; bricht react-pdf selbst um, zählt subPageNumber weiter. */
  ersteSeite: number
}) {
  // Klasse, Lauf und bei zwei Parcours der Parcours; die letzte Zeile ohne Linie darunter.
  const texte = getBogenTexte()
  const parcours = parcoursImKopf(state, bogen)
  const zeilen = [
    texte.klasse(bogen.klasse),
    ...(def.showLauf !== false ? [texte.lauf(bogen.lauf)] : []),
    ...(parcours ? [texte.parcours(parcours)] : []),
  ]
  return (
    <View style={s.headerBox}>
      <View style={s.eventBar}>
        <Text style={s.eventTitle}>{state.eventName}</Text>
        <View
          style={s.qrWrap}
          render={({ subPageNumber }) => (
            <QrPdf payload={bogenCode(state, bogen, ersteSeite + subPageNumber - 1)} size={40} />
          )}
        />
      </View>
      <View style={s.headerBody}>
        <View style={s.headerLeft}>
          <Text style={[s.hlCell, s.hlTitle]}>{def.title}</Text>
          {zeilen.map((text, i) => (
            <Text key={i} style={[s.hlCell, i === zeilen.length - 1 ? { borderBottomWidth: 0 } : {}]}>
              {text}
            </Text>
          ))}
        </View>
        <View style={s.wkrBox}>
          <Text style={s.wkrLabel}>{getBogenTexte().wkr} {wkrVon(state, bogen)}</Text>
        </View>
      </View>
    </View>
  )
}

function HeaderRows({ def }: { def: SheetDef }) {
  return (
    <View style={s.row}>
      <Text style={[s.cell, s.headCell, { width: NR_WIDTH }]}>{getBogenTexte().nr}</Text>
      {def.columns.map((col) => {
        const flex = colFlex(col.kind, col.grow, col.einzeln)
        const sep = trennerStyle(col.trenner)
        if (col.sub && col.sub.length > 0) {
          return (
            <View key={col.key} style={[s.cell, s.groupCell, { flexGrow: col.sub.length, flexBasis: 0 }, sep]}>
              <Text style={s.groupLabel}>{col.label}</Text>
              <View style={s.subRow}>
                {col.sub.map((sub, i) => (
                  <Text
                    key={i}
                    style={[
                      s.headCell,
                      { flexGrow: 1, flexBasis: 0, textAlign: 'center', paddingVertical: 1 },
                      i < col.sub!.length - 1 ? { borderRightWidth: 0.5, borderColor: INK } : {},
                    ]}
                  >
                    {sub}
                  </Text>
                ))}
              </View>
            </View>
          )
        }
        return (
          <Text key={col.key} style={[s.cell, s.headCell, flex, sep]}>
            {col.label}
          </Text>
        )
      })}
    </View>
  )
}

function DataCell({
  leaf,
  col,
  rowKey,
  get,
  score,
  autoDisq,
}: {
  leaf: Leaf
  col: Column
  rowKey: string
  get: (k: string) => string
  score: ReturnType<typeof scoreRow>
  autoDisq: string
}) {
  const flex = colFlex(leaf.kind, col.grow, col.einzeln)
  const ck = cellKey(rowKey, leaf.colKey, leaf.subIndex)
  const sep = trennerStyle(leaf.trenner)

  let text = ''
  let extra: Style = {}
  if (leaf.kind === 'sum') {
    text = summenText(score, leaf.colKey)
    extra = s.sumCell
  } else if (leaf.kind === 'disq') {
    const stored = get(ck)
    text = stored === '' ? autoDisq : stored
  } else if (leaf.kind === 'time') {
    const parsed = parseTime(get(ck))
    text = parsed ? formatTimeDisplay(parsed.centis) : ''
  } else {
    text = get(ck)
    // Nur Freitext linksbündig; Fehlercodes bleiben zentriert (kurze Einträge).
    if (leaf.kind === 'text') extra = s.leftText
  }

  return <Text style={[s.cell, flex, extra, sep]}>{text}</Text>
}

function CourseFooter({
  def,
  bogen,
  aufbau,
  images,
  descWidth,
}: {
  def: SheetDef
  bogen: Bogen
  aufbau: string
  images: CourseImages
  descWidth?: number
}) {
  // Um ±90° gedrehte Bilder stehen rechts neben der Legende, sonst quer darunter.
  const drehung = def.bildDrehung ?? 0
  const rotated = Math.abs(drehung) === 90
  const uri = def.courseImageDir
    ? images[courseKey(def.courseImageDir, bildDatei(aufbau, bogen.klasse), drehung, def.bildErzeugen)]
    : undefined

  if (rotated && uri) {
    return (
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        <View style={{ flex: 1 }}>
          <Legend def={def} descWidth={descWidth} />
        </View>
        <View style={{ width: 90, marginLeft: 6, borderWidth: 1, borderColor: '#7a86c9', borderStyle: 'dashed', padding: 3 }}>
          <Image src={uri} style={[s.courseImg, { width: 82 }]} />
        </View>
      </View>
    )
  }
  return (
    <View>
      <Legend def={def} descWidth={descWidth} />
      {uri && (
        <View style={{ marginTop: 6, alignItems: 'center' }}>
          <View style={{ width: 320, borderWidth: 1, borderColor: '#7a86c9', borderStyle: 'dashed', padding: 3 }}>
            <Image src={uri} style={[s.courseImg, { width: 312 }]} />
          </View>
        </View>
      )}
    </View>
  )
}

/** Grobschätzung der Beschreibungsbreite, falls keine Messung vorliegt. */
function estimateDescWidth(texts: string[]): number {
  const maxLen = Math.max(0, ...texts.map((t) => t.length))
  return Math.min(maxLen * 4 + 6, 380)
}

function Legend({ def, descWidth }: { def: SheetDef; descWidth?: number }) {
  const w = def.errorTable
    ? (descWidth ?? estimateDescWidth(def.errorTable.map((e) => e.text)))
    : 0
  return (
    <View style={s.legend}>
      {def.errorGroups && def.errorGroups.length > 0 ? (
        // Getrennte Fehlerblöcke (Steg Ablegen | Anlegen) nebeneinander.
        <View style={{ flexDirection: 'row' }}>
          {def.errorGroups.map((g, gi) => (
            <View key={gi} style={{ flex: 1, marginLeft: gi > 0 ? 12 : 0 }}>
              <Text style={s.legendTitle}>{g.title ?? 'Fehler:'}</Text>
              {g.rows.map((e) => (
                <View key={e.code} style={s.legendRow}>
                  <Text style={s.lcCode}>{e.code}</Text>
                  <Text style={[s.lcText, { flexGrow: 1, flexBasis: 0 }]}>{e.text}</Text>
                  <Text style={s.lcPts}>{e.punkte}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        def.errorTable && (
          <View>
            <Text style={s.legendTitle}>{def.errorTableTitle ?? 'Fehler:'}</Text>
            {def.errorTable.map((e) => (
              <View key={e.code} style={s.legendRow}>
                <Text style={s.lcCode}>{e.code}</Text>
                <Text style={[s.lcText, { width: w }]}>{e.text}</Text>
                <Text style={s.lcPts}>{e.punkte}</Text>
              </View>
            ))}
          </View>
        )
      )}

      {def.legendNote && <Text style={s.note}>{def.legendNote}</Text>}

      {def.disqTable && def.disqTable.length > 0 && (
        <View>
          <Text style={s.legendTitle}>{def.disqTableTitle ?? 'Disqualifikation:'}</Text>
          {def.disqTable.map((d) => (
            <View key={d.code} style={s.legendRow}>
              <Text style={s.lcCode}>{d.code}</Text>
              <Text style={[s.lcText, { flex: 1 }]}>{d.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
