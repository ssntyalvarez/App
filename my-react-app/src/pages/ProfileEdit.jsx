import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import Avatar from '../components/Avatar.jsx'
import GameImage from '../components/GameImage.jsx'
import { FirebasePending, Spinner } from '../components/States.jsx'
import { authMessage, useAuth } from '../context/AuthContext.jsx'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { MESSAGE_OPTIONS, settingsOf } from '../lib/social.js'
import { useToast } from '../context/ToastContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { formatDate } from '../lib/format.js'
import { MAX_FEATURED } from '../lib/library.js'
import { useLibraryActions } from '../lib/libraryActions.js'
import { invalidateProfileData, useDebouncedValue, useDocumentTitle, useGames, useLibrary } from '../lib/hooks.js'
import { fileToAvatar } from '../lib/image.js'
import {
  HANDLE_COOLDOWN_MS,
  MAX_BIO,
  MAX_HANDLE,
  firestoreMessage,
  getUidByHandle,
  normalizeHandle,
  updateProfile,
  validateProfileFields,
} from '../lib/profiles.js'

// Juegos favoritos: los de la biblioteca (con opción de destacar o quitar) y un buscador para sumar más.
function FavoritesManager({ uid, featured }) {
  const library = useLibrary(uid)
  const actions = useLibraryActions(uid)
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search.trim(), 450)
  const results = useGames({ search: debounced, pageSize: 8 }, { enabled: debounced.length >= 2 })
  const entries = library.data ?? []
  const inLibrary = new Set(entries.map((e) => e.gameId))
  const busy = Object.values(actions).some((m) => m.isPending)

  return (
    <div className="favorites">
      {library.isPending ? (
        <p className="field__hint">Cargando tu biblioteca…</p>
      ) : entries.length ? (
        <ul className="fav-grid">
          {entries.map((e) => {
            const isFeatured = featured.includes(e.gameId)
            return (
              <li key={e.gameId} className="fav-item">
                <GameImage src={e.image} width={420} label={false} />
                <span className="fav-item__name">{e.name}</span>
                <span className="fav-item__actions">
                  <button
                    type="button"
                    className={`icon-btn ${isFeatured ? 'is-on' : ''}`}
                    aria-pressed={isFeatured}
                    disabled={busy}
                    onClick={() => actions.feature.mutate({ gameId: e.gameId, value: !isFeatured })}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z" />
                    </svg>
                    <span className="sr-only">Destacar {e.name} en el perfil</span>
                  </button>
                  <button type="button" className="icon-btn" disabled={busy} onClick={() => actions.remove.mutate({ gameId: e.gameId })}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                    <span className="sr-only">Quitar {e.name} de la biblioteca</span>
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="field__hint">Todavía no agregaste juegos. Buscalos acá abajo o desde su ficha.</p>
      )}
      <p className="field__hint">La estrella destaca hasta {MAX_FEATURED} juegos al principio de tu perfil.</p>

      <div className="field" data-tour="favoritos">
        <label htmlFor="fav-search">Agregar un juego</label>
        <input id="fav-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscá por nombre" maxLength={80} autoComplete="off" />
      </div>
      {results.isFetching && <p className="field__hint">Buscando…</p>}
      {results.isError && (
        <p className="field__hint">
          {results.error?.code === 'missing_key' ? 'El catálogo está pendiente de conexión.' : 'No se pudo buscar en el catálogo.'}
        </p>
      )}
      {results.data?.results.length > 0 && (
        <ul className="fav-results">
          {results.data.results.map((g) => (
            <li key={g.id}>
              <GameImage src={g.image} width={420} label={false} />
              <span>{g.name}</span>
              {inLibrary.has(String(g.id)) ? (
                <span className="muted fav-results__done">En tu biblioteca</span>
              ) : (
                <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => actions.add.mutate({ game: g })}>
                  Agregar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EditForm({ user, profile }) {
  const notify = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    displayName: profile.displayName,
    handle: profile.handle,
    bio: profile.bio ?? '',
    avatar: profile.avatar ?? '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [now] = useState(() => Date.now())
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onAvatar = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProcessing(true)
    setErrors((er) => ({ ...er, avatar: undefined }))
    try {
      set('avatar', await fileToAvatar(file))
    } catch (err) {
      setErrors((er) => ({ ...er, avatar: err.message }))
    } finally {
      setProcessing(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy || processing) return
    const errs = validateProfileFields(form)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      if (form.handle !== profile.handle && (await getUidByHandle(form.handle))) {
        setErrors({ handle: 'Ese alias ya está en uso.' })
        setBusy(false)
        return
      }
      await updateProfile(user.uid, profile, {
        displayName: form.displayName.trim(),
        handle: form.handle,
        bio: form.bio.trim(),
        avatar: form.avatar,
      })
      invalidateProfileData(queryClient)
      notify('Perfil actualizado.')
      navigate(`/u/${form.handle}`)
    } catch (err) {
      notify(firestoreMessage(err), 'error')
      setBusy(false)
    }
  }

  const preview = { ...profile, ...form }
  // Después de cambiar el alias hay que esperar una semana para volver a cambiarlo.
  const lastChange = profile.handleChangedAt?.toMillis?.()
  const nextChange = lastChange ? lastChange + HANDLE_COOLDOWN_MS : 0
  const handleLocked = nextChange > now

  return (
    <form className="profile-edit" onSubmit={onSubmit} noValidate>
      <div className="profile-edit__preview" aria-label="Vista previa" data-tour="perfil">
        <div className="profile-edit__cover is-default" />
        <div className="profile-edit__id">
          {/* La foto se cambia pasando el mouse (o con el teclado) sobre el avatar. */}
          <div className={`avatar-editable avatar-editable--sm ${processing ? 'is-busy' : ''}`}>
            <Avatar profile={preview} size={84} />
            <button type="button" className="avatar-editable__btn" onClick={() => fileRef.current?.click()} disabled={processing || busy}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <span>{processing ? 'Procesando…' : 'Cambiar foto'}</span>
            </button>
            <input ref={fileRef} id="pe-avatar" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} onChange={onAvatar} aria-label="Elegir foto de perfil" />
          </div>
          <div>
            <strong>{form.displayName || 'Tu nombre'}</strong>
            <span className="muted">@{form.handle || 'alias'}</span>
            {form.avatar && (
              <button type="button" className="link-btn profile-edit__initials" onClick={() => set('avatar', '')} disabled={busy}>
                Usar iniciales
              </button>
            )}
          </div>
        </div>
        {form.bio && <p className="profile-edit__bio">{form.bio}</p>}
        {errors.avatar && <p className="form-error profile-edit__bio" role="alert">{errors.avatar}</p>}
      </div>

      <section className="panel form">
        <h2 className="panel__title">Identidad</h2>
        <div className="form__row">
          <div className="field">
            <label htmlFor="pe-name">Nombre visible</label>
            <input id="pe-name" value={form.displayName} maxLength={40} onChange={(e) => set('displayName', e.target.value)} aria-invalid={errors.displayName ? 'true' : undefined} />
            {errors.displayName && <p className="form-error">{errors.displayName}</p>}
          </div>
          <div className="field">
            <label htmlFor="pe-handle">Alias</label>
            <div className="input-prefix">
              <span aria-hidden="true">@</span>
              <input id="pe-handle" value={form.handle} maxLength={MAX_HANDLE} autoCapitalize="none" spellCheck={false} disabled={handleLocked} onChange={(e) => set('handle', normalizeHandle(e.target.value))} aria-invalid={errors.handle ? 'true' : undefined} aria-describedby="pe-handle-hint" />
            </div>
            <p id="pe-handle-hint" className="field__hint">
              {handleLocked
                ? `Cambiaste tu alias hace poco. Vas a poder cambiarlo de nuevo el ${formatDate(new Date(nextChange))}.`
                : `Tu perfil: /u/${form.handle || '…'} · después de cambiarlo, tenés que esperar una semana para volver a hacerlo.`}
            </p>
            {errors.handle && <p className="form-error">{errors.handle}</p>}
          </div>
        </div>
        <div className="field">
          <label htmlFor="pe-bio">Biografía corta</label>
          <textarea id="pe-bio" rows={3} value={form.bio} maxLength={MAX_BIO} onChange={(e) => set('bio', e.target.value)} placeholder="¿Qué te gusta jugar?" />
          <p className="field__hint">{form.bio.length}/{MAX_BIO}</p>
          {errors.bio && <p className="form-error">{errors.bio}</p>}
        </div>
      </section>

      <section className="panel form" id="favoritos">
        <h2 className="panel__title">Tus juegos favoritos</h2>
        <FavoritesManager uid={user.uid} featured={profile.featured ?? []} />
      </section>

      <div className="row profile-edit__submit">
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy || processing}>
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <Link to={`/u/${profile.handle}`} className="btn btn--ghost btn--lg">Cancelar</Link>
      </div>
    </form>
  )
}

function PrivacySettings({ user, profile }) {
  const notify = useToast()
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState(() => settingsOf(profile))
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setSettings((x) => ({ ...x, [k]: v }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await updateProfile(user.uid, profile, { settings })
      invalidateProfileData(queryClient)
      notify('Privacidad actualizada.')
    } catch (err) {
      notify(firestoreMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel form settings-form" onSubmit={onSubmit}>
      <p className="hint-box">
        Todas las cuentas de Checkpoint son públicas: cualquiera puede ver tu perfil, tus favoritos y tus reseñas.
        Acá elegís quién puede escribirte y qué datos se muestran en tu perfil.
      </p>
      <fieldset className="radio-list">
        <legend>¿Quién puede enviarte mensajes?</legend>
        {MESSAGE_OPTIONS.map((o) => (
          <label key={o.value}>
            <input type="radio" name="messages" value={o.value} checked={settings.messages === o.value} onChange={() => set('messages', o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
        <p className="field__hint">Los amigos son las personas que te siguen y a las que seguís. Se aplica a conversaciones nuevas.</p>
      </fieldset>
      <label className="switch">
        <input type="checkbox" checked={settings.showFollows} onChange={(e) => set('showFollows', e.target.checked)} />
        <span>Mostrar mis seguidores, seguidos y amigos en mi perfil</span>
      </label>
      <label className="switch">
        <input type="checkbox" checked={settings.showHours} onChange={(e) => set('showHours', e.target.checked)} />
        <span>Mostrar el total de horas jugadas en mi perfil (las horas de cada reseña siguen visibles en la reseña)</span>
      </label>
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar privacidad'}</button>
      </div>
    </form>
  )
}

function AccountSettings({ user }) {
  const notify = useToast()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (form.next.length < 6) return setError('La contraseña nueva debe tener al menos 6 caracteres.')
    if (form.next !== form.confirm) return setError('Las contraseñas nuevas no coinciden.')
    setError('')
    setBusy(true)
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, form.current))
      await updatePassword(user, form.next)
      setForm({ current: '', next: '', confirm: '' })
      notify('Contraseña actualizada.')
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="settings-stack">
      <section className="panel">
        <h2 className="panel__title">Correo</h2>
        <p>{user.email}</p>
        <p className="field__hint">Es privado: solo lo ves vos y se usa para iniciar sesión.</p>
      </section>
      <form className="panel form" onSubmit={onSubmit} noValidate>
        <h2 className="panel__title">Cambiar contraseña</h2>
        <div className="field">
          <label htmlFor="acc-current">Contraseña actual</label>
          <input id="acc-current" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} />
        </div>
        <div className="form__row">
          <div className="field">
            <label htmlFor="acc-next">Contraseña nueva</label>
            <input id="acc-next" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} />
          </div>
          <div className="field">
            <label htmlFor="acc-confirm">Repetir contraseña nueva</label>
            <input id="acc-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          </div>
        </div>
        {error && <p className="form-error form-error--block" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
        </div>
      </form>
      <section className="panel">
        <h2 className="panel__title">Sesión</h2>
        <button
          type="button"
          className="btn btn--danger"
          onClick={async () => {
            await logout()
            notify('Cerraste sesión.')
            navigate('/')
          }}
        >
          Cerrar sesión
        </button>
      </section>
    </div>
  )
}

const SECTIONS = [
  { value: 'perfil', label: 'Perfil' },
  { value: 'privacidad', label: 'Privacidad' },
  { value: 'cuenta', label: 'Cuenta' },
]

// Configuración: perfil público, privacidad y cuenta.
export default function Settings() {
  const { user, profile, loading } = useAuth()
  const [params, setParams] = useSearchParams()
  const { hash } = useLocation()
  const section = SECTIONS.some((x) => x.value === params.get('seccion')) ? params.get('seccion') : 'perfil'
  useDocumentTitle('Configuración')
  if (!firebaseReady) return <div className="page container"><FirebasePending /></div>
  if (loading) return <div className="page container"><Spinner /></div>
  if (!user) return <Navigate to="/ingresar" replace state={{ from: '/configuracion' }} />
  if (!profile) return <Navigate to="/bienvenida" replace />
  return (
    <div className="page container container--narrow">
      <header className="page-head">
        <p className="eyebrow">
          <Link to={`/u/${profile.handle}`}>← Mi perfil</Link>
        </p>
        <h1>Configuración</h1>
      </header>
      <nav className="settings-nav" aria-label="Secciones de configuración">
        {SECTIONS.map((x) => (
          <Link
            key={x.value}
            to={x.value === 'perfil' ? `/configuracion${hash}` : `/configuracion?seccion=${x.value}`}
            className={section === x.value ? 'is-active' : ''}
            aria-current={section === x.value ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault()
              setParams(x.value === 'perfil' ? {} : { seccion: x.value })
            }}
          >
            {x.label}
          </Link>
        ))}
      </nav>
      {section === 'perfil' && (
        <>
          <p className="page-head__lead settings-lead">Todo lo de esta sección es público.</p>
          <EditForm user={user} profile={profile} />
        </>
      )}
      {section === 'privacidad' && <PrivacySettings user={user} profile={profile} />}
      {section === 'cuenta' && <AccountSettings user={user} />}
    </div>
  )
}

// Ruta anterior: /configuracion → /configuracion (conserva #favoritos).
export function LegacyProfileEdit() {
  const { hash } = useLocation()
  return <Navigate to={`/configuracion${hash}`} replace />
}
