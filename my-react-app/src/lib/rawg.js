// Cliente del proxy /api/rawg. Nunca llama a RAWG directamente ni conoce la clave.

export class RawgError extends Error {
  constructor(message, code, status) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function request(params) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  let res
  try {
    res = await fetch(`/api/rawg?${qs}`)
  } catch {
    throw new RawgError('No hay conexión con el servidor.', 'network', 0)
  }
  let body = null
  try {
    body = await res.json()
  } catch {
    // respuesta sin JSON (p. ej. la función no existe en este entorno)
  }
  if (!res.ok || !body) {
    throw new RawgError(
      body?.error || 'El catálogo no está disponible en este momento.',
      body?.code || 'unavailable',
      res.status,
    )
  }
  return body
}

export const ORDER_OPTIONS = [
  { value: '', label: 'Relevancia' },
  { value: '-metacritic', label: 'Puntuación Metacritic' },
  { value: '-released', label: 'Lanzamiento: más recientes' },
  { value: 'released', label: 'Lanzamiento: más antiguos' },
]

export function yearRange(year) {
  return year ? `${year}-01-01,${year}-12-31` : undefined
}

export const fetchGames = ({ search, genre, platform, year, ordering, page = 1, pageSize = 20, dates, metacritic }) =>
  request({
    resource: 'games',
    search,
    genres: genre,
    parent_platforms: platform,
    dates: dates || yearRange(year),
    // Al ordenar por Metacritic se excluyen los juegos sin puntuación.
    metacritic: metacritic || (ordering === '-metacritic' ? '1,100' : undefined),
    ordering,
    page,
    page_size: pageSize,
  })

export const fetchGame = (id) => request({ resource: 'game', id })
export const fetchScreenshots = (id) => request({ resource: 'screenshots', id })
export const fetchGenres = () => request({ resource: 'genres' })
export const fetchPlatforms = () => request({ resource: 'platforms' })
