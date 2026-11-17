# Informe · Checkpoint

**TP2 · Desarrollo Frontend II**. Aplicación en React con IA, Firebase y despliegue en Vercel.

| | |
| --- | --- |
| Integrante | Santiago Alvarez Granato · L.U. 1209881 |
| Aplicación publicada | https://app-theta-ten-t7mx3z64op.vercel.app/ |
| Repositorio | https://github.com/ssntyalvarez/App |
| Bitácora del proceso | [docs/BITACORA.md](BITACORA.md) |

![Checkpoint, inicio](evidencias/final/inicio-desktop-pantalla.jpg)

## 1. Idea y público

**Checkpoint** es una red social para jugadores, inspirada en Metacritic y Steam. Sirve para **descubrir videojuegos, comparar la nota de la crítica con la de la comunidad y llevar un registro propio** de lo que jugás.

- **Necesidad que resuelve:** antes de comprar o jugar algo, mucha gente mira la nota de la crítica, pero esa nota no siempre coincide con la de los jugadores. Checkpoint muestra las dos por separado y suma las horas que jugó cada persona, para darle contexto a cada opinión.
- **Público:** jugadores que buscan recomendaciones, que quieren una página propia para mostrar sus gustos (favoritos y reseñas) y que quieren encontrar gente con gustos parecidos.
- **La vuelta de tuerca:** además de guardar opiniones, la app tiene una parte social (seguir, amigos y chat), niveles que suben al opinar y un tutorial de primeros pasos.

## 2. Funciones implementadas

| Área | Funciones |
| --- | --- |
| Catálogo | Más de 500.000 juegos de RAWG. Búsqueda, filtros (género, plataforma, año o década), orden, “Cargar más” y ficha con descripción, capturas, plataformas y lanzamiento. |
| Puntuaciones | Nota de Metacritic (0 a 100, por plataforma), promedio de la Comunidad Checkpoint (0 a 10, con votos y distribución) y nota personal. |
| Cuentas | Registro, ingreso y cierre de sesión con Firebase Authentication. Alias único estilo Instagram y tutorial de primeros pasos. |
| Opiniones | Crear, editar y eliminar una opinión por juego, con horas jugadas, nota de 0 a 10 y reseña. Se mantienen al recargar. |
| Perfil | Página pública `/u/alias` con foto, biografía, nivel, seguidores, seguidos, favoritos destacados, biblioteca y reseñas. |
| Biblioteca | Juegos favoritos, con hasta 4 destacados en el perfil. |
| Social | Seguir (si es mutuo, son amigos), sugerencias de amigos de amigos, buscador de personas y chat 1 a 1 en tiempo real en ventanas flotantes. |
| Configuración | Perfil, Privacidad (quién puede escribirte y si se ven los seguidores y las horas) y Cuenta (correo privado y cambio de contraseña). |
| Niveles | XP por cada juego opinado y un anillo de color según el nivel, como en Steam. |
| Experiencia de uso | Validaciones, estados de carga y de error, avisos de éxito, diseño para computadora y celular, navegación con teclado y auditoría de accesibilidad. |

## 3. Información guardada en Firebase

Se usan **Firebase Authentication** (correo y contraseña) y **Cloud Firestore**. Las contraseñas las maneja Google, y el correo nunca se guarda en Firestore.

| Colección | Qué guarda | Quién puede escribir |
| --- | --- | --- |
| `users/{uid}` | Perfil público con nombre, alias, bio, avatar, destacados y configuración de privacidad | Solo el dueño |
| `handles/{alias}` | A qué cuenta pertenece cada alias (así no se repiten) | Solo el dueño |
| `reviews/{juego}_{uid}` | Opinión con horas jugadas, nota de 0 a 10, reseña y datos básicos del juego | Solo el autor |
| `libraries/{uid}/games/{juego}` | Juegos favoritos | Solo el dueño |
| `follows/{seguidor}_{seguido}` | Quién sigue a quién | Solo el seguidor |
| `chats/{a}_{b}/messages` | Conversaciones 1 a 1 | Solo las dos personas del chat (también para leer) |

**Reglas de seguridad** (`my-react-app/firestore.rules`). Todo lo público se puede leer, pero cada persona solo modifica lo suyo. Las reglas validan tipos, rangos y campos permitidos. La nota tiene que ser un entero de 0 a 10, la reseña tiene que tener entre 10 y 2000 caracteres, no se aceptan campos de correo y el alias tiene que tener un formato válido. Además, el alias se puede cambiar una vez por semana y el chat respeta la opción “quién puede escribirme”. Hay **32 pruebas automáticas** de las reglas en el emulador de Firestore.

