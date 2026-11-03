import { Link, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../lib/hooks.js'
import { useLibraryActions } from '../lib/libraryActions.js'
import EntryEditor from './EntryEditor.jsx'

const Heart = ({ filled }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="heart">
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" />
  </svg>
)

// Panel de la ficha de juego: agregar el juego a “Mi biblioteca” (tus favoritos).
export default function LibraryControl({ game }) {
  const { user, profile } = useAuth()
  const location = useLocation()
  const library = useLibrary(user?.uid)
  const actions = useLibraryActions(user?.uid)

  if (!user) {
    return (
      <section className="panel library-panel">
        <h2 className="panel__title">Mi biblioteca</h2>
        <p className="muted">Iniciá sesión para guardar este juego entre tus favoritos.</p>
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
        <>
          <p className="library-panel__in">
            <Heart filled /> Está en tu biblioteca
          </p>
          <EntryEditor key={entry.gameId} entry={entry} actions={actions} featured={profile.featured ?? []} />
        </>
      ) : (
        <>
          <p className="muted">Guardalo entre los juegos que te gustan para mostrarlo en tu perfil.</p>
          <button
            type="button"
            className="btn btn--primary"
            disabled={actions.add.isPending}
            onClick={() => actions.add.mutate({ game })}
          >
            <Heart /> {actions.add.isPending ? 'Agregando…' : 'Agregar a mi biblioteca'}
          </button>
        </>
      )}
    </section>
  )
}
