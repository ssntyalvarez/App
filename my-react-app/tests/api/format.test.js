import { describe, expect, it } from 'vitest'
import { rawgImage } from '../../src/lib/format.js'

describe('rawgImage', () => {
  const src = 'https://media.rawg.io/media/games/adb/a.jpg'
  it('usa solo anchos que RAWG acepta', () => {
    expect(rawgImage(src, 960)).toBe('https://media.rawg.io/media/resize/1280/-/games/adb/a.jpg')
    expect(rawgImage(src, 420)).toBe('https://media.rawg.io/media/resize/420/-/games/adb/a.jpg')
    expect(rawgImage(src, 1600)).toBe('https://media.rawg.io/media/resize/1920/-/games/adb/a.jpg')
  })
  it('no toca otras URLs ni valores vacíos', () => {
    expect(rawgImage(null)).toBeNull()
    expect(rawgImage('https://example.com/x.jpg')).toBe('https://example.com/x.jpg')
  })
})
