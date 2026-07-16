import { Fragment } from 'react'
import type { ErrorGroup, SheetDef } from '../types'

/** Fußbereich eines Bogens: Fehlertabelle, Hinweise und Disqualifikations-Codes. */
export function Legend({ def }: { def: SheetDef }) {
  return (
    <div className="legend">
      {def.errorGroups && def.errorGroups.length > 0 ? (
        <GroupedErrors groups={def.errorGroups} />
      ) : (
        def.errorTable && (
          <div className="legend-block">
            <div className="legend-title">{def.errorTableTitle ?? 'Fehler:'}</div>
            <table className="legend-errors">
              <tbody>
                {def.errorTable.map((e) => (
                  <tr key={e.code}>
                    <td className="lc-code">{e.code}</td>
                    <td className="lc-text">{e.text}</td>
                    <td className="lc-pts">{e.punkte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {def.legendNote && <div className="legend-note">{def.legendNote}</div>}

      {def.disqTable && def.disqTable.length > 0 && (
        <div className="legend-block">
          <div className="legend-title">Disqualifikation:</div>
          <table className="legend-disq">
            <tbody>
              {def.disqTable.map((d) => (
                <tr key={d.code}>
                  <td className="lc-code">{d.code}</td>
                  <td className="lc-text">{d.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * Mehrere Fehlerblöcke (z. B. Steg Ablegen | Anlegen) sauber getrennt
 * nebeneinander: je 3 Spalten (Code, Text, Punkte), dazwischen eine schmale
 * Puffer-Spalte. Kürzere Blöcke werden mit Leerzeilen aufgefüllt.
 */
function GroupedErrors({ groups }: { groups: ErrorGroup[] }) {
  const maxRows = Math.max(...groups.map((g) => g.rows.length))
  return (
    <div className="legend-block">
      <table className="legend-errors legend-grouped">
        <thead>
          <tr>
            {groups.map((g, gi) => (
              <Fragment key={gi}>
                {gi > 0 && <th className="lc-buffer" aria-hidden />}
                <th className="lc-grouptitle" colSpan={3}>
                  {g.title ?? 'Fehler:'}
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRows }, (_, ri) => (
            <tr key={ri}>
              {groups.map((g, gi) => {
                const e = g.rows[ri]
                return (
                  <Fragment key={gi}>
                    {gi > 0 && <td className="lc-buffer" aria-hidden />}
                    <td className="lc-code">{e?.code ?? ''}</td>
                    <td className="lc-text">{e?.text ?? ''}</td>
                    <td className="lc-pts">{e ? e.punkte : ''}</td>
                  </Fragment>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
