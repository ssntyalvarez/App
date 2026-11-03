import { useState } from 'react'
import { MAX_FEATURED } from '../lib/library.js'

// Opciones de un juego que ya está en la biblioteca: destacarlo en el perfil o quitarlo.
export default function EntryEditor({ entry, actions, featured, onRemoved }) {
  const [confirm, setConfirm] = useState(false)
  const busy = Object.values(actions).some((m) => m.isPending)
  const isFeatured = featured.includes(entry.gameId)

  return (
    <div className="entry-editor">
      <button
        type="button"
        className={`toggle ${isFeatured ? 'is-on' : ''}`}
        aria-pressed={isFeatured}
        disabled={busy}
        onClick={() => actions.feature.mutate({ gameId: entry.gameId, value: !isFeatured })}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z" />
        </svg>
        Destacar en perfil
      </button>
      <p className="field__hint">Podés destacar hasta {MAX_FEATURED} juegos.</p>
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
    </div>
  )
}
