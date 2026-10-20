import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import { router } from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      // Errores de configuración (p. ej. falta la clave) no se reintentan.
      retry: (count, err) => !['missing_key', 'bad_param', 'not_found', 'bad_key'].includes(err?.code) && count < 2,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
