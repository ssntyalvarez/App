import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { useLibrary, useUserReviews } from '../lib/hooks.js'
import { TASKS, getTourStatus, setTourStatus, subscribeTour, taskStatus } from '../lib/onboarding.js'

const OnboardingContext = createContext(null)

// oxlint-disable-next-line react/only-export-components
export function useOnboarding() {
  return useContext(OnboardingContext)
}

export function OnboardingProvider({ children }) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const notify = useToast()
  const library = useLibrary(user?.uid)
  const reviews = useUserReviews(user?.uid)
  const [guide, setGuide] = useState(null)
  const [skipped, setSkipped] = useState([])
  const [sessionUid, setSessionUid] = useState(null)

  // Al cambiar de cuenta se reinicia la guía de esta sesión.
  if ((user?.uid ?? null) !== sessionUid) {
    setSessionUid(user?.uid ?? null)
    setGuide(null)
    setSkipped([])
  }
  // Estado guardado en el navegador; el registro lo marca como pendiente justo después de crear el perfil.
  const uid = user?.uid
  const status = useSyncExternalStore(subscribeTour, () => (uid ? getTourStatus(uid) : null))

  const ready = !user || (profile && library.isSuccess && reviews.isSuccess)
  const done = taskStatus({
    user,
    profile,
    libraryCount: library.data?.length ?? 0,
    reviewCount: reviews.data?.length ?? 0,
  })
  const pending = TASKS.filter((t) => !done[t.id])

  const updateStatus = (next) => {
    if (user) setTourStatus(user.uid, next)
  }

  // Al completar la tarea guiada termina la guía (y vuelve la secuencia de pantallas).
  const [completedGuide, setCompletedGuide] = useState(null)
  if (guide && done[guide]) {
    setCompletedGuide(guide)
    setGuide(null)
  }
  useEffect(() => {
    if (completedGuide) notify('¡Tarea completada!')
  }, [completedGuide, notify])

  const start = (taskId) => {
    const task = TASKS.find((t) => t.id === taskId)
    if (!task) return
    if (task.id !== 'account') setGuide(task.id)
    navigate(task.route)
  }

  const value = {
    ready,
    done,
    pending,
    guide,
    status,
    skipped,
    start,
    stopGuide: () => setGuide(null),
    skipStep: (id) => setSkipped((s) => [...s, id]),
    skipAll: () => updateStatus('skipped'),
    finish: () => updateStatus('finished'),
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {firebaseReady && <OnboardingModal />}
      {guide && <GuideSpotlight />}
    </OnboardingContext.Provider>
  )
}

// Pantalla tras pantalla: una por tarea pendiente, con un botón que lleva directo a hacerla.
function OnboardingModal() {
  const { ready, pending, guide, status, skipped, start, skipStep, skipAll, finish } = useOnboarding()
  const { pathname } = useLocation()
  const dialogRef = useRef(null)

  const steps = pending.filter((t) => t.id !== 'account')
  const current = steps.find((t) => !skipped.includes(t.id))
  const allDone = steps.length === 0
  const visible = ready && status === 'pending' && !guide && pathname !== '/bienvenida' && (current || allDone)
  const total = 3
  const position = allDone ? total : total - steps.length + 1

  // Si se omitieron todas las pantallas, el tutorial queda como omitido (y aparece la lista de tareas).
  const allSkipped = ready && status === 'pending' && !guide && !allDone && !current
  useEffect(() => {
    if (allSkipped) skipAll()
  }, [allSkipped, skipAll])

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (visible && !dlg.open) dlg.showModal()
    if (!visible && dlg.open) dlg.close()
  }, [visible])

  return (
    <dialog
      ref={dialogRef}
      className="tour"
      aria-labelledby="tour-title"
      onCancel={(e) => {
        e.preventDefault()
        skipAll()
      }}
    >
      {visible && (
        <div className="tour__inner">
          <p className="tour__progress" aria-label={`Paso ${position} de ${total}`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={i < position ? 'is-on' : ''} />
            ))}
          </p>
          {allDone ? (
            <>
              <h2 id="tour-title">¡Todo listo!</h2>
              <p className="muted">Completaste los primeros pasos. Ya podés aprovechar Checkpoint al máximo.</p>
              <div className="row">
                <button type="button" className="btn btn--primary" onClick={finish}>
                  Empezar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="tour__eyebrow">Primeros pasos</p>
              <h2 id="tour-title">{current.title}</h2>
              <p className="muted">{current.description}</p>
              <div className="tour__actions">
                <button type="button" className="btn btn--primary" onClick={() => start(current.id)}>
                  Ir a hacerlo
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => skipStep(current.id)}>
                  Omitir
                </button>
              </div>
              <button type="button" className="link-btn tour__skip-all" onClick={skipAll}>
                Omitir el tutorial
              </button>
            </>
          )}
        </div>
      )}
    </dialog>
  )
}

