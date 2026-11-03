import { describe, expect, it } from 'vitest'
import { HANDLE_PATTERN, normalizeHandle } from '../../src/lib/profiles.js'

describe('alias estilo Instagram', () => {
  it('normaliza mientras se escribe', () => {
    expect(normalizeHandle('@Juan Pérez.99!')).toBe('juanprez.99')
    expect(normalizeHandle('@@ana')).toBe('ana')
    expect(normalizeHandle('x'.repeat(40))).toHaveLength(30)
  })
  it.each(['ana', 'ana.garcia', 'a_b.c_d', 'gamer_99', 'x'.repeat(30)])('acepta %s', (h) => {
    expect(HANDLE_PATTERN.test(h)).toBe(true)
  })
  it.each(['ab', '.ana', 'ana.', 'ana..g', 'ana-g', 'Ana', 'x'.repeat(31)])('rechaza %s', (h) => {
    expect(HANDLE_PATTERN.test(h)).toBe(false)
  })
})
