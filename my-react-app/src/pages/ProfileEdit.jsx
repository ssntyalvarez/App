import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import Avatar from '../components/Avatar.jsx'
import GameImage from '../components/GameImage.jsx'
import { FirebasePending, Spinner } from '../components/States.jsx'
import { useAuth } from '../context/AuthContext.jsx'
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

export default function ProfileEdit() {
  const { user, profile, loading } = useAuth()
  useDocumentTitle('Editar perfil')
  if (!firebaseReady) return <div className="page container"><FirebasePending /></div>
  if (loading) return <div className="page container"><Spinner /></div>
  if (!user) return <Navigate to="/ingresar" replace state={{ from: '/ajustes/perfil' }} />
  if (!profile) return <Navigate to="/bienvenida" replace />
  return (
    <div className="page container container--narrow">
      <header className="page-head">
        <p className="eyebrow">Ajustes</p>
        <h1>Editar perfil</h1>
        <p className="page-head__lead">
          Todo lo de esta página es público. Tu correo ({user.email}) es privado: solo lo ves vos.
        </p>
      </header>
      <EditForm user={user} profile={profile} />
    </div>
  )
}
