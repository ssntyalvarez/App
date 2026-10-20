import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Avatar from '../components/Avatar.jsx'
import GameImage from '../components/GameImage.jsx'
import { EmptyState, ErrorState, FirebasePending, Spinner } from '../components/States.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { formatAverage, formatDate, formatMonth } from '../lib/format.js'
import { invalidateReviewData, useProfileByHandle, useUserReviews } from '../lib/hooks.js'
import { firestoreMessage } from '../lib/profiles.js'
import { deleteReview } from '../lib/reviews.js'

function OwnReviewActions({ review }) {
  const { user } = useAuth()
  const notify = useToast()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState(false)
  const remove = useMutation({
    mutationFn: () => deleteReview(review.gameId, user.uid),
    onSuccess: () => {
      notify('Opinión eliminada.')
      invalidateReviewData(queryClient, review.gameId, user.uid)
    },
    onError: (err) => notify(firestoreMessage(err, 'No se pudo eliminar.'), 'error'),
  })
  return (
    <div className="row">
      <Link className="btn btn--ghost btn--sm" to={`/juego/${review.gameId}${review.gameSlug ? `/${review.gameSlug}` : ''}#opiniones`}>
        Editar
      </Link>
      {confirm ? (
        <>
          <button type="button" className="btn btn--danger btn--sm" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? 'Eliminando…' : 'Confirmar'}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm(false)} disabled={remove.isPending}>
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirm(true)}>
          Eliminar
        </button>
      )}
    </div>
  )
}

export default function Profile() {
  const { handle } = useParams()
  const { user } = useAuth()
  const profileQ = useProfileByHandle(handle)
  const profile = profileQ.data
  const reviews = useUserReviews(profile?.uid)

  if (!firebaseReady) return <div className="page container"><FirebasePending /></div>
  if (profileQ.isPending) return <div className="page container"><Spinner label="Cargando perfil…" /></div>
  if (profileQ.isError) return <div className="page container"><ErrorState error={profileQ.error} onRetry={() => profileQ.refetch()} /></div>
  if (!profile) {
    return (
      <div className="page container">
        <EmptyState title="Este perfil no existe">
          <p>Revisá el alias o volvé al inicio.</p>
          <Link to="/" className="btn btn--primary">Ir al inicio</Link>
        </EmptyState>
      </div>
    )
  }

  const isOwner = user?.uid === profile.uid
  const list = reviews.data ?? []
  const avg = list.length ? list.reduce((s, r) => s + r.score, 0) / list.length : null

  return (
    <div className="page container profile">
      <header className="profile-head">
        <Avatar profile={profile} size={96} />
        <div>
          <h1>{profile.displayName}</h1>
          <p className="muted">@{profile.handle} · En Checkpoint desde {formatMonth(profile.createdAt)}</p>
        </div>
        {isOwner && <Link to="/ajustes/perfil" className="btn btn--ghost">Editar perfil</Link>}
      </header>

      <dl className="stats">
        <div><dt>Reseñas</dt><dd>{list.length}</dd></div>
        <div><dt>Promedio de sus notas</dt><dd>{formatAverage(avg)}</dd></div>
      </dl>

      <section className="section">
        <h2 className="section__title">{isOwner ? 'Tus opiniones' : 'Opiniones'}</h2>
        {reviews.isPending ? (
          <Spinner />
        ) : reviews.isError ? (
          <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState title="Todavía no hay opiniones" icon="flag">
            {isOwner && <p>Buscá un juego en el catálogo y dejá tu primera opinión.</p>}
          </EmptyState>
        ) : (
          <ul className="profile-reviews">
            {list.map((r) => (
              <li key={r.id} className="profile-review">
                <Link to={`/juego/${r.gameId}${r.gameSlug ? `/${r.gameSlug}` : ''}`} className="profile-review__media">
                  <GameImage src={r.gameImage} width={420} label={false} alt="" />
                </Link>
                <div className="profile-review__body">
                  <div className="profile-review__head">
                    <h3>
                      <Link to={`/juego/${r.gameId}${r.gameSlug ? `/${r.gameSlug}` : ''}`}>{r.gameName}</Link>
                    </h3>
                    <span className="review__score"><span>{r.score}</span><small>/10</small></span>
                  </div>
                  {r.text ? <p>{r.text}</p> : <p className="muted">Solo puntuación.</p>}
                  <p className="muted fine-print">{formatDate(r.updatedAt)}</p>
                  {isOwner && <OwnReviewActions review={r} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
