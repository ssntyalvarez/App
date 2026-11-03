// Biblioteca personal: libraries/{uid}/games/{gameId}.
// Son los juegos que le gustan a la persona (sus favoritos). No guarda estados ni puntuaciones:
// la nota y las horas jugadas vienen de su reseña.
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'

export const MAX_FEATURED = 4

const entryRef = (uid, gameId) => doc(db, 'libraries', uid, 'games', String(gameId))

export async function listLibrary(uid) {
  const snap = await getDocs(collection(db, 'libraries', uid, 'games'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.addedAt?.toMillis?.() ?? 0) - (a.addedAt?.toMillis?.() ?? 0))
}

export async function addToLibrary(uid, game) {
  await setDoc(entryRef(uid, game.id), {
    gameId: String(game.id),
    name: game.name,
    slug: game.slug ?? '',
    image: game.image ?? null,
    released: game.released ?? null,
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
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

export async function setFeatured(uid, featured) {
  if (featured.length > MAX_FEATURED) throw new Error(`Máximo ${MAX_FEATURED} destacados.`)
  await updateDoc(doc(db, 'users', uid), { featured, updatedAt: serverTimestamp() })
}
