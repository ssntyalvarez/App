import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../lib/hooks.js'
import { STATUSES } from '../lib/library.js'
import { useLibraryActions } from '../lib/libraryActions.js'
import EntryEditor from './EntryEditor.jsx'

// Panel de la ficha de juego.
export default function LibraryControl({ game }) {
  const { user, profile } = useAuth()
  const location = useLocation()
  const library = useLibrary(user?.uid)
  const actions = useLibraryActions(user?.uid)
  const [status, setStatus] = useState('want')

  if (!user) {
    return (
      <section className="panel library-panel">
        <h2 className="panel__title">Mi biblioteca</h2>
        <p className="muted">Iniciá sesión para guardar este juego como “Quiero jugar”, “Jugando”, “Completado” o “Abandonado”.</p>
        <Link to="/ingresar" state={{ from: location.pathname }} className="btn btn--ghost btn--sm">Ingresar</Link>
      </section>
    )
  }
  if (!profile) {
    return (
      <section className="panel library-panel">
        <h2 className="panel__title">Mi biblioteca</h2>
        <Link to="/bienvenida" state={{ from: location.pathname }} className="btn btn--primary btn--sm">Completar perfil</Link>
      </section>
    )
  }

  const entry = library.data?.find((e) => e.gameId === String(game.id))

  return (
    <section className="panel library-panel" aria-labelledby="library-title">
      <h2 id="library-title" className="panel__title">Mi biblioteca</h2>
      {library.isPending ? (
        <p className="muted">Cargando…</p>
      ) : library.isError ? (
        <p className="form-error">No se pudo cargar tu biblioteca.</p>
      ) : entry ? (
        <EntryEditor key={entry.gameId} entry={entry} actions={actions} featured={profile.featured ?? []} />
      ) : (
        <form
          className="library-add"
          onSubmit={(e) => {
            e.preventDefault()
            if (!actions.add.isPending) actions.add.mutate({ game, status })
          }}
        >
          <div className="field">
            <label htmlFor="library-status">Agregar como</label>
            <select id="library-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn--primary" disabled={actions.add.isPending}>
            {actions.add.isPending ? 'Agregando…' : 'Agregar a mi biblioteca'}
          </button>
        </form>
      )}
    </section>
  )
}
