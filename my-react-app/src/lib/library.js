// Biblioteca personal: libraries/{uid}/games/{gameId}.
// No guarda puntuaciones: la nota personal se toma siempre de la reseña del usuario.
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'

export const STATUSES = [
  { value: 'want', label: 'Quiero jugar' },
  { value: 'playing', label: 'Jugando' },
  { value: 'completed', label: 'Completado' },
  { value: 'abandoned', label: 'Abandonado' },
]

export const statusLabel = (value) => STATUSES.find((s) => s.value === value)?.label ?? value

export const MAX_FEATURED = 4

const entryRef = (uid, gameId) => doc(db, 'libraries', uid, 'games', String(gameId))

export async function listLibrary(uid) {
  const snap = await getDocs(collection(db, 'libraries', uid, 'games'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0))
}

export async function addToLibrary(uid, game, status = 'want') {
  await setDoc(entryRef(uid, game.id), {
    gameId: String(game.id),
    name: game.name,
    slug: game.slug ?? '',
    image: game.image ?? null,
    released: game.released ?? null,
    status,
    favorite: false,
    finishedAt: null,
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// Cambiar a un estado distinto de “Completado” borra la fecha de finalización.
export async function updateLibraryEntry(uid, gameId, changes) {
  const next = { ...changes, updatedAt: serverTimestamp() }
  if (changes.status && changes.status !== 'completed') next.finishedAt = null
  await updateDoc(entryRef(uid, gameId), next)
}

// Quitar un juego también lo saca de los destacados del perfil, en la misma operación.
export async function removeFromLibrary(uid, gameId, profile) {
  const featured = profile?.featured ?? []
  if (!featured.includes(String(gameId))) {
    await deleteDoc(entryRef(uid, gameId))
    return
  }
  const batch = writeBatch(db)
  batch.delete(entryRef(uid, gameId))
  batch.update(doc(db, 'users', uid), {
    featured: featured.filter((id) => id !== String(gameId)),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

// Marcar o desmarcar favorito; al desmarcar, deja de estar destacado.
export async function setFavorite(uid, gameId, favorite, profile) {
  const featured = profile?.featured ?? []
  const batch = writeBatch(db)
  batch.update(entryRef(uid, gameId), { favorite, updatedAt: serverTimestamp() })
  if (!favorite && featured.includes(String(gameId))) {
    batch.update(doc(db, 'users', uid), {
      featured: featured.filter((id) => id !== String(gameId)),
      updatedAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

export async function setFeatured(uid, featured) {
  if (featured.length > MAX_FEATURED) throw new Error(`Máximo ${MAX_FEATURED} destacados.`)
  await updateDoc(doc(db, 'users', uid), { featured, updatedAt: serverTimestamp() })
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
