import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'
import { handleRawgRequest } from './api/_lib/rawg.js'

// En desarrollo, sirve /api/rawg con la misma lógica que la función de Vercel.
// RAWG_API_KEY se lee de .env sin prefijo VITE_, así que no se expone al cliente.
function rawgDevApi(apiKey) {
  return {
    name: 'checkpoint-rawg-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/rawg', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end()
          return
        }
        const url = new URL(req.originalUrl, 'http://localhost')
        const result = await handleRawgRequest(url.href, { apiKey })
        res.statusCode = result.status
        for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v)
        res.end(JSON.stringify(result.body))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      rawgDevApi(process.env.RAWG_API_KEY || env.RAWG_API_KEY),
    ],
    build: {
      rolldownOptions: {
        output: {
          // Bibliotecas en bloques propios: cambian poco y el navegador las reutiliza entre despliegues.
          codeSplitting: {
            groups: [
              { name: 'firestore', test: /node_modules[\\/]@firebase[\\/]firestore/, priority: 2 },
              { name: 'firebase', test: /node_modules[\\/]@?firebase/, priority: 1 },
              { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler|@tanstack)[\\/]/ },
            ],
          },
        },
      },
    },
  }
})
