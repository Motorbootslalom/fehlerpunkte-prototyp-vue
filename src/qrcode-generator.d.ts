// Minimale Typdeklaration für qrcode-generator (bringt keine eigenen Typen mit).
declare module 'qrcode-generator' {
  type Mode = 'Numeric' | 'Alphanumeric' | 'Byte' | 'Kanji'
  interface QRCode {
    addData(data: string, mode?: Mode): void
    make(): void
    getModuleCount(): number
    isDark(row: number, col: number): boolean
  }
  type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'
  function qrcode(typeNumber: number, errorCorrectionLevel: ErrorCorrectionLevel): QRCode
  export = qrcode
}
