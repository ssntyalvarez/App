import { Link } from 'react-router'
import { formatDate } from '../lib/format.js'
import { useProfile } from '../lib/hooks.js'
import Avatar from './Avatar.jsx'

function wasEdited(review) {
  const c = review.createdAt?.toMillis?.()
  const u = review.updatedAt?.toMillis?.()
  return c && u && u - c > 1000
}

function Author({ uid }) {
  const { data: profile, isLoading } = useProfile(uid)
  if (isLoading) return <span className="review__author muted">Cargando autor…</span>
  if (!profile) return <span className="review__author muted">Usuario sin perfil</span>
  return (
    <Link to={`/u/${profile.handle}`} className="review__author">
      <Avatar profile={profile} size={36} />
      <span>
        <strong>{profile.displayName}</strong>
        <span className="muted">@{profile.handle}</span>
      </span>
    </Link>
  )
}

export default function ReviewList({ reviews, currentUid }) {
  return (
    <ol className="review-list">
      {reviews.map((r) => (
        <li key={r.id} id={`resena-${r.uid}`} className={`review ${r.uid === currentUid ? 'review--own' : ''}`}>
          <div className="review__head">
            <Author uid={r.uid} />
            <div className="review__score" aria-label={`Puntuación: ${r.score} de 10`}>
              <span>{r.score}</span>
              <small>/10</small>
            </div>
          </div>
          {r.text ? <p className="review__text">{r.text}</p> : <p className="review__text muted">Solo puntuación.</p>}
          <p className="review__date muted">
            {formatDate(r.updatedAt)}
            {wasEdited(r) && ' · editada'}
            {r.uid === currentUid && ' · tu opinión'}
          </p>
        </li>
      ))}
    </ol>
  )
}
