import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { invalidateSocialData, useConnections, useProfile, useSuggestions } from '../lib/hooks.js'
import { firestoreMessage } from '../lib/profiles.js'
import { canMessage, follow, settingsOf, unfollow } from '../lib/social.js'
import Avatar from './Avatar.jsx'
import { LevelChip } from './LevelBadge.jsx'
import { EmptyState, Spinner } from './States.jsx'

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
  const navigate = useNavigate()
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
          if (allowed) navigate(`/mensajes/${profile.handle}`)
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
  { value: 'amigos', label: 'Amigos', key: 'friends' },
  { value: 'seguidores', label: 'Seguidores', key: 'followers' },
  { value: 'seguidos', label: 'Seguidos', key: 'following' },
]

// Pestaña “Amigos” del perfil: amigos, seguidores, seguidos y (en el propio) amigos de amigos.
export function SocialTab({ profile, isOwner, connections, list = 'amigos', onListChange }) {
  const setList = onListChange
  const suggestions = useSuggestions(isOwner ? profile.uid : null, connections.data)
  const hidden = !isOwner && !settingsOf(profile).showFollows
  const active = LISTS.find((l) => l.value === list)
  const uids = connections.data?.[active.key] ?? []

  if (hidden) {
    return (
      <EmptyState title="Lista privada">
        <p>{profile.displayName} eligió no mostrar sus seguidores y seguidos.</p>
      </EmptyState>
    )
  }

  return (
    <div className="social-tab">
      <div className="filter-chips" role="group" aria-label="Lista">
        {LISTS.map((l) => (
          <button
            key={l.value}
            type="button"
            className={`chip ${list === l.value ? 'is-active' : ''}`}
            aria-pressed={list === l.value}
            onClick={() => setList(l.value)}
          >
            {l.label} <span>{connections.data?.[l.key].length ?? '…'}</span>
          </button>
        ))}
      </div>
      {connections.isPending ? (
        <Spinner />
      ) : uids.length ? (
        <ul className="people">
          {uids.map((uid) => <PersonRow key={uid} uid={uid} />)}
        </ul>
      ) : (
        <p className="hint-box">
          {list === 'amigos'
            ? 'Cuando dos personas se siguen mutuamente, son amigas.'
            : list === 'seguidores'
              ? 'Todavía nadie sigue este perfil.'
              : 'Todavía no sigue a nadie.'}
        </p>
      )}

      {isOwner && (
        <section className="section" aria-labelledby="sugerencias">
          <h2 id="sugerencias" className="section__title">Amigos de amigos</h2>
          <p className="muted">Personas que son amigas de tus amigos y todavía no seguís.</p>
          {suggestions.isPending ? (
            <Spinner />
          ) : suggestions.data?.length ? (
            <ul className="people">
              {suggestions.data.map((s) => (
                <PersonRow key={s.uid} uid={s.uid} note={`${s.mutual.length} ${s.mutual.length === 1 ? 'amigo' : 'amigos'} en común`} />
              ))}
            </ul>
          ) : (
            <p className="hint-box">Cuando tengas amigos, acá vas a ver a sus amigos.</p>
          )}
        </section>
      )}
    </div>
  )
}
