# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Contexto

- **Checkpoint**: app para descubrir videojuegos (catálogo de RAWG), comparar Metacritic con la comunidad y opinar. TP2 de Desarrollo Frontend II (React + Vite + Firebase + Vercel). Interfaz y documentación en español; títulos de juegos en su idioma original.
- Todo el código está en `my-react-app/` (Root Directory de Vercel). **Ejecutá los comandos npm desde `my-react-app/`.** La raíz tiene `README.md`, este archivo y `docs/` (bitácora y evidencias).
- JavaScript (`.jsx`), sin TypeScript. npm con `package-lock.json`. Node `^20.19.0 || >=22.12.0`. Java 11+ para los emuladores.

## Comandos (desde `my-react-app/`)

```bash
npm ci               # Instalar dependencias
npm run dev          # Vite en :5173 (también sirve /api/rawg)
npm run build        # Build de producción -> dist/
npm run lint         # Oxlint
npm test             # Vitest: proxy de RAWG (tests/api)
npm run test:rules   # Reglas de Firestore en el emulador (tests/rules)
npm run test:e2e     # Playwright + emuladores Auth/Firestore (e2e/); CHROMIUM_PATH=... si hace falta
npm run emulators    # Emuladores locales (usar con VITE_USE_FIREBASE_EMULATORS=true)
```

Antes de commitear: `lint`, `build`, `test`, `test:rules` y `test:e2e`.
Capturas para la bitácora: `EVIDENCIAS=<carpeta absoluta> npx firebase emulators:exec --only auth,firestore --project demo-checkpoint "npx playwright test e2e/evidencias.spec.js"`.

## Arquitectura

- `api/rawg.js`: función de Vercel (`export function GET(request)`); la lógica está en `api/_lib/rawg.js` (lista blanca de recursos/parámetros, recorte de campos, caché). `vite.config.js` monta la misma lógica en desarrollo. `RAWG_API_KEY` solo existe en el servidor.
- `src/lib/firebase.js`: inicializa Auth y Firestore desde variables `VITE_FIREBASE_*`; exporta `firebaseReady`. Sin configuración la app sigue funcionando con estados “pendiente de conexión”.
- Firestore: `users/{uid}` (perfil público, sin correo), `handles/{handle}` → `{uid}` (alias únicos), `reviews/{gameId}_{uid}` (una opinión por usuario y juego; `score` entero 0–10, `text` ≤ 2000). El promedio de la comunidad se calcula con las opiniones reales (agregación `count/average` o la lista cargada). Reglas en `firestore.rules`, probadas en `tests/rules`.
- Datos remotos con React Query (`src/lib/hooks.js`); tras mutar opiniones usar `invalidateReviewData`.
- `firebase` fijado en `^12` (lo exige `@firebase/rules-unit-testing`) y `overrides` de `@firebase/app` para evitar copias duplicadas.
- Estilos: `src/index.css` con tokens (grafito, blanco cálido, acento lima `--lime`). Tres tipos de puntuación con formas distintas: Metacritic (cuadrado 0–100), Comunidad (círculo 0–10 + votos), Personal (etiqueta “x/10” o “Sin puntuar”).

## Reglas de trabajo

- No inventar puntuaciones, usuarios, reseñas ni votos; no mostrar la nota de usuarios de RAWG como si fuera de la comunidad.
- Pedir autorización antes de: funciones fuera del alcance acordado, servicios pagos o con facturación (p. ej. Firebase Storage/Blaze), publicar o desplegar, fusionar con `main`.
- No commitear `node_modules/`, `dist/`, `.env`, `test-results/`.
- Registrar cada iteración en `docs/BITACORA.md` con pruebas y evidencias reales.
