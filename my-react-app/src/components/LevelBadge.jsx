import { useId } from 'react'
import { useUserReviews } from '../lib/hooks.js'
import { DETAILED_LENGTH, XP_DETAILED_BONUS, XP_PER_REVIEW, levelFromReviews } from '../lib/levels.js'

const fmt = (n) => n.toLocaleString('es-AR')

// Nivel sobre el avatar del perfil: solo el número. El detalle (rango y XP) aparece al pasar el
// mouse o al enfocarlo con el teclado.
export function LevelMark({ level }) {
  const tipId = useId()
  return (
    <span className={`level-mark band--${level.band}`} tabIndex={0} aria-describedby={tipId}>
      <span className="level-mark__num">{level.level}</span>
      <span className="sr-only">Nivel {level.level}</span>
      <span id={tipId} role="tooltip" className="level-mark__tip">
        <strong>Nivel {level.level} · {level.title}</strong>
        <span className="level-mark__bar" aria-hidden="true">
          <span style={{ width: `${level.progress * 100}%` }} />
        </span>
        <span>{fmt(level.xp)} / {fmt(level.next)} XP</span>
      </span>
    </span>
  )
}

// Resumen del nivel propio dentro del menú “Mi cuenta”.
export function LevelSummary({ uid }) {
  const reviews = useUserReviews(uid)
  if (!reviews.data) return null
  const level = levelFromReviews(reviews.data)
  return (
    <div className={`level-summary band--${level.band}`}>
      <span className="level-summary__num" aria-hidden="true">{level.level}</span>
      <div>
        <p>
          <strong>Nivel {level.level}</strong> · {level.title}
        </p>
        <div
          className="level-summary__bar"
          role="progressbar"
          aria-label={`Progreso al nivel ${level.level + 1}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level.progress * 100)}
        >
          <span style={{ width: `${level.progress * 100}%` }} />
        </div>
        <p className="level-summary__xp">
          {fmt(level.xp)} XP · faltan {fmt(level.toNext)}
        </p>
        <p className="level-summary__how">
          +{XP_PER_REVIEW} XP por juego opinado (+{XP_DETAILED_BONUS} con {DETAILED_LENGTH}+ caracteres)
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

// Engranaje de configuración.
export function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        d="M10.3 3h3.4l.5 2.4c.6.2 1.1.5 1.6.9l2.3-.8 1.7 3-1.8 1.6a6.6 6.6 0 0 1 0 1.8l1.8 1.6-1.7 3-2.3-.8c-.5.4-1 .7-1.6.9l-.5 2.4h-3.4l-.5-2.4c-.6-.2-1.1-.5-1.6-.9l-2.3.8-1.7-3 1.8-1.6a6.6 6.6 0 0 1 0-1.8L4.2 8.5l1.7-3 2.3.8c.5-.4 1-.7 1.6-.9z"
      />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}
