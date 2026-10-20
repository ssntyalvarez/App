import { Link } from 'react-router'
import { firebaseReady } from '../lib/firebase.js'
import { releaseYear } from '../lib/format.js'
import { useCommunityStats } from '../lib/hooks.js'
import GameImage from './GameImage.jsx'
import { CommunityScore, MetacriticScore } from './Scores.jsx'

export function gamePath(game) {
  return `/juego/${game.id}${game.slug ? `/${game.slug}` : ''}`
}

export function PlatformList({ platforms = [], max = 3 }) {
  if (!platforms.length) return <span className="muted">Plataformas sin datos</span>
  const shown = platforms.slice(0, max)
  const rest = platforms.length - shown.length
  return (
    <span className="platforms">
      {shown.map((p) => p.name).join(' · ')}
      {rest > 0 && <span className="platforms__more"> +{rest}</span>}
    </span>
  )
}

export default function GameCard({ game, eager = false }) {
  const stats = useCommunityStats(game.id)
  const year = game.tba ? 'Por anunciar' : releaseYear(game.released) || 'Sin fecha'

  return (
    <article className="game-card">
      <Link to={gamePath(game)} className="game-card__link">
        <div className="game-card__media">
          <GameImage src={game.image} width={640} eager={eager} />
          {game.genres?.[0] && <span className="game-card__tag">{game.genres[0].name}</span>}
        </div>
        <div className="game-card__body">
          <h3 className="game-card__title">{game.name}</h3>
          <p className="game-card__meta">
            <span>{year}</span>
            <PlatformList platforms={game.platforms} />
          </p>
          <div className="game-card__scores">
            <MetacriticScore score={game.metacritic} size="sm" />
            <CommunityScore
              stats={stats.data}
              loading={stats.isLoading}
              unavailable={!firebaseReady || stats.isError}
              size="sm"
            />
          </div>
        </div>
      </Link>
    </article>
  )
}
