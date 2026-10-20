import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import Logo from '../components/Logo.jsx'
import { FirebasePending, Spinner } from '../components/States.jsx'
import { authMessage, useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { useDocumentTitle } from '../lib/hooks.js'
import {
  createProfile,
  firestoreMessage,
  getUidByHandle,
  normalizeHandle,
  validateProfileFields,
} from '../lib/profiles.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AuthShell({ title, lead, children, footer }) {
  useDocumentTitle(title)
  return (
    <div className="auth">
      <div className="auth__art" aria-hidden="true">
        <div className="auth__art-inner">
          <Logo />
          <p className="auth__quote">Tu próxima partida empieza con una buena recomendación.</p>
          <ul className="auth__points">
            <li><span>01</span> Puntuá de 0 a 10</li>
            <li><span>02</span> Armá tu biblioteca</li>
            <li><span>03</span> Compartí tu perfil</li>
          </ul>
        </div>
      </div>
      <div className="auth__panel">
        <div className="auth__card">
          <h1>{title}</h1>
          {lead && <p className="muted">{lead}</p>}
          {firebaseReady ? children : <FirebasePending />}
          {footer && <p className="auth__footer">{footer}</p>}
        </div>
      </div>
    </div>
  )
}

function Field({ id, label, error, hint, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />
      {hint && !error && <p id={`${id}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${id}-err`} className="form-error">{error}</p>}
    </div>
  )
}

export function Login() {
  const { user, login, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const notify = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const from = location.state?.from || '/'

  if (!busy && !loading && user) return <Navigate to={from} replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!EMAIL.test(email) || !password) {
      setError('Ingresá un correo válido y tu contraseña.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
      notify('¡Hola de nuevo!')
      navigate(from, { replace: true })
    } catch (err) {
      setError(authMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Ingresar"
      lead="Accedé para puntuar juegos, escribir opiniones y gestionar tu biblioteca."
      footer={
        <>
          ¿No tenés cuenta? <Link to="/registro" state={location.state}>Creá una</Link>
        </>
      }
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        <Field id="login-email" label="Correo electrónico" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field id="login-password" label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="form-error form-error--block" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </AuthShell>
  )
}

export function Register() {
  const { user, register, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const notify = useToast()
  const [form, setForm] = useState({ displayName: '', handle: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'handle' ? normalizeHandle(e.target.value) : e.target.value }))

  if (!busy && !loading && user) return <Navigate to="/" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    const errs = validateProfileFields(form)
    if (!EMAIL.test(form.email)) errs.email = 'Ingresá un correo válido.'
    if (form.password.length < 6) errs.password = 'Mínimo 6 caracteres.'
    if (form.password !== form.confirm) errs.confirm = 'Las contraseñas no coinciden.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setBusy(true)
    try {
      if (await getUidByHandle(form.handle)) {
        setErrors({ handle: 'Ese alias ya está en uso.' })
        setBusy(false)
        return
      }
      const cred = await register(form.email.trim(), form.password)
      try {
        await createProfile(cred.user.uid, form)
      } catch (err) {
        notify(firestoreMessage(err, 'La cuenta se creó, pero falta completar el perfil.'), 'error')
        navigate('/bienvenida', { replace: true, state: location.state })
        return
      }
      notify('¡Cuenta creada! Bienvenido/a a Checkpoint.')
      navigate(location.state?.from || `/u/${form.handle}`, { replace: true })
    } catch (err) {
      setErrors({ form: err?.code?.startsWith('auth/') ? authMessage(err) : firestoreMessage(err) })
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Crear cuenta"
      lead="Tu correo se usa solo para iniciar sesión y no se muestra en tu perfil."
      footer={
        <>
          ¿Ya tenés cuenta? <Link to="/ingresar" state={location.state}>Ingresá</Link>
        </>
      }
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="form__row">
          <Field id="reg-name" label="Nombre visible" value={form.displayName} onChange={set('displayName')} maxLength={40} autoComplete="nickname" error={errors.displayName} />
          <Field id="reg-handle" label="Alias" value={form.handle} onChange={set('handle')} maxLength={20} autoComplete="username" error={errors.handle} hint={form.handle ? `checkpoint/u/${form.handle}` : 'Será la dirección de tu perfil.'} />
        </div>
        <Field id="reg-email" label="Correo electrónico" type="email" value={form.email} onChange={set('email')} autoComplete="email" error={errors.email} />
        <div className="form__row">
          <Field id="reg-pass" label="Contraseña" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" error={errors.password} hint="Mínimo 6 caracteres." />
          <Field id="reg-confirm" label="Repetir contraseña" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" error={errors.confirm} />
        </div>
        {errors.form && <p className="form-error form-error--block" role="alert">{errors.form}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </AuthShell>
  )
}

// Para cuentas que existen en Authentication pero todavía no tienen perfil público.
export function Welcome() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const notify = useToast()
  const [form, setForm] = useState({ displayName: '', handle: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="page container"><Spinner /></div>
  if (!user) return <Navigate to="/ingresar" replace state={{ from: '/bienvenida' }} />
  if (profile && !busy) return <Navigate to={`/u/${profile.handle}`} replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    const errs = validateProfileFields(form)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      if (await getUidByHandle(form.handle)) {
        setErrors({ handle: 'Ese alias ya está en uso.' })
        setBusy(false)
        return
      }
      await createProfile(user.uid, form)
      notify('Perfil creado.')
      navigate(location.state?.from || `/u/${form.handle}`, { replace: true })
    } catch (err) {
      setErrors({ form: firestoreMessage(err) })
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Completá tu perfil" lead="Elegí cómo te van a ver los demás en Checkpoint.">
      <form className="form" onSubmit={onSubmit} noValidate>
        <Field id="wel-name" label="Nombre visible" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} maxLength={40} error={errors.displayName} />
        <Field id="wel-handle" label="Alias" value={form.handle} onChange={(e) => setForm((f) => ({ ...f, handle: normalizeHandle(e.target.value) }))} maxLength={20} error={errors.handle} hint="Minúsculas, números o guion bajo." />
        {errors.form && <p className="form-error form-error--block" role="alert">{errors.form}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </form>
    </AuthShell>
  )
}
