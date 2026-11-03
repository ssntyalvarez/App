import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { PersonRow } from '../components/Social.jsx'
import { EmptyState, ErrorState, FirebasePending, Spinner } from '../components/States.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { useDocumentTitle } from '../lib/hooks.js'
import { searchPeople } from '../lib/social.js'

// Buscador de personas de toda la comunidad.
export default function People() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [text, setText] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setText(q)
  }
  useDocumentTitle(q ? `Personas: “${q}”` : 'Personas')
  const results = useQuery({ queryKey: ['people', q], queryFn: () => searchPeople(q), enabled: firebaseReady })

  if (!firebaseReady) return <div className="page container"><FirebasePending /></div>

  return (
    <div className="page container container--narrow">
      <header className="page-head">
        <p className="eyebrow">Comunidad</p>
        <h1>Personas</h1>
        <p className="page-head__lead">Buscá por nombre o alias. Sin texto, se muestran las cuentas más nuevas.</p>
      </header>
      <form
        className="people-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          setParams(text.trim() ? { q: text.trim() } : {})
        }}
      >
        <label htmlFor="people-q" className="sr-only">Buscar personas</label>
        <input id="people-q" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Nombre o @alias" autoComplete="off" />
        <button type="submit" className="btn btn--primary">Buscar</button>
      </form>
      <div className="results-bar" aria-live="polite">
        {results.isSuccess && <p><strong>{results.data.length}</strong> {results.data.length === 1 ? 'persona' : 'personas'}</p>}
      </div>
      {results.isPending ? (
        <Spinner />
      ) : results.isError ? (
        <ErrorState error={results.error} onRetry={() => results.refetch()} />
      ) : results.data.length ? (
        <ul className="people">
          {results.data.map((p) => <PersonRow key={p.uid} uid={p.uid} />)}
        </ul>
      ) : (
        <EmptyState title="No encontramos a nadie">
          <p>Probá con el comienzo del nombre o del alias.</p>
        </EmptyState>
      )}
    </div>
  )
}