## 4. Dónde se conecta Firebase y cómo se guardan los datos (para la demostración)

- **Configuración:** `my-react-app/src/lib/firebase.js` lee las variables `VITE_FIREBASE_*` con `import.meta.env` e inicializa `auth` y `db`. En Vercel, las variables se cargan en *Settings → Environment Variables*.
- **Sesión:** `src/context/AuthContext.jsx` maneja el registro, el ingreso, el cierre de sesión y el perfil en tiempo real con `onSnapshot`.
- **Consultar:** `listGameReviews` y `getCommunityStats` en `src/lib/reviews.js`, `listLibrary` en `src/lib/library.js` y `getConnections` en `src/lib/social.js`.
- **Agregar:** `saveReview` (`setDoc`), `addToLibrary`, `follow` y `sendMessage`.
- **Modificar:** `saveReview` sobre una reseña que ya existe (`updateDoc`), `updateProfile` y `setFeatured`.
- **Eliminar:** `deleteReview`, `removeFromLibrary` y `unfollow`.

**Recorrido para la demostración:** crear una cuenta → opinar sobre un juego → mostrar el documento en Firestore → Datos → editar la nota → recargar la página → eliminar la opinión y ver que desaparece de la base.

## 5. Herramientas de IA utilizadas

- **Claude Code** (Anthropic), un asistente de programación que trabajó sobre el repositorio. Escribió el código, corrió lint, build y las pruebas, sacó capturas de la interfaz para revisarla y subió los cambios con pull requests.
- **rembg** (modelo de segmentación `isnet-general-use`), para recortar el fondo de las imágenes de personajes.

**Ejemplos representativos de instrucciones**
1. “Quiero desarrollar una aplicación web de videojuegos llamada provisionalmente Checkpoint, inspirada en la función de Metacritic…”
2. “Protegé la clave de RAWG en una función de servidor compatible con Vercel. Limitá sus rutas y parámetros…”
3. “No inventes puntuaciones, usuarios, reseñas ni cantidades de votos.”
4. “Si hacés una opinión… como hace Steam: aclarar el tiempo de juego, una puntuación y una descripción.”
5. “Que haya una progresión de niveles o XP para subir de nivel según cuántos juegos opinás.”
6. “Jerarquía no clara, hay mucho ruido… no TODO se resuelve con cards… mirá cómo lo resuelven Twitter, Twitch, Instagram, que es MUY LIMPIO.”

**Elaboración propia a partir del trabajo con IA.** La idea, el alcance y las decisiones de diseño fueron del autor. La interfaz no se quedó con la primera propuesta de la IA. Pasó por cinco versiones y cada una se revisó en la app publicada. En esas revisiones se sacaron elementos genéricos (tarjetas, píldoras, tipografía monoespaciada), se reordenó el perfil y se cambió la forma de la biblioteca. El detalle, con capturas de antes y después, está en la [bitácora](BITACORA.md).

## 6. Dificultades técnicas y cómo se resolvieron

Para cada caso se indica el error o síntoma, la causa y la solución en el código.

