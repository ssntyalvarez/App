import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate, useNavigation } from 'react-router'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'
import { OnboardingProvider } from './Onboarding.jsx'

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

// Cierre de sesión compartido por el menú de la cuenta y el footer.
function useLogout() {
  const { logout } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  return async () => {
    try {
      await logout()
      notify('Cerraste sesión.')
      navigate('/')
    } catch {
      notify('No se pudo cerrar sesión.', 'error')
    }
  }
}

// Opciones de la cuenta según haya sesión o no (se usan en el encabezado y en el footer).
function accountLinks(profile) {
  if (!profile) return [{ to: '/ajustes/perfil', label: 'Editar perfil' }]
  return [
    { to: `/u/${profile.handle}`, label: 'Mi perfil' },
    { to: `/u/${profile.handle}`, label: 'Mi biblioteca' },
    { to: `/u/${profile.handle}?tab=resenas`, label: 'Mis reseñas' },
    { to: '/ajustes/perfil', label: 'Editar perfil' },
  ]
}

function AccountMenu() {
  const { user, profile } = useAuth()
  const logout = useLogout()
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

  // Sin sesión (o sin Firebase configurado) siempre se ofrecen Ingresar y Crear cuenta;
  // esas páginas explican si las cuentas todavía no están conectadas.
  if (!user) {
    return (
      <div className="account account--guest">
        <Link to="/ingresar" className="btn btn--ghost btn--sm">Ingresar</Link>
        <Link to="/registro" className="btn btn--primary btn--sm">Crear cuenta</Link>
      </div>
    )
  }

  return (
    <div className="account" ref={ref}>
      <button
        type="button"
        className="account__trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar profile={profile} size={32} />
        <span className="account__name">Mi cuenta</span>
        <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      {open && (
        <div className="account__menu">
          <div className="account__who">
            <strong>{profile?.displayName || 'Tu cuenta'}</strong>
            {profile && <span className="muted">@{profile.handle}</span>}
          </div>
          {accountLinks(profile).map((l) => (
            <Link key={l.label} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <button
            type="button"
            className="account__logout"
            onClick={() => {
              setOpen(false)
              logout()
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

function FooterLinks() {
  const { user, profile } = useAuth()
  const logout = useLogout()
  return (
    <div className="site-footer__nav">
      <nav aria-label="Explorar">
        <h2>Explorar</h2>
        <ul>
          <li><Link to="/">Inicio</Link></li>
          <li><Link to="/juegos">Catálogo</Link></li>
          <li><Link to="/juegos?orden=-metacritic">Mejor puntuados</Link></li>
          <li><Link to="/juegos?orden=-released">Lanzamientos recientes</Link></li>
        </ul>
      </nav>
      <nav aria-label="Mi cuenta">
        <h2>Mi cuenta</h2>
        <ul>
          {user ? (
            <>
              {accountLinks(profile).map((l) => (
                <li key={l.label}><Link to={l.to}>{l.label}</Link></li>
              ))}
              <li>
                <button type="button" className="link-plain" onClick={logout}>Cerrar sesión</button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/ingresar">Ingresar</Link></li>
              <li><Link to="/registro">Crear cuenta</Link></li>
            </>
          )}
        </ul>
      </nav>
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigation = useNavigation()
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
      {navigation.state === 'loading' && (
        <div className="route-progress" role="progressbar" aria-label="Cargando página" />
      )}
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand" aria-label="Checkpoint, inicio">
            <Logo />
          </Link>
          <div id="site-nav" className={`site-nav ${menuOpen ? 'is-open' : ''}`}>
            <nav aria-label="Principal">
              <NavLink to="/" end>Inicio</NavLink>
              <NavLink to="/juegos">Catálogo</NavLink>
            </nav>
            <HeaderSearch onDone={() => setMenuOpen(false)} />
          </div>
          <div className="header-account">
            <AccountMenu />
          </div>
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
        </div>
      </header>
      <OnboardingProvider>
        <main id="contenido" tabIndex={-1}>
          <Outlet />
        </main>
      </OnboardingProvider>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__top">
            <div className="site-footer__brand">
              <Logo small />
              <p className="muted">Descubrí juegos, compará notas y armá tu biblioteca.</p>
            </div>
            <FooterLinks />
          </div>
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
