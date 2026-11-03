import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Avatar from '../components/Avatar.jsx'
import EntryEditor from '../components/EntryEditor.jsx'
import GameImage from '../components/GameImage.jsx'
import { PersonalScore } from '../components/Scores.jsx'
import { EmptyState, ErrorState, FirebasePending, Spinner } from '../components/States.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { formatAverage, formatDate, formatMonth, gamePath, rawgImage } from '../lib/format.js'
import { invalidateReviewData, useDocumentTitle, useLibrary, useProfileByHandle, useUserReviews } from '../lib/hooks.js'
import { MAX_FEATURED, STATUSES, statusLabel } from '../lib/library.js'
import { useLibraryActions } from '../lib/libraryActions.js'
import { firestoreMessage } from '../lib/profiles.js'
import { deleteReview } from '../lib/reviews.js'

const FILTERS = [{ value: 'all', label: 'Todos' }, ...STATUSES, { value: 'favorites', label: 'Favoritos' }]

function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${status}`}>{statusLabel(status)}</span>
}

function ShareButton({ profile }) {
  const notify = useToast()
  const share = async () => {
    const url = `${window.location.origin}/u/${profile.handle}`
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: `${profile.displayName} en Checkpoint`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      notify('Enlace del perfil copiado.')
    } catch (err) {
      if (err?.name !== 'AbortError') notify(`No se pudo copiar. Enlace: ${url}`, 'error')
    }
  }
  return (
    <button type="button" className="btn btn--ghost" onClick={share}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Compartir perfil
    </button>
  )
}

function LibraryCard({ entry, review, owner, isOwner, featured, actions }) {
  const [editing, setEditing] = useState(false)
  const reviewLink = `${gamePath(entry)}#resena-${owner.uid}`
  return (
    <li className={`lib-card ${editing ? 'is-editing' : ''}`}>
      <Link to={gamePath(entry)} className="lib-card__media" tabIndex={-1} aria-hidden="true">
        <GameImage src={entry.image} width={420} label={false} />
        {entry.favorite && (
          <span className="lib-card__fav" title="Favorito">
            <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
          </span>
        )}
      </Link>
      <div className="lib-card__body">
        <StatusBadge status={entry.status} />
        <h3 className="lib-card__title">
          <Link to={gamePath(entry)}>{entry.name}</Link>
          {entry.favorite && <span className="sr-only"> (favorito)</span>}
        </h3>
        {entry.status === 'completed' && entry.finishedAt && (
          <p className="fine-print">Completado el {formatDate(entry.finishedAt)}</p>
        )}
        <div className="lib-card__foot">
          <PersonalScore score={review?.score ?? null} label={isOwner ? 'Tu nota' : 'Su nota'} />
          {review && (
            <Link to={reviewLink} className="link-arrow lib-card__review">
              {isOwner ? 'Tu reseña' : 'Ver reseña'}
            </Link>
          )}
        </div>
        {isOwner && (
          <>
            <button
              type="button"
              className="btn btn--ghost btn--sm lib-card__manage"
              aria-expanded={editing}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? 'Listo' : 'Gestionar'}
            </button>
            {editing && (
              <EntryEditor key={entry.gameId} entry={entry} actions={actions} featured={featured} />
            )}
          </>
        )}
      </div>
    </li>
  )
}

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
      <Link className="btn btn--ghost btn--sm" to={`${gamePath(review)}#opiniones`}>Editar</Link>
      {confirm ? (
        <span className="confirm" role="group" aria-label="Confirmar eliminación">
          <button type="button" className="btn btn--danger btn--sm" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm(false)} disabled={remove.isPending}>
            Cancelar
          </button>
        </span>
      ) : (
        <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirm(true)}>Eliminar</button>
      )}
    </div>
  )
}

