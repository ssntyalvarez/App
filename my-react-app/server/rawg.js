// Lógica del proxy de RAWG. Se usa desde la función de Vercel (api/rawg.js)
// y desde el middleware de desarrollo de Vite. La clave nunca sale del servidor.

const RAWG_BASE = 'https://api.rawg.io/api'

const ORDERINGS = new Set(['-metacritic', '-released', 'released', '-added', 'name'])
const SLUG = /^[a-z0-9-]{1,60}$/
const ID = /^[0-9]{1,9}$/
const DATES = /^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/
const METACRITIC = /^\d{1,3},\d{1,3}$/

// Caché en memoria de la instancia (se pierde en arranques en frío; el CDN de
// Vercel hace la caché principal mediante Cache-Control).
const memoryCache = new Map()
const MEMORY_TTL = 10 * 60 * 1000
const MEMORY_MAX = 200

export class ProxyError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

function pickInt(value, { min, max, fallback }) {
  if (value == null || value === '') return fallback
  if (!/^\d+$/.test(value)) throw new ProxyError(400, 'bad_param', 'Parámetro numérico inválido')
  const n = Number(value)
  if (n < min || n > max) throw new ProxyError(400, 'bad_param', 'Parámetro fuera de rango')
  return n
}

function listParam(value, pattern, maxItems) {
  if (!value) return null
  const items = value.split(',')
  if (items.length > maxItems || !items.every((v) => pattern.test(v))) {
    throw new ProxyError(400, 'bad_param', 'Lista de filtros inválida')
  }
  return items.join(',')
}

// Traduce la consulta del cliente a una ruta de RAWG permitida.
// Devuelve { path, params, maxAge } o lanza ProxyError.
export function buildUpstream(searchParams) {
  const resource = searchParams.get('resource')
  const params = new URLSearchParams()

  switch (resource) {
    case 'games': {
      const search = searchParams.get('search')?.trim()
      if (search) {
        if (search.length > 80) throw new ProxyError(400, 'bad_param', 'Búsqueda demasiado larga')
        params.set('search', search)
        params.set('search_precise', 'true')
      }
      const genres = listParam(searchParams.get('genres'), SLUG, 3)
      if (genres) params.set('genres', genres)
      const platforms = listParam(searchParams.get('parent_platforms'), ID, 3)
      if (platforms) params.set('parent_platforms', platforms)
      const dates = searchParams.get('dates')
      if (dates) {
        if (!DATES.test(dates)) throw new ProxyError(400, 'bad_param', 'Rango de fechas inválido')
        params.set('dates', dates)
      }
      const metacritic = searchParams.get('metacritic')
      if (metacritic) {
        if (!METACRITIC.test(metacritic)) throw new ProxyError(400, 'bad_param', 'Rango de Metacritic inválido')
        params.set('metacritic', metacritic)
      }
      const ordering = searchParams.get('ordering')
      if (ordering) {
        if (!ORDERINGS.has(ordering)) throw new ProxyError(400, 'bad_param', 'Orden no permitido')
        params.set('ordering', ordering)
      }
      params.set('page', String(pickInt(searchParams.get('page'), { min: 1, max: 250, fallback: 1 })))
      params.set('page_size', String(pickInt(searchParams.get('page_size'), { min: 1, max: 40, fallback: 20 })))
      return { path: '/games', params, maxAge: 3600, shape: shapeGameList }
    }
    case 'game': {
      const id = searchParams.get('id')
      if (!id || !ID.test(id)) throw new ProxyError(400, 'bad_param', 'Identificador inválido')
      return { path: `/games/${id}`, params, maxAge: 21600, shape: shapeGameDetail }
    }
    case 'screenshots': {
      const id = searchParams.get('id')
      if (!id || !ID.test(id)) throw new ProxyError(400, 'bad_param', 'Identificador inválido')
      params.set('page_size', '12')
      return { path: `/games/${id}/screenshots`, params, maxAge: 86400, shape: shapeScreenshots }
    }
    case 'genres':
      params.set('page_size', '40')
      return { path: '/genres', params, maxAge: 86400, shape: shapeNamedList }
    case 'platforms':
      return { path: '/platforms/lists/parents', params, maxAge: 86400, shape: shapeNamedList }
    default:
      throw new ProxyError(404, 'unknown_resource', 'Recurso no disponible')
  }
}

