import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'

function HeaderSearch({ onDone }) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  return (
    <form
      className="header-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const q = value.trim()
        navigate(q ? `/juegos?q=${encodeURIComponent(q)}` : '/juegos')
        setValue('')
        onDone?.()
      }}
    >
      <label htmlFor="header-search" className="sr-only">Buscar juegos</label>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="header-search__icon">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        id="header-search"
        type="search"
        placeholder="Buscar juegos…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
      />
    </form>
  )
}

function AccountMenu() {
  const { user, profile, logout } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!firebaseReady) return null

  if (!user) {
    return (
      <div className="account account--guest">
        <Link to="/ingresar" className="btn btn--ghost btn--sm">Ingresar</Link>
        <Link to="/registro" className="btn btn--primary btn--sm">Crear cuenta</Link>
      </div>
    )
  }

  const name = profile?.displayName || 'Mi cuenta'
  return (
    <div className="account" ref={ref}>
      <button
        type="button"
        className="account__trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar profile={profile} size={34} />
        <span className="account__name">{name}</span>
        <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      {open && (
        <div className="account__menu">
          {profile && (
            <Link to={`/u/${profile.handle}`} onClick={() => setOpen(false)}>
              Mi perfil
            </Link>
          )}
          <Link to="/ajustes/perfil" onClick={() => setOpen(false)}>Editar perfil</Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false)
              try {
                await logout()
                notify('Cerraste sesión.')
                navigate('/')
              } catch {
                notify('No se pudo cerrar sesión.', 'error')
              }
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  // El menú queda asociado a la ruta en la que se abrió: al navegar se cierra solo.
  const [menuPath, setMenuPath] = useState(null)
  const menuOpen = menuPath === location.pathname
  const setMenuOpen = (open) =>
    setMenuPath((current) => {
      const next = typeof open === 'function' ? open(current === location.pathname) : open
      return next ? location.pathname : null
    })

  return (
    <>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand" aria-label="Checkpoint, inicio">
            <Logo />
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="sr-only">{menuOpen ? 'Cerrar menú' : 'Abrir menú'}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <div id="site-nav" className={`site-nav ${menuOpen ? 'is-open' : ''}`}>
            <nav aria-label="Principal">
              <NavLink to="/" end>Inicio</NavLink>
              <NavLink to="/juegos">Catálogo</NavLink>
            </nav>
            <HeaderSearch onDone={() => setMenuOpen(false)} />
            <AccountMenu />
          </div>
        </div>
      </header>
      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <Logo small />
          <p>
            Datos de juegos, imágenes y puntuaciones de Metacritic provistos por{' '}
            <a href="https://rawg.io" target="_blank" rel="noopener noreferrer">RAWG</a>. Las notas de Metacritic
            pueden variar según la plataforma o actualizarse.
          </p>
          <p className="muted">Checkpoint · Trabajo práctico de Desarrollo Frontend II.</p>
        </div>
      </footer>
      <ScrollRestoration />
    </>
  )
}
