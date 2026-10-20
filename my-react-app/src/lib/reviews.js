// Reseñas de la comunidad Checkpoint en Cloud Firestore.
// Documento: reviews/{gameId}_{uid} → una reseña por usuario y juego.
import {
  average,
  collection,
  count,
  deleteDoc,
  doc,
  getAggregateFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase.js'

export const MAX_REVIEW_LENGTH = 2000

export const reviewId = (gameId, uid) => `${gameId}_${uid}`

const byUpdatedDesc = (a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0)

const fromSnap = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

export async function listGameReviews(gameId) {
  const snap = await getDocs(query(collection(db, 'reviews'), where('gameId', '==', String(gameId))))
  return fromSnap(snap).sort(byUpdatedDesc)
}

export async function listUserReviews(uid) {
  const snap = await getDocs(query(collection(db, 'reviews'), where('uid', '==', uid)))
  return fromSnap(snap).sort(byUpdatedDesc)
}

export async function listRecentReviews(max = 6) {
  const snap = await getDocs(query(collection(db, 'reviews'), orderBy('updatedAt', 'desc'), limit(max)))
  return fromSnap(snap)
}

// Promedio y cantidad de votos calculados por Firestore sobre las reseñas reales.
export async function getCommunityStats(gameId) {
  const snap = await getAggregateFromServer(
    query(collection(db, 'reviews'), where('gameId', '==', String(gameId))),
    { votes: count(), avg: average('score') },
  )
  const { votes, avg } = snap.data()
  return { votes, avg: votes ? avg : null }
}

export function statsFromReviews(reviews) {
  if (!reviews.length) return { votes: 0, avg: null }
  return { votes: reviews.length, avg: reviews.reduce((s, r) => s + r.score, 0) / reviews.length }
}

export function validateReview({ score, text }) {
  const errors = {}
  if (!Number.isInteger(score) || score < 0 || score > 10) errors.score = 'Elegí una puntuación de 0 a 10.'
  if (text.length > MAX_REVIEW_LENGTH) errors.text = `Máximo ${MAX_REVIEW_LENGTH} caracteres.`
  return errors
}

export async function saveReview({ uid, game, score, text, existing }) {
  const ref = doc(db, 'reviews', reviewId(game.id, uid))
  const snapshot = {
    gameName: game.name,
    gameSlug: game.slug ?? '',
    gameImage: game.image ?? null,
    score,
    text: text.trim(),
    updatedAt: serverTimestamp(),
  }
  if (existing) {
    await updateDoc(ref, snapshot)
  } else {
    await setDoc(ref, { uid, gameId: String(game.id), createdAt: serverTimestamp(), ...snapshot })
  }
}

export async function deleteReview(gameId, uid) {
  await deleteDoc(doc(db, 'reviews', reviewId(gameId, uid)))
}
