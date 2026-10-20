import { describe, expect, it, vi } from 'vitest'
import { buildUpstream, handleRawgRequest } from '../../api/_lib/rawg.js'

const url = (qs) => `http://localhost/api/rawg?${qs}`
const params = (qs) => new URLSearchParams(qs)

describe('buildUpstream: lista blanca de rutas y parámetros', () => {
  it('arma la consulta de juegos con filtros permitidos', () => {
    const u = buildUpstream(params('resource=games&search=zelda&genres=action&parent_platforms=2&dates=2023-01-01,2023-12-31&ordering=-metacritic&page=2'))
    expect(u.path).toBe('/games')
    expect(Object.fromEntries(u.params)).toMatchObject({
      search: 'zelda', genres: 'action', parent_platforms: '2', dates: '2023-01-01,2023-12-31', ordering: '-metacritic', page: '2', page_size: '20',
    })
  })

  it('ignora parámetros desconocidos (no es un proxy abierto)', () => {
    const u = buildUpstream(params('resource=games&key=robada&developers=1&url=http://evil'))
    expect([...u.params.keys()].sort()).toEqual(['page', 'page_size'])
  })

  it.each([
    'resource=users',
    'resource=../games',
    'resource=game&id=abc',
    'resource=game&id=1/../../users',
    'resource=games&ordering=-rating',
    'resource=games&page_size=500',
    'resource=games&page=0',
    'resource=games&dates=ayer',
    'resource=games&genres=a,b,c,d',
    `resource=games&search=${'x'.repeat(81)}`,
  ])('rechaza %s', (qs) => {
    expect(() => buildUpstream(params(qs))).toThrow()
  })
})

describe('handleRawgRequest', () => {
  it('sin clave responde 503 missing_key sin llamar a RAWG', async () => {
    const fetchImpl = vi.fn()
    const r = await handleRawgRequest(url('resource=genres'), { apiKey: '', fetchImpl })
    expect(r.status).toBe(503)
    expect(r.body.code).toBe('missing_key')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('agrega la clave solo hacia RAWG y recorta campos (sin la nota de usuarios de RAWG)', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      count: 1, next: null,
      results: [{ id: 1, slug: 'a', name: 'A', rating: 4.5, metacritic: 90, background_image: null, parent_platforms: [{ platform: { id: 1, name: 'PC', slug: 'pc' } }], genres: [] }],
    }), { status: 200 }))
    const r = await handleRawgRequest(url('resource=games&search=a-unique-test'), { apiKey: 'SECRETA', fetchImpl })
    const called = new URL(fetchImpl.mock.calls[0][0])
    expect(called.origin + called.pathname).toBe('https://api.rawg.io/api/games')
    expect(called.searchParams.get('key')).toBe('SECRETA')
    expect(r.status).toBe(200)
    expect(JSON.stringify(r.body)).not.toContain('SECRETA')
    expect(r.body.results[0]).not.toHaveProperty('rating')
    expect(r.body.results[0].metacritic).toBe(90)
    expect(r.headers['Cache-Control']).toContain('s-maxage=3600')
  })

  it('traduce errores de RAWG', async () => {
    const mk = (status) => vi.fn(async () => new Response('{}', { status }))
    expect((await handleRawgRequest(url('resource=game&id=999999'), { apiKey: 'k', fetchImpl: mk(404) })).body.code).toBe('not_found')
    expect((await handleRawgRequest(url('resource=game&id=999998'), { apiKey: 'k', fetchImpl: mk(401) })).body.code).toBe('bad_key')
    expect((await handleRawgRequest(url('resource=game&id=999997'), { apiKey: 'k', fetchImpl: mk(429) })).status).toBe(429)
  })
})
