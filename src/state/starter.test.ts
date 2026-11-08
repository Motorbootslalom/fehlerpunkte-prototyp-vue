import { describe, expect, it } from 'vitest'
import { defaultState } from './initState'
import { reducer } from './store'

describe('Namen der Starter einfügen', () => {
  const stand = { ...defaultState(), numbers: { E: ['E1', 'E2'], '4': ['401', '402'] }, starter: { '4': { '402': { name: 'Alt', vorname: 'A' } } } }

  it('gibt Nummern einer anderen Klasse dort ihren Namen, neue kommen zur Klasse', () => {
    const neu = reducer(stand, {
      type: 'SET_STARTER',
      klasse: 'E',
      starter: {
        E1: { name: 'Eins', vorname: 'E' },
        '401': { name: 'Vier', vorname: 'Null' },
        E9: { name: 'Neu', vorname: 'N' },
      },
    })
    expect(neu.starter.E).toEqual({ E1: { name: 'Eins', vorname: 'E' }, E9: { name: 'Neu', vorname: 'N' } })
    expect(neu.starter['4']).toEqual({ '401': { name: 'Vier', vorname: 'Null' }, '402': { name: 'Alt', vorname: 'A' } })
    expect(neu.numbers.E).toEqual(['E1', 'E2', 'E9'])
    expect(neu.numbers['4']).toEqual(['401', '402'])
  })

  it('lässt beim Bearbeiten einer Klasse die übrigen Klassen stehen', () => {
    const neu = reducer(stand, { type: 'SET_STARTER', klasse: 'E', starter: {} })
    expect(neu.starter['4']).toEqual(stand.starter['4'])
    expect(neu.starter.E).toEqual({})
  })
})
