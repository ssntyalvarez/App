import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate } from '../lib/format.js'
import { useHelpful, useProfile } from '../lib/hooks.js'
import { firestoreMessage } from '../lib/profiles.js'
import { formatHours, setHelpful } from '../lib/reviews.js'
import Avatar from './Avatar.jsx'
import { LevelChip } from './LevelBadge.jsx'

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
        <strong>{profile.displayName} <LevelChip uid={uid} /></strong>
        <span className="muted">@{profile.handle}</span>
      </span>
    </Link>
  )
}

// oxlint-disable-next-line react/only-export-components
export const helpfulText = (n) => (n === 1 ? 'A 1 persona le sirvió' : `A ${n} personas les sirvió`)

// “Me sirvió”, como en Steam: un voto por persona y reseña (no se puede votar la propia).
export function Helpful({ review, voters = [], currentUid }) {
  const notify = useToast()
  const queryClient = useQueryClient()
  const voted = Boolean(currentUid) && voters.includes(currentUid)
  const toggle = useMutation({
    mutationFn: (value) => setHelpful({ review, uid: currentUid, value }),
    // El cambio se ve al instante y se deshace si Firestore lo rechaza.
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: ['helpful'] })
      const previous = queryClient.getQueriesData({ queryKey: ['helpful'] })
      queryClient.setQueriesData({ queryKey: ['helpful'] }, (data) => {
        if (!data) return data
        const rest = (data[review.id] ?? []).filter((uid) => uid !== currentUid)
        return { ...data, [review.id]: value ? [...rest, currentUid] : rest }
      })
      return { previous }
    },
    onError: (err, _value, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
      notify(firestoreMessage(err, 'No se pudo guardar tu voto.'), 'error')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['helpful'] }),
  })

  const count = voters.length
  if (review.uid === currentUid) {
    return count ? <p className="helpful helpful--own muted">{helpfulText(count)}</p> : null
  }
  return (
    <p className="helpful">
      {currentUid ? (
        <button
          type="button"
          className={`helpful__btn ${voted ? 'is-on' : ''}`}
          aria-pressed={voted}
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(!voted)}
        >
          <ThumbIcon />
          Me sirvió
        </button>
      ) : (
        <Link to="/ingresar" className="helpful__btn">
          <ThumbIcon />
          Me sirvió
        </Link>
      )}
      {count > 0 && <span className="muted">{helpfulText(count)}</span>}
    </p>
  )
}

function ThumbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M8 10.5 11.5 4c1.4 0 2.3 1 2.3 2.4V9.5h4.4c1.2 0 2 1 1.8 2.2l-1 6c-.2 1-1 1.8-2 1.8H8m0-9v9m0-9H4.5v9H8"
      />
    </svg>
  )
}

// `votes` ({ [reviewId]: [uid] }) se puede pasar desde la página; si no, la lista los consulta.
export default function ReviewList({ reviews, currentUid, votes }) {
  const own = useHelpful(votes ? [] : reviews.map((r) => r.id))
  const helpful = votes ?? own.data ?? {}
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
          {r.playtimeHours != null && <p className="playtime">{formatHours(r.playtimeHours)}</p>}
          {r.text ? <p className="review__text">{r.text}</p> : <p className="review__text muted">Sin reseña escrita.</p>}
          <p className="review__date muted">
            {formatDate(r.updatedAt)}
            {wasEdited(r) && ' · editada'}
            {r.uid === currentUid && ' · tu opinión'}
          </p>
          <Helpful review={r} voters={helpful[r.id]} currentUid={currentUid} />
        </li>
      ))}
    </ol>
  )
}
