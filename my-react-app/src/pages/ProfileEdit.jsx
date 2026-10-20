import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import Avatar from '../components/Avatar.jsx'
import GameImage from '../components/GameImage.jsx'
import { FirebasePending, Spinner } from '../components/States.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { rawgImage } from '../lib/format.js'
import { invalidateProfileData, useDebouncedValue, useDocumentTitle, useGames, useLibrary } from '../lib/hooks.js'
import { fileToAvatar } from '../lib/image.js'
import {
  MAX_BIO,
  firestoreMessage,
  getUidByHandle,
  normalizeHandle,
  updateProfile,
  validateProfileFields,
} from '../lib/profiles.js'

function CoverOption({ item, value, onChange }) {
  return (
    <li>
      <button
        type="button"
        className={`cover-option ${value === item.image ? 'is-selected' : ''}`}
        aria-pressed={value === item.image}
        onClick={() => onChange(item.image)}
      >
        <GameImage src={item.image} width={420} label={false} />
        <span>{item.name}</span>
      </button>
    </li>
  )
}

// Portadas posibles: imágenes de los juegos de la biblioteca o de una búsqueda en el catálogo.
function CoverPicker({ uid, value, onChange }) {
  const library = useLibrary(uid)
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search.trim(), 450)
  const results = useGames({ search: debounced, pageSize: 8 }, { enabled: debounced.length >= 2 })

  const fromLibrary = (library.data ?? []).filter((e) => e.image).map((e) => ({ key: `l-${e.gameId}`, name: e.name, image: e.image }))
  const fromSearch = (results.data?.results ?? []).filter((g) => g.image).map((g) => ({ key: `s-${g.id}`, name: g.name, image: g.image }))

  return (
    <div className="cover-picker">
      {fromLibrary.length > 0 ? (
        <>
          <p className="field__hint">De tu biblioteca</p>
          <ul className="cover-grid">
            {fromLibrary.map((item) => <CoverOption key={item.key} item={item} value={value} onChange={onChange} />)}
          </ul>
        </>
      ) : (
        <p className="field__hint">Cuando agregues juegos a tu biblioteca, sus imágenes aparecerán acá.</p>
      )}
      <div className="field">
        <label htmlFor="cover-search">Buscar otra imagen en el catálogo</label>
        <input id="cover-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre de un juego" maxLength={80} />
      </div>
      {results.isFetching && <p className="field__hint">Buscando…</p>}
      {results.isError && (
        <p className="field__hint">
          {results.error?.code === 'missing_key' ? 'El catálogo está pendiente de conexión.' : 'No se pudo buscar en el catálogo.'}
        </p>
      )}
      {fromSearch.length > 0 && (
        <ul className="cover-grid">
          {fromSearch.map((item) => <CoverOption key={item.key} item={item} value={value} onChange={onChange} />)}
        </ul>
      )}
      {value && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange('')}>
          Usar la portada predeterminada
        </button>
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
    coverUrl: profile.coverUrl ?? '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false)
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
        coverUrl: form.coverUrl,
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
  const cover = rawgImage(form.coverUrl, 1280)

  return (
    <form className="profile-edit" onSubmit={onSubmit} noValidate>
      <div className="profile-edit__preview" aria-label="Vista previa">
        <div className={`profile-edit__cover ${cover ? '' : 'is-default'}`} style={cover ? { backgroundImage: `url("${cover}")` } : undefined} />
        <div className="profile-edit__id">
          <Avatar profile={preview} size={84} />
          <div>
            <strong>{form.displayName || 'Tu nombre'}</strong>
            <span className="muted">@{form.handle || 'alias'}</span>
          </div>
        </div>
        {form.bio && <p className="profile-edit__bio">{form.bio}</p>}
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
            <input id="pe-handle" value={form.handle} maxLength={20} onChange={(e) => set('handle', normalizeHandle(e.target.value))} aria-invalid={errors.handle ? 'true' : undefined} />
            <p className="field__hint">Tu perfil: /u/{form.handle || '…'}</p>
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

      <section className="panel form">
        <h2 className="panel__title">Avatar</h2>
        <div className="avatar-edit">
          <Avatar profile={preview} size={96} />
          <div className="avatar-edit__actions">
            <input ref={fileRef} id="pe-avatar" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onAvatar} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()} disabled={processing || busy}>
              {processing ? 'Procesando…' : 'Subir imagen'}
            </button>
            {form.avatar && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('avatar', '')} disabled={busy}>
                Usar iniciales
              </button>
            )}
            <p className="field__hint">Se recorta en cuadrado y se comprime a 192 px en tu navegador.</p>
            {errors.avatar && <p className="form-error" role="alert">{errors.avatar}</p>}
          </div>
        </div>
      </section>

      <section className="panel form">
        <h2 className="panel__title">Imagen de portada</h2>
        <CoverPicker uid={user.uid} value={form.coverUrl} onChange={(v) => set('coverUrl', v)} />
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
