import { firebaseMissingVars } from '../lib/firebase.js'

export function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__ring" aria-hidden="true" />
      <span className="spinner__label">{label}</span>
    </div>
  )
}

export function CardSkeletons({ count = 8 }) {
  return (
    <div className="game-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="game-card game-card--skeleton">
          <div className="skeleton skeleton--media" />
          <div className="game-card__body">
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line skeleton--short" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, children, action, icon = 'search' }) {
  return (
    <div className="state state--empty">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="state__icon">
        {icon === 'search' ? (
          <>
            <circle cx="21" cy="21" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="m30 30 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <path d="M14 40V8M16 10h20l-5 7 5 7H16z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        )}
      </svg>
      <h3>{title}</h3>
      {children && <div className="state__text">{children}</div>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'No pudimos cargar la información' }) {
  const missingKey = error?.code === 'missing_key'
  return (
    <div className={`state state--error ${missingKey ? 'state--pending' : ''}`} role="alert">
      <h3>{missingKey ? 'Catálogo pendiente de conexión' : title}</h3>
      <p className="state__text">
        {missingKey
          ? 'El servidor todavía no tiene configurada la clave de RAWG (RAWG_API_KEY). Cuando se configure, el catálogo real aparecerá aquí.'
          : error?.message || 'Ocurrió un error inesperado.'}
      </p>
      {onRetry && !missingKey && (
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function FirebasePending() {
  return (
    <div className="state state--pending" role="note">
      <h3>Cuentas y opiniones pendientes de conexión</h3>
      <p className="state__text">
        Falta la configuración de Firebase ({firebaseMissingVars.join(', ')}). Hasta que se complete, no es posible
        registrarse ni publicar opiniones. No se muestran datos simulados.
      </p>
    </div>
  )
}
