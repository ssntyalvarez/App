# Bitácora de Checkpoint

Registro del desarrollo por iteraciones: qué cambió, cómo se verificó y qué dificultades aparecieron.
Las capturas de `docs/evidencias/` las genera la prueba `e2e/evidencias.spec.js` contra los **emuladores de Firebase** y un **doble de prueba de RAWG con juegos ficticios** (“Juego de prueba …”, imágenes rotuladas “IMAGEN DE PRUEBA”). No son datos reales de RAWG ni de Metacritic: se usan porque durante el desarrollo no había una clave de RAWG ni un proyecto de Firebase configurados.

## Idea y público

- **Necesidad:** decidir qué jugar comparando la crítica (Metacritic) con la opinión de otros jugadores, y llevar registro de lo que uno juega.
- **Público:** jugadores que buscan recomendaciones y quieren una página personal para compartir sus gustos.
- **Datos en Firebase:** perfiles públicos (`users`), alias únicos (`handles`), opiniones (`reviews`) y, desde la iteración 2, bibliotecas personales.
- **Datos externos:** catálogo, imágenes y notas de Metacritic de RAWG, consultados a demanda mediante una función de servidor.

---

## Iteración 1 — Primera versión funcional

**Fecha:** 20/10/2026 · **Commits:** `d7cbc87` (primer avance visible) y el cierre de la iteración 1.

### Cambios
- Se reemplazó la pantalla de ejemplo de la plantilla (`MiPrimerComponente`, `App.css` y sus imágenes) por la estructura de Checkpoint: rutas con React Router, caché de consultas con React Query y fuentes autoalojadas (Bricolage Grotesque, Geist y Geist Mono).
- **Proxy de RAWG** (`api/rawg.js` + `api/_lib/rawg.js`): función de Vercel con lista blanca de recursos y parámetros, recorte de campos (descarta la nota de usuarios de RAWG para no confundirla con la comunidad), caché en memoria y `Cache-Control` para el CDN. El mismo código atiende `/api/rawg` en `npm run dev`.
- **Catálogo:** búsqueda con demora de 450 ms, filtros (género, plataforma, año), orden (relevancia, Metacritic, lanzamiento) y “Cargar más”. Los filtros viven en la URL, así que se pueden compartir.
- **Ficha:** imagen protagonista, panel con tres puntuaciones separadas (Metacritic con su plataforma, Comunidad Checkpoint con distribución de votos, nota personal), descripción, capturas con visor accesible y ficha técnica.
- **Cuentas y opiniones:** registro, ingreso y cierre de sesión con Firebase Auth; opiniones en `reviews/{gameId}_{uid}` (una por usuario y juego); crear, editar y eliminar; 0 es una puntuación válida; promedio calculado a partir de las opiniones reales.
- **Reglas de Firestore:** lectura pública de reseñas y perfiles; escritura solo del dueño; validación de puntuación entera 0–10, comentario ≤ 2000 caracteres y lista cerrada de campos; correo nunca guardado en Firestore.
- **Estados:** carga (esqueletos y spinners), vacío, error con reintento y “pendiente de conexión” cuando falta RAWG o Firebase.

### Pruebas realizadas
| Prueba | Resultado |
| --- | --- |
| `npm run lint` | Sin errores ni advertencias |
| `npm run build` | Correcto (aviso de chunk > 500 kB, a resolver en la iteración 3) |
| `npm test` — 15 pruebas del proxy (parámetros rechazados, clave ausente, la clave no se filtra, errores de RAWG) | 15/15 |
| `npm run test:rules` — 16 pruebas de reglas en el emulador (incluye “otro usuario no puede editar ni borrar”) | 16/16 |
| `npm run test:e2e` — 11 pruebas Playwright: búsqueda con una sola consulta, filtros, cargar más, estados vacíos, navegación, crear/recargar/editar/eliminar opinión, dos usuarios y promedio 7,5, validaciones, alias único, celular | 11/11 |

### Evidencias
| Inicio | Ficha con opinión publicada | Catálogo en celular |
| --- | --- | --- |
| ![Inicio](evidencias/iteracion-1/01-inicio-desktop.png) | ![Ficha](evidencias/iteracion-1/04-ficha-desktop.png) | ![Catálogo celular](evidencias/iteracion-1/02-catalogo-mobile.png) |

### Dificultades y soluciones
1. **Sin clave de RAWG ni proyecto de Firebase.** Se avanzó con todo lo verificable: la app muestra “pendiente de conexión” sin inventar datos; Firebase se probó con sus emuladores locales y RAWG con un doble de prueba solo dentro de las pruebas automáticas.
2. **Dos copias de `@firebase/app`.** `npm` instaló 0.16.2 (fijada por `firebase`) y 0.16.3 (pedida por otros paquetes). Las pruebas de reglas fallaban con `this.getApp(...).firestore is not a function`. Se diagnosticó con `npm ls @firebase/app` y se resolvió con `overrides` en `package.json` para usar una sola versión; el mismo problema habría roto Firestore en el navegador.
3. **`firebase@13` incompatible con `@firebase/rules-unit-testing`.** La herramienta de pruebas de reglas requiere `firebase@^12`, así que se fijó la versión 12.
4. **Filtro que “reaparecía”.** Una prueba detectó que, al elegir un filtro justo después de “Limpiar filtros”, volvía el filtro anterior: React Router procesa la navegación como transición y el manejador usaba parámetros de un render previo. Se corrigió calculando los parámetros desde `window.location` al momento del evento.
5. **Advertencias de lint de React** (`set-state-in-effect`, `only-export-components`): se movieron utilidades a `lib/` y el estado derivado se calcula durante el render en lugar de sincronizarlo con efectos.

### Uso de IA
Se trabajó con Claude Code (asistente de programación) sobre el repositorio. Instrucciones representativas:
- “Usá RAWG como fuente… protegé la clave en una función de servidor compatible con Vercel; limitá sus rutas y parámetros; evitá convertirla en un proxy abierto.”
- “Mostrá Metacritic · vía RAWG y Comunidad Checkpoint… No inventes puntuaciones, usuarios, reseñas ni cantidades de votos.”
- “Si faltan la clave de RAWG o la configuración de Firebase… no presentes datos ficticios ni almacenamiento local como servicios reales.”

El código generado se verificó con lint, build y las pruebas anteriores antes de cada commit.

---

## Pendiente de conexión (al cierre de la iteración 1)
- Crear el proyecto de Firebase, habilitar correo/contraseña, crear Firestore y publicar `firestore.rules`.
- Obtener la clave de RAWG.
- Publicar en Vercel (requiere autorización del responsable del proyecto) y repetir las pruebas sobre la URL publicada.
