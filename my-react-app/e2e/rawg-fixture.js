// Doble de prueba de /api/rawg. Juegos FICTICIOS, solo para pruebas automáticas:
// no representan datos reales de RAWG ni de Metacritic.
const GENRES = [
  { id: 4, name: 'Action', slug: 'action' },
  { id: 5, name: 'RPG', slug: 'role-playing-games-rpg' },
  { id: 7, name: 'Puzzle', slug: 'puzzle' },
]
const PLATFORMS = [
  { id: 1, name: 'PC', slug: 'pc' },
  { id: 2, name: 'PlayStation', slug: 'playstation' },
  { id: 7, name: 'Nintendo', slug: 'nintendo' },
]
const NAMES = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Eco', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Julieta', 'Kilo', 'Lima', 'Mike']

const recent = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10)

export const GAMES = Array.from({ length: 26 }, (_, i) => {
  const n = i + 1
  return {
    id: 900000 + n,
    slug: `juego-de-prueba-${n}`,
    name: `Juego de prueba ${NAMES[i % NAMES.length]} ${n}`,
    // Los juegos 5 a 8 son “recientes” (relativos a hoy) para poblar las secciones del inicio.
    released: n >= 5 && n <= 8 ? recent(n * 20) : `${2015 + (i % 10)}-0${(i % 9) + 1}-15`,
    tba: false,
    // Algunos sin imagen y sin puntuación para probar los estados vacíos.
    image: n % 7 === 0 ? null : `https://media.rawg.io/media/games/test/prueba-${n}.jpg`,
    metacritic: n % 5 === 0 ? null : 60 + ((n * 7) % 40),
    platforms: [PLATFORMS[i % 3], ...(n % 2 ? [PLATFORMS[(i + 1) % 3]] : [])],
    genres: [GENRES[i % 3]],
  }
})

function detail(g) {
  return {
    ...g,
    nameOriginal: g.name,
    description: `Descripción ficticia de ${g.name} para pruebas automáticas.\n\nSegundo párrafo de prueba.`,
    imageAdditional: null,
    website: null,
    metacriticUrl: null,
    metacriticPlatforms: g.metacritic == null ? [] : [{ score: g.metacritic, url: null, platform: { name: g.platforms[0].name, slug: g.platforms[0].slug } }],
    allPlatforms: g.platforms,
    developers: [{ id: 1, name: 'Estudio de prueba', slug: 'estudio' }],
    publishers: [],
    esrb: null,
    playtime: null,
  }
}

const svg = (label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#2b3a1a"/><stop offset="1" stop-color="#1b1c1f"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="32" y="320" font-family="monospace" font-size="22" fill="#c8f04a">IMAGEN DE PRUEBA · ${label}</text></svg>`

export async function mockRawg(page, { onRequest } = {}) {
  await page.route('https://media.rawg.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: svg(route.request().url().split('/').pop()) }),
  )
  await page.route('**/api/rawg?**', (route) => {
    const p = new URL(route.request().url()).searchParams
    onRequest?.(p)
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    switch (p.get('resource')) {
      case 'genres':
        return json({ results: GENRES })
      case 'platforms':
        return json({ results: PLATFORMS })
      case 'screenshots':
        return json({ results: [1, 2, 3].map((k) => ({ id: k, image: `https://media.rawg.io/media/screenshots/test/s${k}.jpg`, width: 1280, height: 720 })) })
      case 'game': {
        const g = GAMES.find((x) => String(x.id) === p.get('id'))
        return g ? json(detail(g)) : json({ error: 'Juego no encontrado.', code: 'not_found' }, 404)
      }
      case 'games': {
        let list = [...GAMES]
        const search = p.get('search')?.toLowerCase()
        if (search) list = list.filter((g) => g.name.toLowerCase().includes(search))
        if (p.get('genres')) list = list.filter((g) => g.genres.some((x) => x.slug === p.get('genres')))
        if (p.get('parent_platforms')) list = list.filter((g) => g.platforms.some((x) => String(x.id) === p.get('parent_platforms')))
        if (p.get('dates')) {
          const [from, to] = p.get('dates').split(',')
          list = list.filter((g) => g.released >= from && g.released <= to)
        }
        if (p.get('metacritic')) list = list.filter((g) => g.metacritic != null)
        const ord = p.get('ordering')
        if (ord === '-metacritic') list.sort((a, b) => b.metacritic - a.metacritic)
        if (ord === '-released') list.sort((a, b) => b.released.localeCompare(a.released))
        if (ord === 'released') list.sort((a, b) => a.released.localeCompare(b.released))
        const page = Number(p.get('page') || 1)
        const size = Number(p.get('page_size') || 20)
        const results = list.slice((page - 1) * size, page * size)
        return json({ count: list.length, hasNext: page * size < list.length, results })
      }
      default:
        return json({ error: 'Recurso no disponible', code: 'unknown_resource' }, 404)
    }
  })
}
