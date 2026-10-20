import { Link } from 'react-router'
import GameCard, { PlatformList } from '../components/GameCard.jsx'
import GameImage from '../components/GameImage.jsx'
import ReviewList from '../components/ReviewList.jsx'
import { CommunityScore, MetacriticScore } from '../components/Scores.jsx'
import { CardSkeletons, EmptyState, ErrorState, FirebasePending, Spinner } from '../components/States.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { formatReleased, gamePath, rawgImage } from '../lib/format.js'
import { useCommunityStats, useDocumentTitle, useGames, useGenres, useRecentReviews } from '../lib/hooks.js'

const iso = (d) => d.toISOString().slice(0, 10)
const today = new Date()
const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
const LAST_YEAR = `${iso(yearAgo)},${iso(today)}`

function Featured({ game }) {
  const stats = useCommunityStats(game.id)
  const backdrop = rawgImage(game.image, 1280)
  return (
    <section className="featured" aria-labelledby="featured-title">
      {backdrop && <div className="featured__backdrop" style={{ backgroundImage: `url("${backdrop}")` }} aria-hidden="true" />}
      <div className="container featured__inner">
        <div className="featured__text">
          <p className="eyebrow">Destacado · popular en el último año</p>
          <h1 id="featured-title" className="featured__title">{game.name}</h1>
          <p className="featured__meta">
            <span>{formatReleased(game.released, game.tba)}</span>
            <PlatformList platforms={game.platforms} max={4} />
          </p>
          <div className="featured__scores">
            <MetacriticScore score={game.metacritic} size="md" />
            <CommunityScore stats={stats.data} loading={stats.isLoading} unavailable={!firebaseReady || stats.isError} size="md" />
          </div>
          <div className="row">
            <Link to={gamePath(game)} className="btn btn--primary btn--lg">Ver ficha</Link>
            <Link to="/juegos" className="btn btn--ghost btn--lg">Explorar catálogo</Link>
          </div>
        </div>
        <Link to={gamePath(game)} className="featured__media" tabIndex={-1} aria-hidden="true">
          <GameImage src={game.image} width={960} eager />
        </Link>
      </div>
    </section>
  )
}

function Rail({ title, subtitle, query, link }) {
  return (
    <section className="section container rail">
      <div className="section__head">
        <div>
          <h2 className="section__title">{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {link && <Link to={link} className="link-arrow">Ver todos</Link>}
      </div>
      {query.isPending && <CardSkeletons count={4} />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess &&
        (query.data.results.length ? (
          <div className="game-grid game-grid--rail">
            {query.data.results.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        ) : (
          <EmptyState title="Sin resultados por ahora" />
        ))}
    </section>
  )
}

function RecentReviews() {
  const { user } = useAuth()
  const recent = useRecentReviews()
  return (
    <section className="section container">
      <div className="section__head">
        <div>
          <h2 className="section__title">Opiniones recientes</h2>
          <p className="muted">Lo último que escribió la comunidad Checkpoint.</p>
        </div>
      </div>
      {!firebaseReady ? (
        <FirebasePending />
      ) : recent.isPending ? (
        <Spinner />
      ) : recent.isError ? (
        <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
      ) : recent.data.length === 0 ? (
        <EmptyState title="Todavía no hay opiniones" icon="flag">
          <p>Elegí un juego del catálogo y escribí la primera.</p>
        </EmptyState>
      ) : (
        <div className="recent-reviews">
          {recent.data.map((r) => (
            <div key={r.id} className="recent-review">
              <Link to={`${gamePath(r)}#resena-${r.uid}`} className="recent-review__game">
                <GameImage src={r.gameImage} width={420} label={false} />
                <span>{r.gameName}</span>
              </Link>
              <ReviewList reviews={[r]} currentUid={user?.uid} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function Home() {
  const popular = useGames({ ordering: '-added', dates: LAST_YEAR, pageSize: 9 })
  const topYear = useGames({ ordering: '-metacritic', dates: LAST_YEAR, pageSize: 8 })
  const classics = useGames({ ordering: '-metacritic', pageSize: 8 })
  const genres = useGenres()
  useDocumentTitle(null)

  const featured = popular.data?.results.find((g) => g.image) ?? popular.data?.results[0]
  const rest = popular.data ? { ...popular, data: { results: popular.data.results.filter((g) => g !== featured).slice(0, 8) } } : popular

  return (
    <div className="home">
      {popular.isPending && (
        <div className="featured featured--loading">
          <div className="container"><Spinner label="Cargando destacados…" /></div>
        </div>
      )}
      {popular.isError && (
        <div className="container page">
          <ErrorState error={popular.error} onRetry={() => popular.refetch()} />
        </div>
      )}
      {featured ? (
        <Featured game={featured} />
      ) : (
        <h1 className="sr-only">Checkpoint: descubrí, puntuá y compartí videojuegos</h1>
      )}

      {!popular.isError && (
        <>
          <Rail title="Populares del último año" subtitle="Los más agregados en RAWG durante los últimos 12 meses." query={rest} link="/juegos" />
          <Rail title="Mejor puntuados del último año" subtitle="Ordenados por Metacritic (vía RAWG)." query={topYear} link={`/juegos?orden=-metacritic&anio=${today.getFullYear()}`} />
          {genres.isSuccess && (
            <section className="section container">
              <h2 className="section__title">Explorá por género</h2>
              <ul className="genre-chips">
                {genres.data.results.slice(0, 14).map((g) => (
                  <li key={g.slug}>
                    <Link to={`/juegos?genero=${g.slug}`}>{g.name}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Rail title="Clásicos con mejor nota" subtitle="La nota más alta de Metacritic de todos los tiempos." query={classics} link="/juegos?orden=-metacritic" />
        </>
      )}
      <RecentReviews />
    </div>
  )
}