function ReviewsTab({ reviews, isOwner }) {
  if (!reviews.length) {
    return (
      <EmptyState title="Todavía no hay reseñas" icon="flag">
        {isOwner && <p>Buscá un juego en el catálogo y dejá tu primera opinión.</p>}
      </EmptyState>
    )
  }
  return (
    <ul className="profile-reviews">
      {reviews.map((r) => (
        <li key={r.id} className="profile-review" id={`resena-${r.gameId}`}>
          <Link to={gamePath(r)} className="profile-review__media" tabIndex={-1} aria-hidden="true">
            <GameImage src={r.gameImage} width={420} label={false} />
          </Link>
          <div className="profile-review__body">
            <div className="profile-review__head">
              <h3><Link to={gamePath(r)}>{r.gameName}</Link></h3>
              <PersonalScore score={r.score} label={isOwner ? 'Tu nota' : 'Su nota'} />
            </div>
            {r.text ? <p>{r.text}</p> : <p className="muted">Solo puntuación.</p>}
            <p className="fine-print">{formatDate(r.updatedAt)}</p>
            {isOwner && <OwnReviewActions review={r} />}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Profile() {
  const { handle } = useParams()
  const { user, profile: ownProfile } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'resenas' ? 'resenas' : 'biblioteca'
  const filter = FILTERS.some((f) => f.value === params.get('estado')) ? params.get('estado') : 'all'

  const profileQ = useProfileByHandle(handle)
  useDocumentTitle(profileQ.data ? `${profileQ.data.displayName} (@${profileQ.data.handle})` : 'Perfil')
  const isOwner = Boolean(user && profileQ.data && user.uid === profileQ.data.uid)
  // El dueño ve su perfil en tiempo real (por ejemplo, al destacar un juego).
  const profile = isOwner && ownProfile ? ownProfile : profileQ.data
  const reviews = useUserReviews(profile?.uid)
  const library = useLibrary(profile?.uid)
  const actions = useLibraryActions(user?.uid)

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

  const reviewList = reviews.data ?? []
  const entries = library.data ?? []
  const reviewByGame = new Map(reviewList.map((r) => [r.gameId, r]))
  const avg = reviewList.length ? reviewList.reduce((s, r) => s + r.score, 0) / reviewList.length : null
  const completed = entries.filter((e) => e.status === 'completed').length
  const counts = Object.fromEntries(
    FILTERS.map((f) => [
      f.value,
      f.value === 'all' ? entries.length : f.value === 'favorites' ? entries.filter((e) => e.favorite).length : entries.filter((e) => e.status === f.value).length,
    ]),
  )
  const visible = entries.filter((e) => (filter === 'all' ? true : filter === 'favorites' ? e.favorite : e.status === filter))
  const featured = (profile.featured ?? []).map((id) => entries.find((e) => e.gameId === id)).filter(Boolean)
  const cover = rawgImage(profile.coverUrl, 1600)
  const setParam = (key, value) => {
    const next = new URLSearchParams(window.location.search)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const loadingData = reviews.isPending || library.isPending

  return (
    <div className="profile">
      <header className="profile-hero">
        <div className={`profile-hero__cover ${cover ? '' : 'is-default'}`} style={cover ? { backgroundImage: `url("${cover}")` } : undefined} aria-hidden="true" />
        <div className="container profile-hero__inner">
          <Avatar profile={profile} size={132} className="profile-hero__avatar" />
          <div className="profile-hero__text">
            <h1>{profile.displayName}</h1>
            <p className="profile-hero__handle">
              @{profile.handle}
              {profile.createdAt && <span className="muted"> · En Checkpoint desde {formatMonth(profile.createdAt)}</span>}
            </p>
            {profile.bio ? <p className="profile-hero__bio">{profile.bio}</p> : isOwner && <p className="muted">Todavía no escribiste una biografía.</p>}
          </div>
          <div className="profile-hero__actions">
            <ShareButton profile={profile} />
            {isOwner && <Link to="/ajustes/perfil" className="btn btn--primary">Editar perfil</Link>}
          </div>
        </div>
      </header>

      <div className="container">
        <dl className="stats" aria-busy={loadingData}>
          <div>
            <dt>Completados</dt>
            <dd>{library.isPending ? '…' : completed}</dd>
          </div>
          <div>
            <dt>Reseñas</dt>
            <dd>{reviews.isPending ? '…' : reviewList.length}</dd>
          </div>
          <div>
            <dt>{isOwner ? 'Promedio de tus notas' : 'Promedio de sus notas'}</dt>
            <dd>
              {reviews.isPending ? '…' : formatAverage(avg)}
              {avg != null && <small>/10</small>}
            </dd>
          </div>
          <div>
            <dt>En biblioteca</dt>
            <dd>{library.isPending ? '…' : entries.length}</dd>
          </div>
        </dl>

        {(featured.length > 0 || isOwner) && (
          <section className="section featured-games" aria-labelledby="destacados">
            <div className="section__head">
              <h2 id="destacados" className="section__title">Destacados</h2>
              <span className="muted">{featured.length}/{MAX_FEATURED}</span>
            </div>
            {featured.length ? (
              <ol className="featured-games__list">
                {featured.map((e, i) => {
                  const r = reviewByGame.get(e.gameId)
                  return (
                    <li key={e.gameId} className="poster">
                      <Link to={gamePath(e)} className="poster__link">
                        <GameImage src={e.image} width={640} label={false} />
                        <span className="poster__rank" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                        <span className="poster__info">
                          <StatusBadge status={e.status} />
                          <strong>{e.name}</strong>
                          <span className="poster__score">{r ? `${r.score}/10` : 'Sin puntuar'}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="hint-box">
                Marcá juegos como <strong>Favorito</strong> y elegí <strong>Destacar en perfil</strong> para mostrar hasta {MAX_FEATURED} aquí.
              </p>
            )}
          </section>
        )}

        <div
          className="tabs"
          role="tablist"
          aria-label="Contenido del perfil"
          onKeyDown={(e) => {
            // Flechas izquierda/derecha para cambiar de pestaña (patrón de pestañas ARIA).
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
            const next = tab === 'biblioteca' ? 'resenas' : 'biblioteca'
            setParam('tab', next === 'resenas' ? 'resenas' : '')
            document.getElementById(`tab-${next}`)?.focus()
          }}
        >
          <button type="button" role="tab" id="tab-biblioteca" aria-controls="panel-biblioteca" aria-selected={tab === 'biblioteca'} tabIndex={tab === 'biblioteca' ? 0 : -1} onClick={() => setParam('tab', '')}>
            Biblioteca <span className="pill">{entries.length}</span>
          </button>
          <button type="button" role="tab" id="tab-resenas" aria-controls="panel-resenas" aria-selected={tab === 'resenas'} tabIndex={tab === 'resenas' ? 0 : -1} onClick={() => setParam('tab', 'resenas')}>
            Reseñas <span className="pill">{reviewList.length}</span>
          </button>
        </div>

        {tab === 'biblioteca' ? (
          <section id="panel-biblioteca" role="tabpanel" aria-labelledby="tab-biblioteca" className="tab-panel">
            {library.isPending || reviews.isPending ? (
              <Spinner label="Cargando biblioteca…" />
            ) : library.isError ? (
              <ErrorState error={library.error} onRetry={() => library.refetch()} />
            ) : entries.length === 0 ? (
              <EmptyState title="La biblioteca está vacía" icon="flag">
                {isOwner ? (
                  <>
                    <p>Agregá juegos desde su ficha y clasificalos como Quiero jugar, Jugando, Completado o Abandonado.</p>
                    <Link to="/juegos" className="btn btn--primary">Explorar el catálogo</Link>
                  </>
                ) : (
                  <p>{profile.displayName} todavía no agregó juegos.</p>
                )}
              </EmptyState>
            ) : (
              <>
                <div className="filter-chips" role="group" aria-label="Filtrar por estado">
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      className={`chip ${filter === f.value ? 'is-active' : ''}`}
                      aria-pressed={filter === f.value}
                      onClick={() => setParam('estado', f.value === 'all' ? '' : f.value)}
                    >
                      {f.label} <span>{counts[f.value]}</span>
                    </button>
                  ))}
                </div>
                {visible.length ? (
                  <ul className="lib-grid">
                    {visible.map((e) => (
                      <LibraryCard
                        key={e.gameId}
                        entry={e}
                        review={reviewByGame.get(e.gameId)}
                        owner={profile}
                        isOwner={isOwner}
                        featured={profile.featured ?? []}
                        actions={actions}
                      />
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No hay juegos con ese estado" />
                )}
              </>
            )}
          </section>
        ) : (
          <section id="panel-resenas" role="tabpanel" aria-labelledby="tab-resenas" className="tab-panel">
            {reviews.isPending ? (
              <Spinner />
            ) : reviews.isError ? (
              <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />
            ) : (
              <ReviewsTab reviews={reviewList} isOwner={isOwner} />
            )}
          </section>
        )}
      </div>
    </div>
  )
}
