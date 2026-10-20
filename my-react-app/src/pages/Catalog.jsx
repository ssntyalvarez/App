import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import GameCard from '../components/GameCard.jsx'
import { CardSkeletons, EmptyState, ErrorState, Spinner } from '../components/States.jsx'
import { useDebouncedValue, useDocumentTitle, useGenres, useInfiniteGames, usePlatforms } from '../lib/hooks.js'
import { ORDER_OPTIONS } from '../lib/rawg.js'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 1980 + 1 }, (_, i) => CURRENT_YEAR + 1 - i)

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  useDocumentTitle(params.get('q') ? `“${params.get('q')}” en el catálogo` : 'Catálogo')
  // Se parte de la URL vigente al momento del evento: las navegaciones son transiciones
  // y un cierre con parámetros viejos podría restaurar un filtro ya limpiado.
  const updateParams = (mutate, options) => {
    const next = new URLSearchParams(window.location.search)
    mutate(next)
    setParams(next, options)
  }
  const q = params.get('q') ?? ''
  const genre = params.get('genero') ?? ''
  const platform = params.get('plataforma') ?? ''
  const year = params.get('anio') ?? ''
  const ordering = params.get('orden') ?? ''

  // El texto se escribe en estado local y se aplica a la URL con una demora breve.
  const [text, setText] = useState(q)
  const debounced = useDebouncedValue(text, 450)

  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setText(q)
  }
  // Solo reacciona a cambios del texto con demora, no a cambios de la URL.
  useEffect(() => {
    const value = debounced.trim()
    if (value === (new URLSearchParams(window.location.search).get('q') ?? '')) return
    updateParams((next) => {
      if (value) next.set('q', value)
      else next.delete('q')
    }, { replace: true })
  }, [debounced]) // oxlint-disable-line react-hooks/exhaustive-deps

  const setParam = (key, value) =>
    updateParams((next) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })

  const genres = useGenres()
  const platforms = usePlatforms()
  const games = useInfiniteGames({ search: q, genre, platform, year, ordering })

  const results = games.data?.pages.flatMap((p) => p.results) ?? []
  const total = games.data?.pages[0]?.count ?? 0
  const hasFilters = Boolean(q || genre || platform || year || ordering)

  return (
    <div className="page container">
      <header className="page-head">
        <p className="eyebrow">Catálogo</p>
        <h1>Explorá juegos</h1>
        <p className="page-head__lead">
          Buscá por nombre, filtrá por género, plataforma o año y compará la nota de Metacritic con la de la comunidad.
        </p>
      </header>

      <section className="filters" aria-label="Filtros del catálogo">
        <div className="field field--search">
          <label htmlFor="catalog-search">Buscar por nombre</label>
          <input
            id="catalog-search"
            type="search"
            value={text}
            placeholder="Ej.: Hollow Knight"
            onChange={(e) => setText(e.target.value)}
            maxLength={80}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="f-genre">Género</label>
          <select id="f-genre" value={genre} onChange={(e) => setParam('genero', e.target.value)} disabled={!genres.data}>
            <option value="">Todos</option>
            {genres.data?.results.map((g) => (
              <option key={g.slug} value={g.slug}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-platform">Plataforma</label>
          <select
            id="f-platform"
            value={platform}
            onChange={(e) => setParam('plataforma', e.target.value)}
            disabled={!platforms.data}
          >
            <option value="">Todas</option>
            {platforms.data?.results.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-year">Año</label>
          <select id="f-year" value={year} onChange={(e) => setParam('anio', e.target.value)}>
            <option value="">Todos</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-order">Ordenar por</label>
          <select id="f-order" value={ordering} onChange={(e) => setParam('orden', e.target.value)}>
            {ORDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn--ghost filters__clear"
          onClick={() => {
            setText('')
            setParams({})
          }}
          disabled={!hasFilters && !text}
        >
          Limpiar filtros
        </button>
      </section>

      <div className="results-bar" aria-live="polite">
        {games.isSuccess && (
          <p>
            <strong>{total.toLocaleString('es-AR')}</strong> {total === 1 ? 'juego' : 'juegos'}
            {ordering === '-metacritic' && <span className="muted"> · solo juegos con nota de Metacritic</span>}
          </p>
        )}
        {games.isFetching && !games.isFetchingNextPage && games.isSuccess && <Spinner label="Actualizando…" />}
      </div>

      {games.isPending && <CardSkeletons />}
      {games.isError && <ErrorState error={games.error} onRetry={() => games.refetch()} />}
      {games.isSuccess && results.length === 0 && (
        <EmptyState title="No encontramos juegos con esos criterios">
          <p>Probá con otro nombre o quitá algún filtro.</p>
        </EmptyState>
      )}
      {results.length > 0 && (
        <div className="game-grid">
          {results.map((g, i) => (
            <GameCard key={`${g.id}-${i}`} game={g} eager={i < 4} />
          ))}
        </div>
      )}

      {games.hasNextPage && (
        <div className="load-more">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => games.fetchNextPage()}
            disabled={games.isFetchingNextPage}
          >
            {games.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
      {games.isFetchNextPageError && (
        <p className="form-error" role="alert">No se pudieron cargar más juegos. Intentá de nuevo.</p>
      )}
    </div>
  )
}
