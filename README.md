# Checkpoint

Aplicación web para **descubrir videojuegos, comparar puntuaciones y opinar**, inspirada en Metacritic. Trabajo práctico 2 de Desarrollo Frontend II (React + Vite + Firebase + Vercel).

- Catálogo real de **RAWG** (búsqueda, filtros por género, plataforma y año, orden y “Cargar más”).
- Dos puntuaciones separadas: **Metacritic · vía RAWG** (0–100) y **Comunidad Checkpoint** (promedio 0–10 de las opiniones reales de esta app, con cantidad de votos).
- Cuentas con **Firebase Authentication** (correo y contraseña) y opiniones guardadas en **Cloud Firestore**: crear, editar y eliminar, con una opinión por usuario y juego.
- **Perfiles públicos** en `/u/<alias>` con portada, avatar, biografía, estadísticas, hasta 4 juegos destacados y grilla con filtros por estado.
- **Biblioteca personal:** Quiero jugar, Jugando, Completado (con fecha opcional) y Abandonado; favoritos. La nota personal se toma siempre de la reseña del usuario.

La evolución por iteraciones, las pruebas y las dificultades están en la [bitácora](docs/BITACORA.md).

> Datos de juegos provistos por [RAWG](https://rawg.io). Las notas de Metacritic pueden variar según la plataforma o actualizarse.

## Estructura

```
.
├── README.md / CLAUDE.md
├── docs/
│   ├── BITACORA.md            # Iteraciones, pruebas y dificultades
│   └── evidencias/            # Capturas generadas por las pruebas
└── my-react-app/              # ← Root Directory en Vercel (contiene package.json)
    ├── api/
    │   ├── rawg.js            # Función de servidor de Vercel: GET /api/rawg
    │   └── _lib/rawg.js       # Lista blanca de rutas/parámetros, recorte de campos y caché
    ├── src/
    │   ├── main.jsx / App.jsx # Proveedores y rutas (React Router)
    │   ├── lib/firebase.js    # ← Conexión con Firebase (Auth + Firestore)
    │   ├── lib/reviews.js     # Operaciones de opiniones en Firestore
    │   ├── lib/profiles.js    # Perfiles públicos y alias
    │   ├── lib/library.js     # Biblioteca personal, favoritos y destacados
    │   ├── lib/image.js       # Compresión del avatar en el navegador
    │   ├── lib/rawg.js        # Cliente del proxy /api/rawg
    │   ├── lib/hooks.js       # Consultas con caché (React Query)
    │   ├── context/           # Sesión (AuthContext) y avisos (ToastContext)
    │   ├── components/        # Tarjetas, puntuaciones, formulario de opinión, etc.
    │   └── pages/             # Inicio, Catálogo, Ficha, Perfil, Ingreso/Registro
    ├── firestore.rules        # Reglas de seguridad de Firestore
    ├── firebase.json          # Configuración de reglas y emuladores
    ├── vercel.json            # Build de Vite + reescritura para rutas del SPA
    ├── tests/                 # Pruebas unitarias (proxy) y de reglas (emulador)
    ├── e2e/                   # Pruebas de punta a punta (Playwright + emuladores)
    └── .env.example
```

## Requisitos

- **Node.js** `^20.19.0` o `>=22.12.0` y npm.
- Para las pruebas con emuladores de Firebase: **Java 11+** (lo usa el emulador de Firestore).

## Instalación y desarrollo

```bash
cd my-react-app
npm ci
cp .env.example .env      # completar valores (ver abajo)
npm run dev               # http://localhost:5173
```

Sin `.env` la app igual abre y se puede recorrer: el catálogo y las cuentas muestran un aviso de **conexión pendiente**. No se muestran datos inventados.

### Variables de entorno

| Variable | Dónde se obtiene | ¿Pública? |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Firebase Console → ⚙️ Configuración del proyecto → Tus apps → App web `</>` → `firebaseConfig` | Sí (se incorpora al navegador; los permisos los controlan las reglas) |
| `RAWG_API_KEY` | [rawg.io/apidocs](https://rawg.io/apidocs) → *Get API Key* (plan gratuito, uso no comercial, requiere atribución) | **No**: solo la lee el servidor (`/api/rawg`). No lleva prefijo `VITE_` |

Reiniciá `npm run dev` después de cambiar `.env`. En desarrollo, Vite atiende `/api/rawg` con el mismo código que la función de Vercel.

### Configurar Firebase

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/) y registrar una **app web** (`</>`).
2. **Authentication → Sign-in method → Correo electrónico/contraseña: Habilitar.**
3. **Firestore Database → Crear base de datos** (edición Standard, id `(default)`, modo producción; región sugerida `southamerica-east1`).
4. Publicar las reglas: copiar `my-react-app/firestore.rules` en **Firestore → Reglas → Publicar**, o con la CLI:
   ```bash
   npx firebase login
   npx firebase deploy --only firestore:rules --project <id-del-proyecto>
   ```
   Desplegar en Vercel **no** actualiza las reglas.

No hace falta el plan Blaze ni Firebase Storage: el avatar se comprime en el navegador y se guarda dentro del perfil (máx. ~60 KB), y la portada es una imagen de RAWG.

### Qué se guarda en Firestore

| Colección | Contenido | Quién escribe |
| --- | --- | --- |
| `users/{uid}` | Perfil público: nombre, alias, bio, avatar, portada, destacados | Solo el dueño |
| `handles/{alias}` | `{ uid }` para alias únicos y URLs de perfil | Solo el dueño |
| `reviews/{gameId}_{uid}` | Puntuación 0–10, comentario y datos básicos del juego | Solo el autor |
| `libraries/{uid}/games/{gameId}` | Estado, favorito, fecha de finalización y datos básicos del juego | Solo el dueño |

Todo es de lectura pública; el correo y la contraseña quedan en Firebase Authentication y nunca se guardan en Firestore.

## Verificación

```bash
npm run lint         # Oxlint
npm run build        # Build de producción → dist/
npm test             # Pruebas unitarias del proxy de RAWG
npm run test:rules   # Reglas de Firestore en el emulador (requiere Java)
npm run test:e2e     # Playwright + emuladores de Auth y Firestore
```

- Las pruebas de punta a punta usan los **emuladores** de Firebase (no tocan el proyecto real) y reemplazan RAWG en el navegador por un **doble de prueba con juegos ficticios** (`e2e/rawg-fixture.js`).
- Si Playwright no encuentra su navegador, instalalo con `npx playwright install chromium` o indicá uno existente con `CHROMIUM_PATH=/ruta/a/chrome`.
- `npm run emulators` levanta Auth + Firestore locales; con `VITE_USE_FIREBASE_EMULATORS=true` en `.env`, `npm run dev` se conecta a ellos.

## Despliegue en Vercel

1. Importar el repositorio de GitHub en [Vercel](https://vercel.com/).
2. **Root Directory: `my-react-app`** (es la carpeta que contiene `package.json`).
3. Framework: **Vite** · Build: `npm run build` · Output: `dist` (ya definidos en `vercel.json`).
4. **Settings → Environment Variables** (Production):
   - Las cuatro `VITE_FIREBASE_*` (públicas).
   - `RAWG_API_KEY` (privada, marcala como *Sensitive*).
5. Desplegar. Si se cambian variables después, usar **Redeploy**.
6. En Firebase → Authentication → Settings → **Dominios autorizados**, agregar el dominio `*.vercel.app` asignado.

La función `api/rawg.js` solo acepta `resource=games|game|screenshots|genres|platforms` con parámetros validados, descarta todo lo demás y responde con `Cache-Control` para que el CDN de Vercel reutilice las respuestas y se ahorren consultas.
