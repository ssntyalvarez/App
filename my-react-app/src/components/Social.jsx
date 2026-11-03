import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { invalidateSocialData, useConnections, useProfile, useSuggestions } from '../lib/hooks.js'
import { firestoreMessage } from '../lib/profiles.js'
import { canMessage, follow, unfollow } from '../lib/social.js'
import Avatar from './Avatar.jsx'
import { LevelChip } from './LevelBadge.jsx'
import { Spinner } from './States.jsx'
import { useOpenChat } from './ChatDock.jsx'

export function FollowButton({ profile, size = '' }) {
  const { user } = useAuth()
  const notify = useToast()
  const queryClient = useQueryClient()
  const mine = useConnections(user?.uid)
  const following = mine.data?.following.includes(profile.uid)
  const followsMe = mine.data?.followers.includes(profile.uid)

  const toggle = useMutation({
    mutationFn: () => (following ? unfollow(user.uid, profile.uid) : follow(user.uid, profile.uid)),
    onSuccess: () => {
      invalidateSocialData(queryClient)
      notify(following ? `Dejaste de seguir a ${profile.displayName}.` : `Ahora seguís a ${profile.displayName}.`)
    },
    onError: (err) => notify(firestoreMessage(err, 'No se pudo actualizar.'), 'error'),
  })

  if (!user) {
    return <Link to="/ingresar" className={`btn btn--primary ${size}`}>Seguir</Link>
  }
  const label = following ? (followsMe ? 'Amigos' : 'Siguiendo') : followsMe ? 'Seguir también' : 'Seguir'
  return (
    <button
      type="button"
      className={`btn ${following ? 'btn--ghost' : 'btn--primary'} ${size} follow-btn`}
      aria-pressed={Boolean(following)}
      disabled={mine.isPending || toggle.isPending}
      onClick={() => toggle.mutate()}
      title={following ? 'Tocá para dejar de seguir' : undefined}
    >
      {label}
    </button>
  )
}

export function MessageButton({ profile }) {
  const { user } = useAuth()
  const openChat = useOpenChat()
  const notify = useToast()
  const [checking, setChecking] = useState(false)
  if (!user) return null
  return (
    <button
      type="button"
      className="btn btn--ghost"
      disabled={checking}
      onClick={async () => {
        setChecking(true)
        try {
          const { allowed } = await canMessage(user.uid, profile.uid, profile)
          if (allowed) openChat(profile)
          else notify(`${profile.displayName} no recibe mensajes de personas que no son sus amigos.`, 'error')
        } catch (err) {
          notify(firestoreMessage(err, 'No se pudo abrir el chat.'), 'error')
        } finally {
          setChecking(false)
        }
      }}
    >
      Mensaje
    </button>
  )
}

export function PersonRow({ uid, note }) {
  const { user } = useAuth()
  const { data: profile, isPending } = useProfile(uid)
  if (isPending) return <li className="person is-loading"><span className="muted">Cargando…</span></li>
  if (!profile) return null
  return (
    <li className="person">
      <Link to={`/u/${profile.handle}`} className="person__link">
        <Avatar profile={profile} size={44} />
        <span>
          <strong>{profile.displayName} <LevelChip uid={uid} /></strong>
          <span className="muted">@{profile.handle}{note ? ` · ${note}` : ''}</span>
        </span>
      </Link>
      {user && user.uid !== uid && <FollowButton profile={profile} size="btn--sm" />}
    </li>
  )
}

const LISTS = [
  { value: 'seguidores', label: 'Seguidores', key: 'followers', empty: 'Todavía nadie sigue este perfil.' },
  { value: 'seguidos', label: 'Seguidos', key: 'following', empty: 'Todavía no sigue a nadie.' },
]

// Ventana con los seguidores o seguidos de un perfil (se abre desde los contadores).
export function FollowListDialog({ profile, connections, list, onChange, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal()
  }, [])
  const active = LISTS.find((l) => l.value === list) ?? LISTS[0]
  const uids = connections.data?.[active.key] ?? []
  return (
    <dialog
      ref={ref}
      className="follow-dialog"
      aria-label={`${active.label} de ${profile.displayName}`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current.close()
      }}
    >
      <header className="follow-dialog__head">
        <div className="filter-chips" role="group" aria-label="Lista">
          {LISTS.map((l) => (
            <button
              key={l.value}
              type="button"
              className={`chip ${list === l.value ? 'is-active' : ''}`}
              aria-pressed={list === l.value}
              onClick={() => onChange(l.value)}
            >
              {l.label} <span>{connections.data?.[l.key].length ?? '…'}</span>
            </button>
          ))}
        </div>
        <button type="button" className="toast__close" onClick={() => ref.current.close()} aria-label="Cerrar">×</button>
      </header>
      <div className="follow-dialog__body">
        {connections.isPending ? (
          <Spinner />
        ) : connections.isError ? (
          <p className="form-error">No se pudo cargar la lista.</p>
        ) : uids.length ? (
          <ul className="people people--stack">
            {uids.map((uid) => <PersonRow key={uid} uid={uid} />)}
          </ul>
        ) : (
          <p className="muted">{active.empty}</p>
        )}
      </div>
    </dialog>
  )
}

// Amigos de amigos que todavía no seguís (en el panel Social).
export function Suggestions({ uid, connections }) {
  const suggestions = useSuggestions(uid, connections.data)
  if (connections.isError) return null
  return (
    <section className="drawer__section-block" aria-labelledby="sugerencias">
      <h3 id="sugerencias">Amigos de amigos</h3>
      {suggestions.isPending ? (
        <Spinner />
      ) : suggestions.isError ? (
        <p className="muted">No se pudieron cargar las sugerencias.</p>
      ) : suggestions.data.length ? (
        <ul className="people people--stack">
          {suggestions.data.map((s) => (
            <PersonRow key={s.uid} uid={s.uid} note={`${s.mutual.length} en común`} />
          ))}
        </ul>
      ) : (
        <p className="muted">Cuando tengas amigos, acá vas a ver a sus amigos.</p>
      )}
    </section>
  )
}
