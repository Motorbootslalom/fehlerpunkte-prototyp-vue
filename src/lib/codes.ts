// Formatierung der Fehlercode-Felder (z. B. Steg "Fehler AB/AN", MüB, Tor 5).
// Beim Verlassen des Feldes werden die eingegebenen Codes numerisch sortiert
// und einheitlich mit ", " getrennt. Mehrfachnennungen bleiben erhalten (sie
// zählen als mehrere Fehler).

/**
 * Normalisiert eine Fehler-Spalte beim Verlassen und lässt NUR gültige Werte zu:
 * Zahlen aus dem Spalten-Katalog (aufsteigend sortiert) sowie erlaubte
 * Disqualifikations-Buchstaben (großgeschrieben, ohne Dubletten, hinten).
 * Ungültige Codes/Buchstaben werden entfernt. Beispiel (Steg AB, allowedCodes
 * {3,4,5}): "12 4 k 3" → "3, 4, K"  (12 verworfen, k → K).
 */
export function normalizeCodeCell(
  raw: string,
  allowedCodes: Set<string>,
  allowedDisqs: Set<string>,
): string {
  const nums: number[] = []
  const letters: string[] = []
  for (const token of raw.split(/[\s,;/]+/)) {
    const t = token.trim()
    if (t === '') continue
    if (/^\d+$/.test(t)) {
      if (allowedCodes.has(t)) nums.push(Number(t))
    } else {
      for (const ch of t.toUpperCase()) if (allowedDisqs.has(ch)) letters.push(ch)
    }
  }
  nums.sort((a, b) => a - b)
  const uniqLetters = [...new Set(letters)].sort()
  return [...nums.map(String), ...uniqLetters].join(', ')
}
