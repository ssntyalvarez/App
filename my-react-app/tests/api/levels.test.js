import { describe, expect, it } from 'vitest'
import { levelFromReviews, levelFromXp, xpForLevel } from '../../src/lib/levels.js'

describe('niveles y XP', () => {
  it('sin reseñas es nivel 1, Novato', () => {
    expect(levelFromReviews([])).toMatchObject({ level: 1, title: 'Novato', xp: 0, toNext: 100 })
  })
  it('cada reseña suma 100 XP y las detalladas 50 extra', () => {
    const short = { text: 'Muy bueno.' }
    const long = { text: 'x'.repeat(200) }
    expect(levelFromReviews([short]).xp).toBe(100)
    expect(levelFromReviews([short, long]).xp).toBe(250)
    expect(levelFromReviews([short]).level).toBe(2)
  })
  it('color de anillo como Steam, cada dos niveles', () => {
    expect([1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 40].map((l) => levelFromXp(xpForLevel(l)).band)).toEqual([
      'gris', 'gris', 'rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'rosa', 'marron', 'dorado', 'dorado',
    ])
  })

  it('curva de niveles', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000])
    expect(levelFromXp(299).level).toBe(2)
    expect(levelFromXp(300)).toMatchObject({ level: 3, title: 'Aprendiz', tier: 'aprendiz' })
    expect(levelFromXp(xpForLevel(18))).toMatchObject({ title: 'Leyenda', tier: 'leyenda' })
  })
})
