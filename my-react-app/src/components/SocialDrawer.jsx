import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext.jsx'
import { useConnections, useProfile } from '../lib/hooks.js'
import Avatar from './Avatar.jsx'
import { LevelChip } from './LevelBadge.jsx'
import { Spinner } from './States.jsx'

function FriendRow({ uid, filter, onNavigate }) {
  const { data: profile } = useProfile(uid)
  if (!profile) return null
  const f = filter.trim().toLowerCase().replace(/^@/, '')
  if (f && !profile.displayName.toLowerCase().includes(f) && !profile.handle.includes(f)) return null
  return (
    <li className="drawer-friend">
      <Link to={`/u/${profile.handle}`} className="drawer-friend__who" onClick={onNavigate}>
        <Avatar profile={profile} size={40} />
        <span>
          <strong>{profile.displayName} <LevelChip uid={uid} /></strong>
          <span className="muted">@{profile.handle}</span>
        </span>
      </Link>
      <Link to={`/mensajes/${profile.handle}`} className="btn btn--ghost btn--sm" onClick={onNavigate}>
        Chat
      </Link>
    </li>
  )
}

// Botón “Social” del encabezado: abre un panel lateral con tus amigos, el chat y un buscador de personas.
export default function SocialDrawer() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openAt, setOpenAt] = useState(null)
  const [filter, setFilter] = useState('')
  const connections = useConnections(openAt ? user?.uid : null)
  const panelRef = useRef(null)
  // El panel se cierra solo al cambiar de página.
  const open = openAt === pathname
  const close = () => setOpenAt(null)

  useEffect(() => {
    if (!open) return undefined
    panelRef.current?.querySelector('input')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenAt(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!user || !profile) return null
  const friends = connections.data?.friends ?? []

  return (
    <>
      <button
        type="button"
        className="social-toggle"
        aria-expanded={open}
        aria-controls="social-drawer"
        onClick={() => setOpenAt(open ? null : pathname)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 19.5c.8-3.3 3.4-5 6.5-5s5.7 1.7 6.5 5" />
          <circle cx="17" cy="9" r="2.6" />
          <path d="M16.2 14.6c2.7.1 4.6 1.6 5.3 4.4" />
        </svg>
        <span className="social-toggle__label">Social</span>
      </button>
      {/* El panel se monta en <body>: el encabezado usa backdrop-filter, que volvería “fijo” al panel
          respecto del encabezado en lugar de la pantalla. Existe solo mientras está abierto. */}
      {open &&
        createPortal(
          <>
      <div className="drawer-backdrop" onClick={close} aria-hidden="true" />
      <aside id="social-drawer" ref={panelRef} className="drawer" aria-label="Social">
        <header className="drawer__head">
          <h2>Social</h2>
          <button type="button" className="toast__close" onClick={close} aria-label="Cerrar panel social">×</button>
        </header>
        <form
          className="drawer__search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            close()
            navigate(`/personas${filter.trim() ? `?q=${encodeURIComponent(filter.trim())}` : ''}`)
          }}
        >
          <label htmlFor="social-search" className="sr-only">Buscar personas</label>
          <input
            id="social-search"
            type="search"
            placeholder="Buscar amigos o personas…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn btn--primary btn--sm">Buscar</button>
        </form>
        <p className="field__hint drawer__hint">Filtra tus amigos mientras escribís. “Buscar” busca en toda la comunidad.</p>

        <section className="drawer__section">
          <h3>Tus amigos {connections.data && <span className="pill">{friends.length}</span>}</h3>
          {connections.isPending ? (
            <Spinner />
          ) : friends.length ? (
            <ul className="drawer-friends">
              {friends.map((uid) => <FriendRow key={uid} uid={uid} filter={filter} onNavigate={close} />)}
            </ul>
          ) : (
            <p className="muted">
              Todavía no tenés amigos. Seguí a otras personas: cuando te sigan también, aparecen acá.
            </p>
          )}
        </section>
        <footer className="drawer__foot">
          <Link to="/mensajes" className="btn btn--ghost btn--sm" onClick={close}>Todas las conversaciones</Link>
          <Link to="/personas" className="btn btn--ghost btn--sm" onClick={close}>Explorar personas</Link>
        </footer>
      </aside>
          </>,
          document.body,
        )}
    </>
  )
}
