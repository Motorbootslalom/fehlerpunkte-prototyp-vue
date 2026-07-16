import { bogenPayload } from '../lib/qr'
import type { Bogen, SheetDef } from '../types'
import { QrTag } from './QrTag'

/** Kopfbereich eines Bogens: Event-Titel, Listentyp/Klasse/Lauf, WKR-Feld, QR. */
export function SheetHeader({
  def,
  bogen,
  eventName,
  wkr,
  onWkr,
}: {
  def: SheetDef
  bogen: Bogen
  eventName: string
  wkr: string
  onWkr: (name: string) => void
}) {
  return (
    <div className="sheet-header">
      <div className="event-bar">
        <span className="event-title">{eventName}</span>
        <QrTag payload={bogenPayload(eventName, bogen)} size={62} />
      </div>
      <div className="header-body">
        <div className="header-left">
          <div className="hl-cell hl-title">{def.title}</div>
          <div className="hl-cell">Klasse {bogen.klasse}</div>
          {def.showLauf !== false && <div className="hl-cell">{bogen.lauf}. Lauf</div>}
        </div>
        <label className="wkr-box">
          <span className="wkr-label">WKR:</span>
          <input
            className="wkr-input"
            value={wkr}
            onChange={(e) => onWkr(e.target.value)}
            placeholder="Name Wettkampfrichter*in"
          />
        </label>
      </div>
    </div>
  )
}
