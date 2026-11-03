import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { invalidateReviewData } from '../lib/hooks.js'
import { firestoreMessage } from '../lib/profiles.js'
import { MAX_REVIEW_LENGTH, deleteReview, saveReview, validateReview } from '../lib/reviews.js'

const SCORES = Array.from({ length: 11 }, (_, i) => i)

export default function ReviewForm({ game, existing }) {
  const { user, profile } = useAuth()
  const location = useLocation()
  const notify = useToast()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(!existing)
  const [score, setScore] = useState(existing?.score ?? null)
  const [text, setText] = useState(existing?.text ?? '')
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = useMutation({
    mutationFn: () => saveReview({ uid: user.uid, game, score, text, existing }),
    onSuccess: () => {
      notify(existing ? 'Tu opinión se actualizó.' : '¡Opinión publicada!')
      setEditing(false)
      invalidateReviewData(queryClient, game.id, user.uid)
    },
    onError: (err) => notify(firestoreMessage(err, 'No se pudo guardar tu opinión.'), 'error'),
  })

  const remove = useMutation({
    mutationFn: () => deleteReview(game.id, user.uid),
    onSuccess: () => {
      notify('Eliminaste tu opinión.')
      setConfirmDelete(false)
      setScore(null)
      setText('')
      setEditing(true)
      invalidateReviewData(queryClient, game.id, user.uid)
    },
    onError: (err) => notify(firestoreMessage(err, 'No se pudo eliminar tu opinión.'), 'error'),
  })

  if (!user) {
    return (
      <div className="review-cta">
        <h3>¿Lo jugaste?</h3>
        <p>Iniciá sesión para puntuarlo y contarle a la comunidad qué te pareció.</p>
        <div className="row">
          <Link className="btn btn--primary" to="/ingresar" state={{ from: location.pathname }}>Ingresar</Link>
          <Link className="btn btn--ghost" to="/registro" state={{ from: location.pathname }}>Crear cuenta</Link>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="review-cta">
        <h3>Completá tu perfil</h3>
        <p>Antes de opinar, elegí tu nombre visible y tu alias.</p>
        <Link className="btn btn--primary" to="/bienvenida" state={{ from: location.pathname }}>Completar perfil</Link>
      </div>
    )
  }

  const busy = save.isPending || remove.isPending

  if (existing && !editing) {
    return (
      <div className="review-own">
        <div className="review-own__head">
          <h3>Tu opinión</h3>
          <div className="row">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setScore(existing.score)
                setText(existing.text)
                setEditing(true)
              }}
              disabled={busy}
            >
              Editar
            </button>
            {!confirmDelete ? (
              <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
                Eliminar
              </button>
            ) : (
              <span className="confirm" role="group" aria-label="Confirmar eliminación">
                <span>¿Eliminar tu opinión?</span>
                <button type="button" className="btn btn--danger btn--sm" onClick={() => remove.mutate()} disabled={busy}>
                  {remove.isPending ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Cancelar
                </button>
              </span>
            )}
          </div>
        </div>
        <p className="review-own__score">
          <span className="big-number">{existing.score}</span>
          <span className="muted">/10</span>
        </p>
        {existing.text ? <p className="review-own__text">{existing.text}</p> : <p className="muted">Sin comentario.</p>}
      </div>
    )
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (busy) return
    const errs = validateReview({ score, text })
    setErrors(errs)
    if (Object.keys(errs).length) return
    save.mutate()
  }

  return (
    <form className="review-form" onSubmit={onSubmit} noValidate>
      <h3>{existing ? 'Editar tu opinión' : 'Escribí tu opinión'}</h3>
      <fieldset className="score-picker" aria-describedby={errors.score ? 'score-error' : undefined}>
        <legend>
          Tu puntuación <span className="muted">(0 a 10)</span>
        </legend>
        <div className="score-picker__options">
          {SCORES.map((n) => (
            <label key={n} className={`score-picker__option ${score === n ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="score"
                value={n}
                checked={score === n}
                onChange={() => setScore(n)}
                disabled={busy}
              />
              <span>{n}</span>
            </label>
          ))}
        </div>
        {errors.score && <p id="score-error" className="form-error">{errors.score}</p>}
      </fieldset>

      <div className="field">
        <label htmlFor="review-text">
          Comentario <span className="muted">(opcional)</span>
        </label>
        <textarea
          id="review-text"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_REVIEW_LENGTH}
          placeholder="¿Qué te gustó? ¿Qué cambiarías?"
          disabled={busy}
          aria-describedby="review-count"
        />
        <p id="review-count" className={`field__hint ${text.length > MAX_REVIEW_LENGTH - 100 ? 'is-warning' : ''}`}>
          {text.length}/{MAX_REVIEW_LENGTH}
        </p>
        {errors.text && <p className="form-error">{errors.text}</p>}
      </div>

      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {save.isPending ? 'Guardando…' : existing ? 'Guardar cambios' : 'Publicar opinión'}
        </button>
        {existing && (
          <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)} disabled={busy}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