// Resalta dónde tocar: un borde que late alrededor del elemento y un cartel con la indicación.
function GuideSpotlight() {
  const { guide, stopGuide } = useOnboarding()
  const { pathname, hash } = useLocation()
  const task = TASKS.find((t) => t.id === guide)
  const target = task?.target?.(pathname)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!target) return undefined
    let el = null
    let frame = 0
    let scrolled = false
    const update = () => {
      el = el?.isConnected ? el : document.querySelector(`[data-tour="${target}"]`)
      if (el) {
        if (!scrolled) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          scrolled = true
        }
        const r = el.getBoundingClientRect()
        setRect((prev) =>
          prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
            ? prev
            : { top: r.top, left: r.left, width: r.width, height: r.height },
        )
      } else {
        setRect(null)
      }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [target, pathname, hash])

  if (!task) return null
  const hint = task.hint(pathname)
  const below = rect ? rect.top + rect.height + 120 < window.innerHeight : true

  return (
    <>
      {rect && (
        <div
          className="spotlight"
          aria-hidden="true"
          style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
        />
      )}
      <div
        className={`spotlight-tip ${rect ? '' : 'is-floating'}`}
        role="status"
        style={
          rect
            ? {
                top: below ? rect.top + rect.height + 18 : undefined,
                bottom: below ? undefined : window.innerHeight - rect.top + 18,
                left: Math.max(12, Math.min(rect.left, window.innerWidth - 332)),
              }
            : undefined
        }
      >
        <strong>Tocá acá</strong>
        <span>{hint}</span>
        <button type="button" className="link-btn" onClick={stopGuide}>
          Salir de la guía
        </button>
      </div>
    </>
  )
}

// Lista de tareas en el inicio y en el perfil propio, mientras quede alguna pendiente.
export function TaskChecklist() {
  const { user } = useAuth()
  const { ready, done, pending, start } = useOnboarding()
  if (!firebaseReady || !ready || pending.length === 0) return null
  const completed = TASKS.length - pending.length

  return (
    <section className="checklist" aria-labelledby="checklist-title">
      <div className="checklist__head">
        <div>
          <h2 id="checklist-title">Primeros pasos</h2>
          <p className="muted">
            {completed} de {TASKS.length} tareas completadas
          </p>
        </div>
        <div className="checklist__bar" aria-hidden="true">
          <span style={{ width: `${(completed / TASKS.length) * 100}%` }} />
        </div>
      </div>
      <ol className="checklist__list">
        {TASKS.map((t) => (
          <li key={t.id} className={done[t.id] ? 'is-done' : ''}>
            <span className="checklist__check" aria-hidden="true">
              {done[t.id] ? '✓' : ''}
            </span>
            <span className="checklist__text">
              <strong>{t.title}</strong>
              <span className="muted">{t.description}</span>
            </span>
            {done[t.id] ? (
              <span className="sr-only">Completada</span>
            ) : t.id === 'account' && !user ? (
              <span className="row checklist__cta">
                <Link to="/registro" className="btn btn--primary btn--sm">Crear cuenta</Link>
                <Link to="/ingresar" className="btn btn--ghost btn--sm">Ingresar</Link>
              </span>
            ) : (
              <button type="button" className="btn btn--ghost btn--sm checklist__cta" onClick={() => start(t.id)}>
                Hacerlo
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
