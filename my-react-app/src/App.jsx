import { Link, createBrowserRouter } from 'react-router'
import Layout from './components/Layout.jsx'
import { EmptyState } from './components/States.jsx'
import { Login, Register, Welcome } from './pages/Auth.jsx'
import Catalog from './pages/Catalog.jsx'
import GameDetail from './pages/GameDetail.jsx'
import Home from './pages/Home.jsx'
import Profile from './pages/Profile.jsx'
import ProfileEdit from './pages/ProfileEdit.jsx'

function NotFound() {
  return (
    <div className="page container">
      <EmptyState title="Página no encontrada">
        <p>El enlace no existe o cambió de lugar.</p>
        <Link to="/" className="btn btn--primary">Volver al inicio</Link>
      </EmptyState>
    </div>
  )
}

function RouteError() {
  return (
    <div className="page container">
      <EmptyState title="Algo salió mal">
        <p>Ocurrió un error inesperado al mostrar esta página.</p>
        <a href="/" className="btn btn--primary">Recargar Checkpoint</a>
      </EmptyState>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: 'juegos', element: <Catalog /> },
      { path: 'juego/:id/:slug?', element: <GameDetail /> },
      { path: 'u/:handle', element: <Profile /> },
      { path: 'ajustes/perfil', element: <ProfileEdit /> },
      { path: 'ingresar', element: <Login /> },
      { path: 'registro', element: <Register /> },
      { path: 'bienvenida', element: <Welcome /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
