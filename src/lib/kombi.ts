import type { Bogen } from '../types'

// Wechsel der Option „Tor 5 übernimmt die Parcoursüberwachung“ in der Bögen-Liste.

export interface KombiDef {
  positionId: string
  ersetzt: string[]
}

/**
 * Je Klasse/Lauf wird der erste ersetzte Bogen zur Kombi-Liste, die übrigen entfallen.
 * Der erste behält seine ID und damit die eingetragenen Werte.
 */
export function zusammenlegen(boegen: Bogen[], kombi: KombiDef): Bogen[] {
  const gesehen = new Set<string>()
  return boegen.flatMap((b) => {
    if (!kombi.ersetzt.includes(b.typeId)) return [b]
    const key = `${b.klasse}:${b.lauf}`
    if (gesehen.has(key)) return []
    gesehen.add(key)
    return [{ ...b, typeId: kombi.positionId }]
  })
}

/**
 * Die Kombi-Liste wird wieder zur ersten ersetzten Position; die übrigen kommen ans
 * Ende des Blocks derselben Klasse/Lauf (dort steht auch der Parcours im Aufbau).
 */
export function trennen(boegen: Bogen[], kombi: KombiDef, neueId: () => string): Bogen[] {
  const [erste, ...weitere] = kombi.ersetzt
  const out: Bogen[] = []
  let offen: Bogen[] = []
  boegen.forEach((b, i) => {
    if (b.typeId === kombi.positionId) {
      out.push({ ...b, typeId: erste })
      offen.push(...weitere.map((typeId) => ({ id: neueId(), typeId, klasse: b.klasse, lauf: b.lauf })))
    } else {
      out.push(b)
    }
    const naechster = boegen[i + 1]
    if (!naechster || naechster.klasse !== b.klasse || naechster.lauf !== b.lauf) {
      out.push(...offen)
      offen = []
    }
  })
  return out
}
