// Perfiles públicos (users/{uid}) y alias únicos (handles/{handle}).
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'

// Alias al estilo de Instagram: letras, números, guion bajo y puntos; de 3 a 30 caracteres;
// sin punto al principio, al final ni dos seguidos.
export const MAX_HANDLE = 30
export const HANDLE_PATTERN = /^(?=.{3,30}$)[a-z0-9_]+(?:\.[a-z0-9_]+)*$/

// Mientras se escribe: minúsculas, sin la @ inicial y solo con caracteres permitidos.
export function normalizeHandle(value) {
  return value
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, MAX_HANDLE)
}

export const MAX_BIO = 160

export function validateProfileFields({ displayName, handle, bio = '' }) {
  const errors = {}
  const name = displayName.trim()
  if (!name) errors.displayName = 'Ingresá un nombre visible.'
  else if (name.length > 40) errors.displayName = 'Máximo 40 caracteres.'
  if (!HANDLE_PATTERN.test(handle)) {
    errors.handle = 'Entre 3 y 30 caracteres: letras, números, guion bajo o punto (sin punto al principio, al final ni dos seguidos).'
  }
  if (bio.length > MAX_BIO) errors.bio = `Máximo ${MAX_BIO} caracteres.`
  return errors
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { uid, ...snap.data() } : null
}

export async function getUidByHandle(handle) {
  const snap = await getDoc(doc(db, 'handles', handle))
  return snap.exists() ? snap.data().uid : null
}

export async function getProfileByHandle(handle) {
  const uid = await getUidByHandle(handle)
  if (!uid) return null
  const profile = await getProfile(uid)
  // Un alias liberado podría apuntar a un perfil que ya usa otro.
  return profile && profile.handle === handle ? profile : null
}

export async function createProfile(uid, { displayName, handle }) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'handles', handle), { uid })
  batch.set(doc(db, 'users', uid), {
    displayName: displayName.trim(),
    handle,
    bio: '',
    avatar: '',
    coverUrl: '',
    featured: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

export async function updateProfile(uid, current, changes) {
  const batch = writeBatch(db)
  const next = { ...changes, updatedAt: serverTimestamp() }
  if (changes.handle && changes.handle !== current.handle) {
    batch.set(doc(db, 'handles', changes.handle), { uid })
    batch.delete(doc(db, 'handles', current.handle))
  }
  batch.update(doc(db, 'users', uid), next)
  await batch.commit()
}

// Traduce errores de Firestore a mensajes comprensibles.
export function firestoreMessage(err, fallback = 'No se pudo guardar. Intentá de nuevo.') {
  switch (err?.code) {
    case 'permission-denied':
      return 'Permiso denegado. Revisá los datos o volvé a iniciar sesión.'
    case 'unavailable':
      return 'Sin conexión con la base de datos. Verificá tu conexión.'
    case 'not-found':
      return 'El registro ya no existe.'
    default:
      return fallback
  }
}