| Síntoma o error | Causa técnica | Solución |
| --- | --- | --- |
| En las pruebas de reglas, `TypeError: this.getApp(...).firestore is not a function` | `npm ls @firebase/app` mostró dos copias (0.16.2 y 0.16.3). `@firebase/rules-unit-testing` registraba Firestore en otra instancia de `FirebaseApp`. | `firebase` fijado en `^12` (la versión que pide `rules-unit-testing`) y `overrides` de `@firebase/app` en `package.json` para dejar una sola copia. |
| En Firebase real, `FAILED_PRECONDITION: The query requires an index` (en el emulador andaba) | La agregación `average('score')` con `where('gameId', '==', …)` necesita un índice compuesto, y el emulador no revisa los índices. | Índice declarado en `firestore.indexes.json`. Si la agregación falla, `getCommunityStats` (`src/lib/reviews.js`) calcula el promedio con `statsFromReviews(listGameReviews())`. |
| Con RAWG caído (Cloudflare 522), la ficha se quedaba cargando | El `fetch` del servidor no tenía tiempo límite, y React Query reintentaba una consulta que nunca respondía. | `AbortSignal.timeout(10000)` en `server/rawg.js`. Si se corta, devuelve `504` con `code: 'upstream_timeout'`. En `main.jsx`, React Query no reintenta ese código y la interfaz muestra el error con el botón “Reintentar”. |
| Imágenes de RAWG con error 404 | El CDN de RAWG solo acepta algunos anchos en `/media/resize/{w}/-/`, y 960 no es uno de ellos. | `rawgImage()` (`src/lib/format.js`) elige el menor ancho válido de `RAWG_WIDTHS = [420, 640, 1280, 1920]`. Si igual falla, `onError` en `GameImage` vuelve a la URL original. |
| Proteger `RAWG_API_KEY` sin abrir un proxy | Una ruta como `/api/rawg?url=…` dejaría usar la clave para cualquier consulta. | Función `GET` en `api/rawg.js` con lista blanca de recursos (`games`, `game`, `screenshots`, `genres`, `platforms`) y de parámetros, recorte de campos y `Cache-Control: s-maxage`. La clave solo se lee con `process.env` en el servidor. |
| Vercel publicaba una función de más | Vercel publica como función cada archivo de la carpeta `api/`, incluido el módulo auxiliar `api/_lib/rawg.js`. | La lógica pasó a `server/rawg.js` y `api/rawg.js` solo la importa. En desarrollo, `vite.config.js` usa el mismo módulo como middleware. |
| El panel Social medía 68 px de alto en vez de ocupar la pantalla | El `backdrop-filter` del encabezado crea un *containing block* para los elementos con `position: fixed`, así que el panel tomaba la medida del header. | El panel y el chat se renderizan con `createPortal(…, document.body)`. El panel además se monta solo cuando está abierto, porque cerrado y fuera de la pantalla ensanchaba la página en celular. |
| Al limpiar un filtro, el valor anterior volvía a aparecer | Durante una transición de React Router, `useSearchParams` devolvía parámetros viejos al armar la URL nueva. | Los parámetros se arman con `window.location.search` en el momento del evento. |
| Después de registrarse no aparecía el tutorial | El estado se leía de `localStorage` antes de que `markTourPending` lo escribiera, y `useState` no se actualizaba. | El estado se lee con `useSyncExternalStore` y un evento propio que se dispara al escribir. |
| Seguidores en “…” solo en la versión publicada | La API de Firestore devolvía `PERMISSION_DENIED` porque las reglas publicadas eran de antes de `follows`, y desplegar en Vercel no las actualiza. | Reglas publicadas con `firebase deploy --only firestore:rules`. Si la consulta falla, la interfaz muestra un guion. |
| Inicio lleno de juegos “Sin nota” (por ejemplo, Crimson Desert) | RAWG devuelve `metacritic: null` para los 3.469 juegos del último año (con `metacritic=1,100` da `count: 0`). Dejó de cargar esa nota alrededor de 2023. | `Home.jsx` muestra los populares de los últimos 5 años con `metacritic: '1,100'` (132 juegos). `GameCard` usa `hideEmptyCommunity` para no mostrar “Sin votos” en el inicio. |
| En la demostración, los mensajes del chat no llegaban o daba error al enviar | Había tres fallas en `Conversation.jsx` y `sendMessage`. (1) Mientras un envío esperaba al servidor, el siguiente se cortaba en `if (sending) return` y `setText('')` borraba lo escrito. (2) Si los dos mandaban el primer mensaje a la vez, el segundo hacía `set` sobre un chat ya creado, y las reglas lo rechazan con `permission-denied` porque cambia `members` y `createdAt`. (3) Los chats solo se escuchaban (`watchChats`) con una ventana abierta, así que quien recibía no se enteraba. | Los envíos van en cola con una cadena de promesas (`useRef(Promise.resolve())`). El cuadro se vacía al enviar y el texto vuelve si falla. Si hay `permission-denied` y el chat ya existe, `sendMessage` reintenta con `update`. `ChatDockProvider` escucha los chats toda la sesión y abre la ventana cuando llega un mensaje. Hay una prueba nueva, `e2e/chat.spec.js`, con dos navegadores, que falla con el código anterior. |
| El chat tapaba el menú de cuenta | El contenedor del chat tenía `z-index` 55 y el header 40. | Contenedor del chat en `z-index: 35`. |

## 7. Verificación

- **Pruebas automáticas:** 34 unitarias, 32 de reglas de Firestore y 26 de punta a punta en navegador, con pruebas en celular y de accesibilidad.
- **Con los servicios reales:** catálogo de RAWG y proyecto real de Firebase. Se probó crear, editar, eliminar y recargar, y que otra cuenta no pueda modificar datos ajenos.
- **Publicación:** cada cambio se fusiona en `main` con un pull request, y Vercel lo publica solo.
