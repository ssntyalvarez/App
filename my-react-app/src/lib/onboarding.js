// Estado del tutorial de primeros pasos. Es una preferencia de interfaz por usuario,
// así que vive en el navegador (localStorage); las tareas en sí se calculan con datos reales.
const key = (uid) => `checkpoint:tutorial:${uid}`

export function getTourStatus(uid) {
  try {
    return localStorage.getItem(key(uid)) // 'pending' | 'skipped' | 'finished' | null
  } catch {
    return null
  }
}

const EVENT = 'checkpoint:tutorial'

export function setTourStatus(uid, status) {
  try {
    localStorage.setItem(key(uid), status)
  } catch {
    // Sin almacenamiento disponible el tutorial simplemente no se recuerda.
  }
  window.dispatchEvent(new Event(EVENT))
}

// Suscripción para useSyncExternalStore: avisa cuando cambia el estado guardado.
export function subscribeTour(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

// Se llama al crear la cuenta: el tutorial se muestra una vez, pantalla por pantalla.
export const markTourPending = (uid) => setTourStatus(uid, 'pending')

export const TASKS = [
  {
    id: 'account',
    title: 'Creá tu cuenta o ingresá',
    description: 'Con una cuenta podés puntuar, opinar y armar tu perfil.',
    route: '/registro',
  },
  {
    id: 'profile',
    title: 'Personalizá tu perfil',
    description: 'Sumá una foto y una bio corta para que la comunidad te reconozca.',
    route: '/ajustes/perfil',
    target: () => 'perfil',
    hint: () => 'Tocá tu foto para cambiarla o escribí tu biografía, y después “Guardar cambios”.',
  },
  {
    id: 'favorites',
    title: 'Agregá tus juegos favoritos',
    description: 'Elegí los juegos que te gustan: se muestran en tu perfil y podés destacar hasta 4.',
    route: '/ajustes/perfil#favoritos',
    target: () => 'favoritos',
    hint: () => 'Buscá un juego por su nombre y tocá “Agregar”.',
  },
  {
    id: 'review',
    title: 'Opiná sobre un juego',
    description: 'Contá cuántas horas lo jugaste, ponele una nota de 0 a 10 y escribí tu reseña.',
    route: '/juegos',
    target: (path) => (path.startsWith('/juego/') ? 'opinion' : 'juego'),
    hint: (path) =>
      path.startsWith('/juego/')
        ? 'Completá las horas, tu nota y tu reseña, y tocá “Publicar opinión”.'
        : 'Elegí un juego que hayas jugado.',
  },
]

// Qué tareas están hechas, según los datos reales de la cuenta.
export function taskStatus({ user, profile, libraryCount, reviewCount }) {
  return {
    account: Boolean(user),
    profile: Boolean(profile?.bio || profile?.avatar),
    favorites: libraryCount > 0,
    review: reviewCount > 0,
  }
}
