// Perfiles públicos (users/{uid}) y alias únicos (handles/{handle}).
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'

export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/

export function normalizeHandle(value) {
  return value.trim().toLowerCase().replace(/^@/, '')
}

export function validateProfileFields({ displayName, handle }) {
  const errors = {}
  const name = displayName.trim()
  if (!name) errors.displayName = 'Ingresá un nombre visible.'
  else if (name.length > 40) errors.displayName = 'Máximo 40 caracteres.'
  if (!HANDLE_PATTERN.test(handle)) {
    errors.handle = 'Entre 3 y 20 caracteres: minúsculas, números o guion bajo.'
  }
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
