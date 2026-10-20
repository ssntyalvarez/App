import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { FirebasePending, Spinner } from '../components/States.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { firestoreMessage, getUidByHandle, normalizeHandle, updateProfile, validateProfileFields } from '../lib/profiles.js'

function EditForm({ user, profile }) {
  const notify = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ displayName: profile.displayName, handle: profile.handle })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
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
      await updateProfile(user.uid, profile, { displayName: form.displayName.trim(), handle: form.handle })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['profile-handle'] })
      notify('Perfil actualizado.')
      navigate(`/u/${form.handle}`)
    } catch (err) {
      notify(firestoreMessage(err), 'error')
      setBusy(false)
    }
  }

  return (
    <form className="form panel" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="pe-name">Nombre visible</label>
        <input id="pe-name" value={form.displayName} maxLength={40} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} aria-invalid={errors.displayName ? 'true' : undefined} />
        {errors.displayName && <p className="form-error">{errors.displayName}</p>}
      </div>
      <div className="field">
        <label htmlFor="pe-handle">Alias</label>
        <input id="pe-handle" value={form.handle} maxLength={20} onChange={(e) => setForm((f) => ({ ...f, handle: normalizeHandle(e.target.value) }))} aria-invalid={errors.handle ? 'true' : undefined} />
        <p className="field__hint">Tu perfil: /u/{form.handle || '…'}</p>
        {errors.handle && <p className="form-error">{errors.handle}</p>}
      </div>
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        <Link to={`/u/${profile.handle}`} className="btn btn--ghost">Cancelar</Link>
      </div>
    </form>
  )
}

export default function ProfileEdit() {
  const { user, profile, loading } = useAuth()
  if (!firebaseReady) return <div className="page container"><FirebasePending /></div>
  if (loading) return <div className="page container"><Spinner /></div>
  if (!user) return <Navigate to="/ingresar" replace state={{ from: '/ajustes/perfil' }} />
  if (!profile) return <Navigate to="/bienvenida" replace />
  return (
    <div className="page container container--narrow">
      <header className="page-head">
        <p className="eyebrow">Ajustes</p>
        <h1>Editar perfil</h1>
        <p className="page-head__lead">Tu correo ({user.email}) es privado: solo lo ves vos.</p>
      </header>
      <EditForm user={user} profile={profile} />
    </div>
  )
}
