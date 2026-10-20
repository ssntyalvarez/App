import { formatAverage, plural } from '../lib/format.js'

const tier = (score, max) => {
  const pct = score / max
  if (pct >= 0.75) return 'high'
  if (pct >= 0.5) return 'mid'
  return 'low'
}

// Puntuación externa: Metacritic (0–100) obtenida a través de RAWG.
export function MetacriticScore({ score, platform, size = 'md', showLabel = true }) {
  if (score == null) {
    return (
      <div className={`score score--mc score--${size} is-empty`}>
        <span className="score__value" aria-hidden="true">–</span>
        {showLabel && (
          <span className="score__label">
            <strong>Metacritic</strong>
            <span>Sin nota</span>
          </span>
        )}
        {!showLabel && <span className="sr-only">Metacritic: sin puntuación</span>}
      </div>
    )
  }
  return (
    <div className={`score score--mc score--${size}`} data-tier={tier(score, 100)}>
      <span className="score__value">
        {score}
        <span className="sr-only"> de 100 en Metacritic{platform ? ` (${platform})` : ''}</span>
      </span>
      {showLabel && (
        <span className="score__label" aria-hidden="true">
          <strong>Metacritic</strong>
          <span>{platform ? `${platform} · vía RAWG` : 'vía RAWG'}</span>
        </span>
      )}
    </div>
  )
}

// Promedio de la comunidad Checkpoint (0–10) con su cantidad de votos.
export function CommunityScore({ stats, loading, size = 'md', showLabel = true, unavailable = false }) {
  let value = '–'
  let detail = 'Sin votos'
  let dataTier
  if (unavailable) detail = 'Sin conexión'
  else if (loading) detail = 'Cargando…'
  else if (stats && stats.votes > 0) {
    value = formatAverage(stats.avg)
    detail = plural(stats.votes, 'voto', 'votos')
    dataTier = tier(stats.avg, 10)
  }
  const empty = value === '–'
  return (
    <div className={`score score--community score--${size} ${empty ? 'is-empty' : ''}`} data-tier={dataTier}>
      <span className="score__value">
        <span aria-hidden="true">{value}</span>
        <span className="sr-only">
          {empty ? `Comunidad Checkpoint: ${detail}` : `Comunidad Checkpoint: ${value} de 10, ${detail}`}
        </span>
      </span>
      {showLabel && (
        <span className="score__label" aria-hidden="true">
          <strong>Comunidad</strong>
          <span>{detail}</span>
        </span>
      )}
    </div>
  )
}

// Puntuación personal de un usuario (0–10) o “Sin puntuar”.
export function PersonalScore({ score, label = 'Su nota', size = 'sm', showLabel = true }) {
  const empty = score == null
  return (
    <div className={`score score--personal score--${size} ${empty ? 'is-empty' : ''}`}>
      <span className="score__value">
        {empty ? (
          <span>Sin puntuar</span>
        ) : (
          <>
            {score}
            <small>/10</small>
            {!showLabel && <span className="sr-only"> (tu nota personal)</span>}
          </>
        )}
      </span>
      {showLabel && (
        <span className="score__label">
          <strong>{label}</strong>
        </span>
      )}
    </div>
  )
}
