import { useUserReviews } from '../lib/hooks.js'
import { DETAILED_LENGTH, XP_DETAILED_BONUS, XP_PER_REVIEW, levelFromReviews } from '../lib/levels.js'

export default function LevelBadge({ level, isOwner }) {
  return (
    <div className={`level band--${level.band}`} title={`${level.xp.toLocaleString('es-AR')} XP`}>
      <span className="level__num" aria-hidden="true">{level.level}</span>
      <div className="level__body">
        <p className="level__title">
          <strong>Nivel {level.level}</strong> · {level.title}
        </p>
        <div
          className="level__bar"
          role="progressbar"
          aria-label={`Progreso al nivel ${level.level + 1}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level.progress * 100)}
        >
          <span style={{ width: `${level.progress * 100}%` }} />
        </div>
        <p className="level__hint">
          {level.xp.toLocaleString('es-AR')} XP · faltan {level.toNext.toLocaleString('es-AR')} para el nivel {level.level + 1}
          {isOwner && (
            <span className="level__how">
              {' '}· +{XP_PER_REVIEW} XP por cada juego que opinás (+{XP_DETAILED_BONUS} si la reseña tiene {DETAILED_LENGTH} caracteres o más)
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

// Insignia chica para listas (reseñas, amigos, chat).
export function LevelChip({ uid }) {
  const reviews = useUserReviews(uid)
  if (!reviews.data) return null
  const level = levelFromReviews(reviews.data)
  return (
    <span className={`level-chip band--${level.band}`} title={`Nivel ${level.level} · ${level.title}`}>
      <span aria-hidden="true">{level.level}</span>
      <span className="sr-only">Nivel {level.level}, {level.title}</span>
    </span>
  )
}
