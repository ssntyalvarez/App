import { Link } from 'react-router'
import { EmptyState } from '../components/States.jsx'

export function NotFound() {
  return (
    <div className="page container">
      <EmptyState title="Página no encontrada">
        <p>El enlace no existe o cambió de lugar.</p>
        <Link to="/" className="btn btn--primary">Volver al inicio</Link>
      </EmptyState>
    </div>
  )
}

export function RouteError() {
  return (
    <div className="page container">
      <EmptyState title="Algo salió mal">
        <p>Ocurrió un error inesperado al mostrar esta página.</p>
        <a href="/" className="btn btn--primary">Recargar Checkpoint</a>
      </EmptyState>
    </div>
  )
}
