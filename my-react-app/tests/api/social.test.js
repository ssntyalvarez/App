import { describe, expect, it } from 'vitest'
import { sortByHelpful } from '../../src/lib/reviews.js'
import { isUnread } from '../../src/lib/social.js'

const at = (ms) => ({ toMillis: () => ms })

describe('mensajes sin leer', () => {
  const chat = (extra = {}) => ({ id: 'ana_beto', lastSender: 'beto', updatedAt: at(2000), ...extra })

  it('está sin leer si el último mensaje es de la otra persona y nunca se leyó', () => {
    expect(isUnread(chat(), 'ana')).toBe(true)
  })
  it('el último mensaje propio nunca cuenta como no leído', () => {
    expect(isUnread(chat(), 'beto')).toBe(false)
  })
  it('deja de estar sin leer cuando la lectura es posterior al último mensaje', () => {
    expect(isUnread(chat({ readBy: { ana: at(2500) } }), 'ana')).toBe(false)
    expect(isUnread(chat({ readBy: { ana: at(1500) } }), 'ana')).toBe(true)
  })
  it('la lectura de la otra persona no cuenta como propia', () => {
    expect(isUnread(chat({ readBy: { beto: at(9000) } }), 'ana')).toBe(true)
  })
  it('sin conversación o sin mensajes no hay nada sin leer', () => {
    expect(isUnread(null, 'ana')).toBe(false)
    expect(isUnread({ id: 'ana_beto' }, 'ana')).toBe(false)
  })
})

describe('orden por “me sirvió”', () => {
  const reviews = [
    { id: 'a', updatedAt: at(3000) },
    { id: 'b', updatedAt: at(2000) },
    { id: 'c', updatedAt: at(1000) },
  ]
  it('primero las más votadas y, a igual cantidad, las más recientes', () => {
    const votes = { c: ['u1', 'u2'], b: ['u1'] }
    expect(sortByHelpful(reviews, votes).map((r) => r.id)).toEqual(['c', 'b', 'a'])
    expect(sortByHelpful(reviews, {}).map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
  it('no modifica la lista original', () => {
    sortByHelpful(reviews, { c: ['u1'] })
    expect(reviews.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
})
