import { useState } from 'react'
import {
  getAufbau,
  getAufbauten,
  getBeschriftungen,
  getSheetDef,
  positionAllowsClass,
} from '../config/active'
import { extendNumbers, formatNumbers, parseNumbers, shrinkNumbers } from '../lib/demo'
import { exportSheetsToPdf } from '../lib/exportPdf'
import { describeBoegen, exportBaseName, printWithFilename } from '../lib/print'
import { buildShareUrl } from '../lib/sharelink'
import { useStore } from '../state/store'
import { CLASS_IDS, type ClassId, type Lauf, type SheetTypeId } from '../types'

const LAEUFE: Lauf[] = [1, 2, 3]

/** Steuerungsleiste - nur am Bildschirm sichtbar, im Druck ausgeblendet. */
export function ControlPanel() {
  const { state, dispatch } = useStore()
  const [addClass, setAddClass] = useState<ClassId>('3')
  const [addLauf, setAddLauf] = useState<Lauf>(1)
  const [qpLauf, setQpLauf] = useState<Lauf>(1)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyShareLink() {
    const url = buildShareUrl(state)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard verweigert (z. B. ohne HTTPS): URL zur manuellen Übernahme zeigen.
      window.prompt('Link kopieren (Strg+C):', url)
    }
  }

  // Positionen des gewählten Aufbaus (Setup).
  const order = getAufbau(state.aufbau).order
  const beschriftungen = getBeschriftungen()
  const [addTypeRaw, setAddType] = useState<SheetTypeId>('')
  const addType = order.includes(addTypeRaw) ? addTypeRaw : (order[0] ?? '')

  const bulk = (items: { typeId: SheetTypeId; klasse: ClassId; lauf: Lauf }[]) =>
    // Nicht passende Klassen je Position auslassen (z. B. MüB erst ab Klasse 4).
    dispatch({
      type: 'ADD_BOEGEN_BULK',
      items: items.filter((it) => positionAllowsClass(it.typeId, it.klasse)),
    })

  // Beschreibung aus der aktuellen Bogen-Auswahl: Position/Klasse/Lauf, aber nur
  // wenn eindeutig (alle Bögen teilen denselben Wert).
  const describe = () => describeBoegen(state.boegen, (t) => getSheetDef(t).title)
  // Ohne Zeitstempel für die Vorschau in der Bedienleiste …
  const namePreview = exportBaseName(state.eventName, describe())
  // … mit Zeitstempel wird der Name erst beim Klick erzeugt.
  const currentName = () => exportBaseName(state.eventName, describe(), new Date())

  async function downloadPdf() {
    setBusy(true)
    try {
      await exportSheetsToPdf(`${currentName()}.pdf`)
    } finally {
      setBusy(false)
    }
  }

  // Version = git describe (Tag/Hash, ggf. -dirty) + Commit-Zeitstempel.
  const commitDate = __GIT_COMMIT_DATE__
    ? new Date(__GIT_COMMIT_DATE__).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
    : ''

  return (
    <aside className="control-panel">
      <h1>Fehlerpunkte-Prototyp</h1>
      <p className="cp-version" title="Aktive Version (git describe: Tag/Commits/Hash, -dirty bei lokalen Änderungen) und Zeitstempel des letzten Updates">
        Version <code>{__GIT_VERSION__}</code>
        {commitDate && <> · {commitDate}</>}
      </p>
      <p className="intro">
        Prototyp der WKR-Eingabemasken. Eingabe und Ausdruck sind dieselbe Ansicht - so lässt
        sich jede Eintragung direkt kontrollieren. Alle Daten bleiben lokal im Browser.
      </p>

      <section>
        <label className="field">
          <span>Aufbau (Setup)</span>
          <select
            value={state.aufbau}
            onChange={(e) => dispatch({ type: 'SET_AUFBAU', aufbau: e.target.value })}
            title="Bei einem Wettkampf genutzter Aufbau; wechseln erzeugt dessen Bögen neu"
          >
            {getAufbauten().map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {beschriftungen.length > 0 && (
          <label className="field" style={{ marginTop: 8 }}>
            <span>Bezeichnung der Bojen-Seiten</span>
            <select
              value={state.beschriftung}
              onChange={(e) => dispatch({ type: 'SET_BESCHRIFTUNG', beschriftung: e.target.value })}
              title="Kürzel der Bojen-Seiten (Rechts/Links, Land/See …) - wirkt sofort auf alle Listen"
            >
              {beschriftungen.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field" style={{ marginTop: 8 }}>
          <span>Veranstaltung</span>
          <input
            value={state.eventName}
            onChange={(e) => dispatch({ type: 'SET_EVENT', eventName: e.target.value })}
          />
        </label>
        <label className="field field-nums" style={{ marginTop: 8 }}>
          <span>Leere Zeilen</span>
          <input
            type="number"
            min={0}
            max={30}
            value={state.emptyRows}
            onChange={(e) => dispatch({ type: 'SET_EMPTY_ROWS', emptyRows: Number(e.target.value) })}
          />
        </label>
        <label
          className="field field-nums"
          style={{ marginTop: 8 }}
          title="0 = automatisch (eine durchlaufende Seite). Ab 5: nach so vielen Startern beginnt eine neue Druckseite - jede Seite mit Legende/Bild/Leerzeilen und „Seite n / X“."
        >
          <span>Zeilen / Seite</span>
          <input
            type="number"
            min={0}
            max={100}
            value={state.rowsPerPage}
            onChange={(e) => dispatch({ type: 'SET_ROWS_PER_PAGE', rowsPerPage: Number(e.target.value) })}
          />
        </label>
        <p className="hint">Zeilen / Seite: 0 = automatisch, sonst Startnummern pro Druckseite (min. 5).</p>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button
            onClick={copyShareLink}
            title="Kopiert eine URL, die genau diese Zusammenstellung (Aufbau, Bezeichnung, Veranstaltung, Leerzeilen, Zeilen/Seite und die Bogen-Auswahl) wiederherstellt - ohne eingetragene Werte"
          >
            {copied ? '✓ Link kopiert' : '🔗 Einstellungs-Link kopieren'}
          </button>
        </div>
        <p className="hint">
          Die Adresszeile enthält immer den aktuellen Stand - stelle dir z. B. „alle Wasser-2-Listen"
          zusammen und teile einfach die URL. Eingetragene Werte werden nicht übertragen.
        </p>
      </section>

      <section>
        <h2>Export</h2>
        <div className="btn-row">
          <button
            onClick={() => printWithFilename(currentName())}
            title="Öffnet den Druckdialog; „Als PDF speichern“ schlägt den Dateinamen unten vor"
          >
            🖨 Drucken / Als PDF (empfohlen)
          </button>
          <button onClick={downloadPdf} disabled={busy}>
            {busy ? '… erzeuge PDF' : '⬇ PDF herunterladen (Bild)'}
          </button>
        </div>
        <p className="hint">
          <strong>Empfohlen:</strong> Browser-Druck → „Als PDF speichern“ liefert scharfen,
          markierbaren Text inkl. QR-Codes (Tipp: im Dialog „Kopf- und Fußzeilen“ deaktivieren).
          Der Download-Button erzeugt eine gerasterte Bild-PDF (unschärfer) - nur als Fallback.
          <br />
          Dateiname: <code>{namePreview} - …Uhr</code>
        </p>
        <a className="alt-link" href="./pdf.html">
          🧪 Vergleich: Vektor-PDF-Prototyp (react-pdf) öffnen →
        </a>
      </section>

      <section>
        <h2>Bögen ({state.boegen.length})</h2>

        <details className="quickpick">
          <summary className="quickpick-title">Schnellauswahl</summary>
          <div className="qp-body">
            <div className="qp-row">
              <span className="qp-label">Kompletter Lauf (alle Listen × alle Klassen):</span>
              <div className="qp-btns">
                {LAEUFE.map((l) => (
                  <button
                    key={l}
                    title={`Alle ${order.length} Listentypen × alle Klassen für den ${l}. Lauf`}
                    onClick={() =>
                      bulk(
                        CLASS_IDS.flatMap((c) =>
                          order.map((t) => ({ typeId: t, klasse: c, lauf: l })),
                        ),
                      )
                    }
                  >
                    + {l}. Lauf
                  </button>
                ))}
              </div>
            </div>

            <div className="qp-row">
              <span className="qp-label">Lauf für die folgenden Auswahlen:</span>
              <div className="qp-btns qp-lauf">
                {LAEUFE.map((l) => (
                  <button
                    key={l}
                    className={qpLauf === l ? 'active' : ''}
                    onClick={() => setQpLauf(l)}
                  >
                    {l}. Lauf
                  </button>
                ))}
              </div>
            </div>

            <div className="qp-row">
              <span className="qp-label">Eine Position · alle Klassen · {qpLauf}. Lauf:</span>
              <div className="qp-btns">
                {order.map((t) => (
                  <button
                    key={t}
                    title={`${getSheetDef(t).menuLabel} für alle Klassen (${qpLauf}. Lauf)`}
                    onClick={() =>
                      bulk(CLASS_IDS.map((c) => ({ typeId: t, klasse: c, lauf: qpLauf })))
                    }
                  >
                    {getSheetDef(t).title}
                  </button>
                ))}
              </div>
            </div>

            <div className="qp-row">
              <span className="qp-label">Eine Klasse · alle Listen · {qpLauf}. Lauf:</span>
              <div className="qp-btns">
                {CLASS_IDS.map((c) => (
                  <button
                    key={c}
                    title={`Alle Listentypen für Klasse ${c} (${qpLauf}. Lauf)`}
                    onClick={() =>
                      bulk(order.map((t) => ({ typeId: t, klasse: c, lauf: qpLauf })))
                    }
                  >
                    Kl. {c}
                  </button>
                ))}
              </div>
            </div>

            {state.boegen.length > 0 && (
              <button className="qp-clear" onClick={() => dispatch({ type: 'CLEAR_BOEGEN' })}>
                Liste leeren
              </button>
            )}
          </div>
        </details>

        <ul className="bogen-list">
          {state.boegen.map((b, i) => (
            <li key={b.id}>
              <select
                value={b.typeId}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_BOGEN',
                    id: b.id,
                    patch: { typeId: e.target.value as SheetTypeId },
                  })
                }
              >
                {order.map((t) => (
                  <option key={t} value={t}>
                    {getSheetDef(t).menuLabel}
                  </option>
                ))}
              </select>
              <select
                value={b.klasse}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_BOGEN',
                    id: b.id,
                    patch: { klasse: e.target.value as ClassId },
                  })
                }
              >
                {CLASS_IDS.map((c) => (
                  <option key={c} value={c}>
                    Kl. {c}
                  </option>
                ))}
              </select>
              <select
                value={b.lauf}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_BOGEN',
                    id: b.id,
                    patch: { lauf: Number(e.target.value) as Lauf },
                  })
                }
              >
                {LAEUFE.map((l) => (
                  <option key={l} value={l}>
                    {l}. Lauf
                  </option>
                ))}
              </select>
              <span className="bogen-actions">
                <button
                  onClick={() => dispatch({ type: 'MOVE_BOGEN', id: b.id, dir: -1 })}
                  disabled={i === 0}
                  title="nach oben"
                >
                  ↑
                </button>
                <button
                  onClick={() => dispatch({ type: 'MOVE_BOGEN', id: b.id, dir: 1 })}
                  disabled={i === state.boegen.length - 1}
                  title="nach unten"
                >
                  ↓
                </button>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_BOGEN', id: b.id })}
                  title="entfernen"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>

        <div className="add-bogen">
          <select value={addType} onChange={(e) => setAddType(e.target.value as SheetTypeId)}>
            {order.map((t) => (
              <option key={t} value={t}>
                {getSheetDef(t).menuLabel}
              </option>
            ))}
          </select>
          <select value={addClass} onChange={(e) => setAddClass(e.target.value as ClassId)}>
            {CLASS_IDS.map((c) => (
              <option key={c} value={c}>
                Kl. {c}
              </option>
            ))}
          </select>
          <select value={addLauf} onChange={(e) => setAddLauf(Number(e.target.value) as Lauf)}>
            {LAEUFE.map((l) => (
              <option key={l} value={l}>
                {l}. Lauf
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              dispatch({ type: 'ADD_BOGEN', typeId: addType, klasse: addClass, lauf: addLauf })
            }
          >
            + Bogen
          </button>
        </div>
      </section>

      <section>
        <details>
          <summary>
            <h2 style={{ display: 'inline' }}>Startnummern</h2>
          </summary>
          <p className="hint">Demo-Nummern (keine echten Daten) - frei editierbar, kommagetrennt.</p>
          {CLASS_IDS.map((c) => {
            const nums = state.numbers[c] ?? []
            return (
              <div className="field field-nums" key={c}>
                <span>Klasse {c}</span>
                <input
                  value={formatNumbers(nums)}
                  onChange={(e) =>
                    dispatch({ type: 'SET_NUMBERS', klasse: c, numbers: parseNumbers(e.target.value) })
                  }
                />
                <span className="nums-btns">
                  <button
                    title="3 Startnummern hinzufügen"
                    onClick={() =>
                      dispatch({ type: 'SET_NUMBERS', klasse: c, numbers: extendNumbers(nums, 3, c) })
                    }
                  >
                    +3
                  </button>
                  <button
                    title="3 Startnummern entfernen"
                    disabled={nums.length === 0}
                    onClick={() =>
                      dispatch({ type: 'SET_NUMBERS', klasse: c, numbers: shrinkNumbers(nums, 3) })
                    }
                  >
                    −3
                  </button>
                </span>
              </div>
            )
          })}
        </details>
      </section>

      <section>
        <button
          className="danger"
          onClick={() => {
            if (confirm('Alle Eingaben und Einstellungen zurücksetzen?')) {
              dispatch({ type: 'RESET_ALL' })
            }
          }}
        >
          Alles zurücksetzen
        </button>
      </section>

      <footer className="cp-footer">
        Konzept-Prototyp · keine echten personenbezogenen Daten
      </footer>
    </aside>
  )
}
