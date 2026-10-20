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

## Iteración 2 — Mejora de funciones: perfiles y biblioteca

**Fecha:** 20/10/2026 · **Commits:** `fe9727a` (avance visible) y el cierre de la iteración 2.

### Cambios
- **Biblioteca personal** (`libraries/{uid}/games/{gameId}`): agregar desde la ficha con estado *Quiero jugar*, *Jugando*, *Completado* o *Abandonado*; cambiar estado; fecha de finalización opcional (solo para completados, sin fechas futuras); quitar; favoritos.
- **Destacados:** hasta 4 favoritos destacados en el perfil (`users.featured`). Quitar un juego o desmarcar el favorito lo saca de destacados en la misma escritura (`writeBatch`).
- **Perfil público** `/u/<alias>`: portada, avatar, nombre, alias, biografía, botón “Compartir perfil” (copia el enlace o usa el menú de compartir del celular), estadísticas reales (completados, reseñas, promedio de sus notas, juegos en biblioteca), destacados, grilla con filtros por estado y pestaña de reseñas.
- **Tres puntuaciones diferenciadas:** Metacritic (cuadrado 0–100), Comunidad (círculo 0–10 con votos) y nota personal (etiqueta “x/10” o “Sin puntuar”).
- **Fuente única de la nota personal:** la biblioteca no guarda puntuación; la grilla del perfil, los destacados y la ficha leen la reseña del usuario. Marcar “Completado” no crea una puntuación (las reglas incluso rechazan un campo `score` en la biblioteca).
- **Editar perfil:** nombre, alias (con liberación del alias anterior), biografía de 160 caracteres, avatar y portada, con vista previa.
- **Imágenes sin facturación:** Firebase Storage requiere el plan Blaze, así que no se usó. El avatar se recorta y comprime en el navegador a 192 px (data URL de hasta 80 000 caracteres, validada por las reglas) y la portada se elige entre imágenes de RAWG (de la biblioteca o de una búsqueda).
- **Actualización optimista** en estado y favoritos: la interfaz responde al instante y se revierte si Firestore rechaza el cambio.

### Pruebas realizadas
| Prueba | Resultado |
| --- | --- |
| `npm run lint` / `npm run build` | Sin advertencias / correcto |
| `npm test` (proxy de RAWG) | 15/15 |
| `npm run test:rules` — se agregaron perfil personalizable (bio, avatar, portada, ≤ 4 destacados) y biblioteca (solo el dueño escribe, estados válidos, fecha coherente, sin puntuación) | 22/22 |
| `npm run test:e2e` — se agregaron: estados + fecha + favoritos + destacados + nota sincronizada entre ficha, reseña y perfil; máximo de 4 destacados; edición de perfil con avatar subido y portada; enlace copiado; correo ausente del perfil público; visitante sin controles; perfil en celular sin desbordes | 15/15 |

### Evidencias
| Perfil (computadora) | Perfil (celular) | Editar perfil |
| --- | --- | --- |
| ![Perfil](evidencias/iteracion-2/06-perfil-desktop.png) | ![Perfil celular](evidencias/iteracion-2/06-perfil-mobile.png) | ![Editar perfil](evidencias/iteracion-2/05-editar-perfil-desktop.png) |

| Ficha con biblioteca (celular) |
| --- |
| ![Ficha celular](evidencias/iteracion-2/04-ficha-mobile.png) |

### Dificultades y soluciones
1. **Radio “controlado” que no cambiaba.** La prueba de biblioteca falló con “Clicking the checkbox did not change its state”: el estado marcado dependía de la respuesta de Firestore. Se agregó actualización optimista en la caché de React Query con reversión ante error.
2. **Formato de fechas.** La prueba esperaba “14 mar 2026”, pero `Intl` en `es-AR` produce “14 de mar de 2026”. Se ajustó la prueba al formato real.
3. **Revisión visual de las capturas:** en celular las tarjetas de biblioteca ocupaban una columna enorme (se pasó a dos columnas); en “Editar perfil”, el campo Alias quedaba desalineado por su texto de ayuda (`align-content: start`); en la ficha en celular, la biblioteca quedaba debajo de las capturas (se subió junto a las puntuaciones).
4. **Avatar sin Storage.** Se descartó Firebase Storage por requerir facturación y se optó por compresión en el navegador con límite validado en las reglas.

### Uso de IA
Instrucción representativa: “Diferenciá claramente la puntuación personal de la nota de Metacritic y del promedio de la comunidad… Marcar un juego como completado no debe crear una puntuación automáticamente… Evitá duplicar opiniones o generar valores contradictorios.” A partir de esto se decidió no guardar la nota en la biblioteca y derivarla siempre de la reseña.

---

## Pendiente de conexión (al cierre de la iteración 1)
- Crear el proyecto de Firebase, habilitar correo/contraseña, crear Firestore y publicar `firestore.rules`.
- Obtener la clave de RAWG.
- Publicar en Vercel (requiere autorización del responsable del proyecto) y repetir las pruebas sobre la URL publicada.
