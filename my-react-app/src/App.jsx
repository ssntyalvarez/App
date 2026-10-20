import { createBrowserRouter } from 'react-router'
import Layout from './components/Layout.jsx'
import { Login, Register, Welcome } from './pages/Auth.jsx'
import Catalog from './pages/Catalog.jsx'
import { NotFound, RouteError } from './pages/Fallbacks.jsx'
import GameDetail from './pages/GameDetail.jsx'
import Home from './pages/Home.jsx'
import Profile from './pages/Profile.jsx'
import ProfileEdit from './pages/ProfileEdit.jsx'

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
