import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { PlatformList } from '../components/GameCard.jsx'
import Gallery from '../components/Gallery.jsx'
import LibraryControl from '../components/LibraryControl.jsx'
import GameImage from '../components/GameImage.jsx'
import ReviewForm from '../components/ReviewForm.jsx'
import ReviewList from '../components/ReviewList.jsx'
import { CommunityScore, MetacriticScore, PersonalScore } from '../components/Scores.jsx'
import { EmptyState, ErrorState, FirebasePending, Spinner } from '../components/States.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { formatReleased, rawgImage } from '../lib/format.js'
import { useDocumentTitle, useGame, useGameReviews, useScreenshots } from '../lib/hooks.js'
import { statsFromReviews } from '../lib/reviews.js'

function Distribution({ reviews }) {
  const counts = Array.from({ length: 11 }, (_, n) => reviews.filter((r) => r.score === n).length)
  const max = Math.max(...counts, 1)
  return (
    <div className="distribution" aria-label="Distribución de puntuaciones de la comunidad">
      {counts.map((c, n) => (
        <div key={n} className="distribution__col" title={`${n}: ${c} ${c === 1 ? 'voto' : 'votos'}`}>
          <span className="distribution__bar" style={{ '--h': `${(c / max) * 100}%` }} />
          <span className="distribution__n">{n}</span>
        </div>
      ))}
    </div>
  )
}

function Description({ text }) {
  const [open, setOpen] = useState(false)
  if (!text) return <p className="muted">RAWG no tiene una descripción para este juego.</p>
  const long = text.length > 700
  return (
    <div className={`description ${long && !open ? 'is-clamped' : ''}`}>
      {text.split(/\n+/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {long && (
        <button type="button" className="link-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Ver menos' : 'Leer descripción completa'}
        </button>
      )}
    </div>
  )
}

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function Facts({ game }) {
  const rows = [
    ['Lanzamiento', formatReleased(game.released, game.tba)],
    ['Plataformas', game.allPlatforms?.length ? game.allPlatforms.map((p) => p.name).join(', ') : null],
    ['Géneros', game.genres?.map((g) => g.name).join(', ')],
    ['Desarrollo', game.developers?.map((d) => d.name).join(', ')],
    ['Edición', game.publishers?.map((d) => d.name).join(', ')],
    ['Clasificación ESRB', game.esrb],
  ]
  return (
    <dl className="facts">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v || <span className="muted">Sin datos</span>}</dd>
        </div>
      ))}
      {game.website && (
        <div>
          <dt>Sitio oficial</dt>
          <dd>
            <a href={game.website} target="_blank" rel="noopener noreferrer">
              {hostname(game.website)}
            </a>
          </dd>
        </div>
      )}
    </dl>
  )
}

