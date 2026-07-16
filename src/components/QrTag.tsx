import { useMemo } from 'react'
import { qrSvgDataUri } from '../lib/qr'

/** Kleiner QR-Code (SVG) zur späteren automatischen Scanner-Erfassung. */
export function QrTag({ payload, size = 64 }: { payload: string; size?: number }) {
  const uri = useMemo(() => qrSvgDataUri(payload), [payload])
  return (
    <img
      className="qr"
      src={uri}
      width={size}
      height={size}
      alt={`QR: ${payload}`}
      title={payload}
    />
  )
}
