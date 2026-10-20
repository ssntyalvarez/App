// Función de servidor de Vercel: GET /api/rawg?resource=...
// La clave RAWG_API_KEY se configura en Vercel (sin prefijo VITE_) y nunca llega al navegador.
import { handleRawgRequest } from './_lib/rawg.js'

export async function GET(request) {
  const { status, body, headers } = await handleRawgRequest(request.url, {
    apiKey: process.env.RAWG_API_KEY,
  })
  return new Response(JSON.stringify(body), { status, headers })
}