const named = (x) => (x ? { id: x.id, name: x.name, slug: x.slug } : null)

// Solo se devuelven los campos que usa la interfaz. La nota de usuarios de RAWG
// (rating) se descarta a propósito para no confundirla con la comunidad Checkpoint.
function shapeGame(g) {
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    released: g.released ?? null,
    tba: Boolean(g.tba),
    image: g.background_image ?? null,
    metacritic: typeof g.metacritic === 'number' ? g.metacritic : null,
    platforms: (g.parent_platforms ?? []).map((p) => named(p.platform)).filter(Boolean),
    genres: (g.genres ?? []).map(named).filter(Boolean),
  }
}

function shapeGameList(data) {
  return {
    count: data.count ?? 0,
    hasNext: Boolean(data.next),
    results: (data.results ?? []).map(shapeGame),
  }
}

function shapeGameDetail(g) {
  return {
    ...shapeGame(g),
    nameOriginal: g.name_original ?? null,
    description: g.description_raw ?? '',
    imageAdditional: g.background_image_additional ?? null,
    website: g.website || null,
    metacriticUrl: g.metacritic_url || null,
    metacriticPlatforms: (g.metacritic_platforms ?? [])
      .filter((m) => typeof m.metascore === 'number')
      .map((m) => ({
        score: m.metascore,
        url: m.url || null,
        platform: m.platform ? { name: m.platform.name, slug: m.platform.slug } : null,
      })),
    allPlatforms: (g.platforms ?? []).map((p) => named(p.platform)).filter(Boolean),
    developers: (g.developers ?? []).map(named).filter(Boolean),
    publishers: (g.publishers ?? []).map(named).filter(Boolean),
    esrb: g.esrb_rating?.name ?? null,
    playtime: g.playtime || null,
  }
}

function shapeScreenshots(data) {
  return {
    results: (data.results ?? [])
      .filter((s) => !s.is_deleted)
      .map((s) => ({ id: s.id, image: s.image, width: s.width, height: s.height })),
  }
}

function shapeNamedList(data) {
  return { results: (data.results ?? []).map(named).filter(Boolean) }
}

// Ejecuta la consulta. Devuelve { status, body, headers }.
export async function handleRawgRequest(url, { apiKey, fetchImpl = fetch } = {}) {
  const json = (status, body, maxAge = 0) => ({
    status,
    body,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': maxAge
        ? `public, max-age=300, s-maxage=${maxAge}, stale-while-revalidate=86400`
        : 'no-store',
    },
  })

  let upstream
  try {
    upstream = buildUpstream(new URL(url).searchParams)
  } catch (err) {
    if (err instanceof ProxyError) return json(err.status, { error: err.message, code: err.code })
    throw err
  }

  if (!apiKey) {
    return json(503, {
      error: 'La clave de RAWG no está configurada en el servidor (RAWG_API_KEY).',
      code: 'missing_key',
    })
  }

  const cacheKey = `${upstream.path}?${upstream.params}`
  const cached = memoryCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return json(200, cached.body, upstream.maxAge)

  const target = new URL(RAWG_BASE + upstream.path)
  upstream.params.forEach((v, k) => target.searchParams.set(k, v))
  target.searchParams.set('key', apiKey)

  let res
  try {
    res = await fetchImpl(target, { headers: { Accept: 'application/json' } })
  } catch {
    return json(502, { error: 'No se pudo contactar a RAWG.', code: 'upstream_unreachable' })
  }
  if (res.status === 404) return json(404, { error: 'Juego no encontrado.', code: 'not_found' }, 600)
  if (res.status === 401 || res.status === 403) {
    return json(502, { error: 'RAWG rechazó la clave configurada.', code: 'bad_key' })
  }
  if (res.status === 429) return json(429, { error: 'Se alcanzó el límite de consultas de RAWG.', code: 'rate_limited' })
  if (!res.ok) return json(502, { error: 'RAWG respondió con un error.', code: 'upstream_error' })

  const body = upstream.shape(await res.json())
  if (memoryCache.size >= MEMORY_MAX) memoryCache.delete(memoryCache.keys().next().value)
  memoryCache.set(cacheKey, { body, expires: Date.now() + MEMORY_TTL })
  return json(200, body, upstream.maxAge)
}
