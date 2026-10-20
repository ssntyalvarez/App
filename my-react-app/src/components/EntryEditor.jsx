import { useState } from 'react'
import { MAX_FEATURED, STATUSES, todayISO } from '../lib/library.js'

export default function EntryEditor({ entry, actions, featured, onRemoved }) {
  const [confirm, setConfirm] = useState(false)
  const busy = Object.values(actions).some((m) => m.isPending)
  const isFeatured = featured.includes(entry.gameId)
  const idBase = `lib-${entry.gameId}`

  return (
    <div className="entry-editor">
      <fieldset className="status-picker" disabled={busy}>
        <legend>Estado</legend>
        <div className="status-picker__options">
          {STATUSES.map((s) => (
            <label key={s.value} className={`status-chip status-chip--${s.value} ${entry.status === s.value ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name={`${idBase}-status`}
                value={s.value}
                checked={entry.status === s.value}
                onChange={() => actions.update.mutate({ gameId: entry.gameId, changes: { status: s.value } })}
              />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {entry.status === 'completed' && (
        <div className="field">
          <label htmlFor={`${idBase}-date`}>
            Fecha de finalización <span className="muted">(opcional)</span>
          </label>
          <div className="row">
            <input
              id={`${idBase}-date`}
              type="date"
              max={todayISO()}
              defaultValue={entry.finishedAt ?? ''}
              disabled={busy}
              onChange={(e) => {
                const v = e.target.value
                if (v && v > todayISO()) return
                actions.update.mutate({ gameId: entry.gameId, changes: { finishedAt: v || null } })
              }}
            />
          </div>
        </div>
      )}

      <div className="toggle-row">
        <button
          type="button"
          className={`toggle ${entry.favorite ? 'is-on' : ''}`}
          aria-pressed={entry.favorite}
          disabled={busy}
          onClick={() => actions.favorite.mutate({ gameId: entry.gameId, value: !entry.favorite })}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
          </svg>
          Favorito
        </button>
        <button
          type="button"
          className={`toggle ${isFeatured ? 'is-on' : ''}`}
          aria-pressed={isFeatured}
          disabled={busy || !entry.favorite}
          title={entry.favorite ? undefined : 'Primero marcalo como favorito'}
          onClick={() => actions.feature.mutate({ gameId: entry.gameId, value: !isFeatured })}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z" />
          </svg>
          Destacar en perfil
        </button>
      </div>
      {!entry.favorite && <p className="field__hint">Solo los favoritos se pueden destacar (hasta {MAX_FEATURED}).</p>}

      <div className="row">
        {confirm ? (
          <span className="confirm" role="group" aria-label="Confirmar">
            <span>¿Quitar de la biblioteca?</span>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              disabled={busy}
              onClick={() => actions.remove.mutate({ gameId: entry.gameId }, { onSuccess: () => onRemoved?.() })}
            >
              {actions.remove.isPending ? 'Quitando…' : 'Sí, quitar'}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm(false)} disabled={busy}>
              Cancelar
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirm(true)} disabled={busy}>
            Quitar de la biblioteca
          </button>
        )}
      </div>
      <p className="fine-print">Marcar como completado no crea una puntuación: tu nota se pone en Opiniones.</p>
    </div>
  )
}
