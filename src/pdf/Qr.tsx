import { Path, Rect, Svg } from '@react-pdf/renderer'
import { qrModules } from '../lib/qr'

/** QR-Code als echtes Vektor-SVG im PDF. */
export function QrPdf({ payload, size }: { payload: string; size: number }) {
  const modules = qrModules(payload)
  const n = modules.length
  const margin = 2
  const total = n + margin * 2
  let d = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r][c]) d += `M${c + margin} ${r + margin}h1v1h-1z`
    }
  }
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`}>
      <Rect x={0} y={0} width={total} height={total} fill="#ffffff" />
      <Path d={d} fill="#000000" />
    </Svg>
  )
}