export default function GameDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const validId = /^\d{1,9}$/.test(id ?? '')
  const game = useGame(validId ? id : null)
  const shots = useScreenshots(validId ? id : null)
  const reviews = useGameReviews(validId ? id : null)
  useDocumentTitle(game.data?.name ?? (game.isError ? 'Juego no disponible' : 'Juego'))

  if (!validId || game.error?.code === 'not_found') {
    return (
      <div className="page container">
        <EmptyState title="No encontramos ese juego">
          <p>Puede que el enlace sea incorrecto.</p>
          <Link className="btn btn--primary" to="/juegos">Ir al catálogo</Link>
        </EmptyState>
      </div>
    )
  }
  if (game.isPending) {
    return (
      <div className="page container">
        <Spinner label="Cargando ficha…" />
      </div>
    )
  }
  if (game.isError) {
    return (
      <div className="page container">
        <ErrorState error={game.error} onRetry={() => game.refetch()} backHome />
      </div>
    )
  }

  const g = game.data
  const list = reviews.data ?? []
  const stats = statsFromReviews(list)
  const mine = user ? list.find((r) => r.uid === user.uid) : undefined
  // La opinión propia se muestra en su tarjeta editable; la lista muestra las demás.
  const others = mine ? list.filter((r) => r !== mine) : list
  const mcPlatforms = g.metacriticPlatforms ?? []
  const mainPlatform = mcPlatforms.length === 1 ? mcPlatforms[0].platform?.name : null
  const backdrop = rawgImage(g.image, 1280)

  return (
    <article className="game-page">
      <header className="game-hero">
        {backdrop && <div className="game-hero__backdrop" style={{ backgroundImage: `url("${backdrop}")` }} aria-hidden="true" />}
        <div className="container game-hero__inner">
          <nav className="breadcrumb" aria-label="Ruta">
            <Link to="/juegos">Catálogo</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{g.name}</span>
          </nav>
          <div className="game-hero__grid">
            <div className="game-hero__text">
              {g.genres?.length > 0 && (
                <ul className="tags">
                  {g.genres.map((x) => (
                    <li key={x.slug}>
                      <Link to={`/juegos?genero=${x.slug}`}>{x.name}</Link>
                    </li>
                  ))}
                </ul>
              )}
              <h1 className="game-hero__title">{g.name}</h1>
              {g.nameOriginal && g.nameOriginal !== g.name && <p className="muted">{g.nameOriginal}</p>}
              <p className="game-hero__meta">
                <span>{formatReleased(g.released, g.tba)}</span>
                <PlatformList platforms={g.platforms} max={6} />
              </p>
            </div>
            <div className="game-hero__media">
              <GameImage src={g.image} width={960} alt={`Imagen de ${g.name}`} eager />
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="score-panel" aria-label="Puntuaciones">
          <div className="score-panel__item">
            <h2 className="score-panel__title">Metacritic <span>vía RAWG</span></h2>
            <MetacriticScore score={g.metacritic} platform={mainPlatform} size="lg" showLabel={false} />
            {g.metacritic == null ? (
              <p className="muted">RAWG no informa una puntuación de Metacritic para este juego.</p>
            ) : mcPlatforms.length > 1 ? (
              <ul className="mc-platforms" aria-label="Nota de Metacritic por plataforma">
                <li className="mc-platforms__head">
                  <span>Nota general · por plataforma</span>
                </li>
                {mcPlatforms.map((m) => (
                  <li key={m.platform?.slug ?? m.score}>
                    <span>{m.platform?.name ?? 'Plataforma sin datos'}</span>
                    <strong>{m.score}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{mainPlatform ? `Puntuación para ${mainPlatform}.` : 'Plataforma no informada.'}</p>
            )}
            <p className="fine-print">
              Escala 0–100. Puede diferir de Metacritic según la plataforma o por actualizaciones.
              {g.metacriticUrl && (
                <>
                  {' '}
                  <a href={g.metacriticUrl} target="_blank" rel="noopener noreferrer">Ver en Metacritic</a>
                </>
              )}
            </p>
          </div>

          <div className="score-panel__item">
            <h2 className="score-panel__title">Comunidad <span>Checkpoint</span></h2>
            <CommunityScore
              stats={stats}
              loading={reviews.isLoading}
              unavailable={!firebaseReady || reviews.isError}
              size="lg"
              showLabel={false}
            />
            {firebaseReady && reviews.isSuccess && (
              <>
                <p className="muted">
                  {stats.votes
                    ? `${stats.votes} ${stats.votes === 1 ? 'voto' : 'votos'} de usuarios de Checkpoint`
                    : 'Todavía nadie lo puntuó. Escribí la primera opinión.'}
                </p>
                {stats.votes > 0 && <Distribution reviews={list} />}
              </>
            )}
            {!firebaseReady && <p className="muted">Pendiente de conexión con Firebase.</p>}
          </div>

          <div className="score-panel__item">
            <h2 className="score-panel__title">Tu nota <span>personal</span></h2>
            {user ? (
              <>
                <PersonalScore score={mine?.score ?? null} size="lg" showLabel={false} />
                <p className="muted">
                  {mine ? 'Es la misma nota de tu reseña y de tu perfil.' : (
                    <>
                      Todavía no lo puntuaste. <a href="#opiniones">Puntualo en Opiniones</a>.
                    </>
                  )}
                </p>
              </>
            ) : (
              <p className="muted">Iniciá sesión para puntuar este juego.</p>
            )}
          </div>
        </section>

        <div className="game-layout">
          <div className="game-layout__main">
            <section className="section">
              <h2 className="section__title">Acerca del juego</h2>
              <p className="fine-print">Descripción provista por RAWG en su idioma original.</p>
              <Description text={g.description} />
            </section>

            <section className="section">
              <h2 className="section__title">Capturas</h2>
              {shots.isPending && <Spinner label="Cargando capturas…" />}
              {shots.isError && <p className="muted">No se pudieron cargar las capturas.</p>}
              {shots.isSuccess &&
                (shots.data.results.length ? (
                  <Gallery images={shots.data.results} title={g.name} />
                ) : (
                  <p className="muted">RAWG no tiene capturas para este juego.</p>
                ))}
            </section>
          </div>
          <aside className="game-layout__side">
            {firebaseReady && <LibraryControl game={g} />}
            <section className="panel">
              <h2 className="panel__title">Ficha</h2>
              <Facts game={g} />
            </section>
          </aside>
        </div>

        <section className="section reviews" id="opiniones" aria-labelledby="opiniones-title">
          <div className="section__head">
            <h2 id="opiniones-title" className="section__title">Opiniones</h2>
            {stats.votes > 0 && <span className="pill">{stats.votes}</span>}
          </div>
          {!firebaseReady ? (
            <FirebasePending />
          ) : reviews.isPending ? (
            <Spinner label="Cargando opiniones…" />
          ) : reviews.isError ? (
            <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} title="No pudimos cargar las opiniones" />
          ) : (
            <div className="reviews__grid">
              <div className="reviews__form">
                <ReviewForm key={mine ? `${mine.id}-${mine.updatedAt?.toMillis?.()}` : 'new'} game={g} existing={mine} />
              </div>
              <div className="reviews__list">
                {others.length ? (
                  <ReviewList reviews={others} currentUid={user?.uid} />
                ) : mine ? (
                  <EmptyState title="Por ahora, la única opinión es la tuya" icon="flag">
                    <p>Cuando otras personas opinen, sus reseñas aparecerán acá.</p>
                  </EmptyState>
                ) : (
                  <EmptyState title="Todavía no hay opiniones" icon="flag">
                    <p>Escribí la primera y ayudá a otros a decidir.</p>
                  </EmptyState>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </article>
  )
}
