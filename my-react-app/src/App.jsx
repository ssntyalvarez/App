import { createBrowserRouter } from 'react-router'
import Layout from './components/Layout.jsx'
import { NotFound, RouteError } from './pages/Fallbacks.jsx'
import Home from './pages/Home.jsx'

// El inicio se incluye en el paquete principal; el resto de las páginas se descarga al visitarlas.
const page = (load, name = 'default') => async () => ({ Component: (await load())[name] })

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: null,
    children: [
      { index: true, element: <Home /> },
      { path: 'juegos', lazy: page(() => import('./pages/Catalog.jsx')) },
      { path: 'juego/:id/:slug?', lazy: page(() => import('./pages/GameDetail.jsx')) },
      { path: 'u/:handle', lazy: page(() => import('./pages/Profile.jsx')) },
      { path: 'ajustes/perfil', lazy: page(() => import('./pages/ProfileEdit.jsx')) },
      { path: 'ingresar', lazy: page(() => import('./pages/Auth.jsx'), 'Login') },
      { path: 'registro', lazy: page(() => import('./pages/Auth.jsx'), 'Register') },
      { path: 'bienvenida', lazy: page(() => import('./pages/Auth.jsx'), 'Welcome') },
      { path: '*', element: <NotFound /> },
    ],
  },
])
