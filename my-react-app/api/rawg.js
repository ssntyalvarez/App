// Función de servidor de Vercel: GET /api/rawg?resource=...
// La lógica vive en server/rawg.js (fuera de api/ para que no se publique como otra función).
// La clave RAWG_API_KEY se configura en Vercel (sin prefijo VITE_) y nunca llega al navegador.
import { handleRawgRequest } from '../server/rawg.js'

export async function GET(request) {
  const { status, body, headers } = await handleRawgRequest(request.url, {
    apiKey: process.env.RAWG_API_KEY,
  })
  return new Response(JSON.stringify(body), { status, headers })
}
