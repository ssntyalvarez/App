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
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase.js'

export const MAX_REVIEW_LENGTH = 2000
export const MIN_REVIEW_LENGTH = 10
export const MAX_HOURS = 20000

// “12 h jugadas”, como en Steam. Las reseñas anteriores al cambio pueden no tener horas.
export function formatHours(hours) {
  if (hours == null) return null
  return `${hours.toLocaleString('es-AR')} h jugadas`
}

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
// average() con filtro necesita el índice compuesto (gameId, score) de firestore.indexes.json;
// si todavía no se creó en el proyecto, se calcula leyendo las reseñas del juego.
export async function getCommunityStats(gameId) {
  try {
    const snap = await getAggregateFromServer(
      query(collection(db, 'reviews'), where('gameId', '==', String(gameId))),
      { votes: count(), avg: average('score') },
    )
    const { votes, avg } = snap.data()
    return { votes, avg: votes ? avg : null }
  } catch (err) {
    if (err?.code !== 'failed-precondition') throw err
    return statsFromReviews(await listGameReviews(gameId))
  }
}

export function statsFromReviews(reviews) {
  if (!reviews.length) return { votes: 0, avg: null }
  return { votes: reviews.length, avg: reviews.reduce((s, r) => s + r.score, 0) / reviews.length }
}

// Una opinión, como en Steam: tiempo de juego, puntuación y reseña escrita.
export function validateReview({ score, text, hours }) {
  const errors = {}
  if (hours === '' || hours == null) errors.hours = 'Indicá cuántas horas lo jugaste.'
  else if (!/^\d+$/.test(String(hours)) || Number(hours) > MAX_HOURS) {
    errors.hours = `Ingresá un número entero de horas, entre 0 y ${MAX_HOURS.toLocaleString('es-AR')}.`
  }
  if (!Number.isInteger(score) || score < 0 || score > 10) errors.score = 'Elegí una puntuación de 0 a 10.'
  const len = text.trim().length
  if (len < MIN_REVIEW_LENGTH) errors.text = `Escribí tu reseña (al menos ${MIN_REVIEW_LENGTH} caracteres).`
  else if (len > MAX_REVIEW_LENGTH) errors.text = `Máximo ${MAX_REVIEW_LENGTH} caracteres.`
  return errors
}

export async function saveReview({ uid, game, score, text, hours, existing }) {
  const ref = doc(db, 'reviews', reviewId(game.id, uid))
  const snapshot = {
    gameName: game.name,
    gameSlug: game.slug ?? '',
    gameImage: game.image ?? null,
    score,
    text: text.trim(),
    playtimeHours: Number(hours),
    updatedAt: serverTimestamp(),
  }
  if (existing) {
    await updateDoc(ref, snapshot)
  } else {
    await setDoc(ref, { uid, gameId: String(game.id), createdAt: serverTimestamp(), ...snapshot })
  }
}

export async function deleteReview(gameId, uid) {
  const id = reviewId(gameId, uid)
  await deleteDoc(doc(db, 'reviews', id))
  // Los “Me sirvió” de la reseña se borran con ella (si falla, quedan sin efecto: nadie los lee).
  try {
    const votes = await getDocs(query(collection(db, 'helpful'), where('reviewId', '==', id)))
    if (!votes.empty) {
      const batch = writeBatch(db)
      votes.docs.forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  } catch {
    // Sin permiso o sin conexión: no afecta a la eliminación de la reseña.
  }
}

// ---------- Actividad de las personas que seguís ----------

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

// Firestore admite hasta 30 valores en `in`: se consulta por tandas y se ordena acá.
export async function listFollowingReviews(following, max = 6) {
  if (!following.length) return []
  const snaps = await Promise.all(
    chunks(following.slice(0, 90), 30).map((uids) => getDocs(query(collection(db, 'reviews'), where('uid', 'in', uids)))),
  )
  return snaps.flatMap(fromSnap).sort(byUpdatedDesc).slice(0, max)
}

// ---------- “Me sirvió” ----------
// helpful/{reviewId}_{uid} → { reviewId, uid, author, gameId, createdAt }

// Devuelve { [reviewId]: [uid, …] } con quiénes marcaron cada reseña como útil.
export async function listHelpful(reviewIds) {
  const votes = {}
  if (!reviewIds.length) return votes
  const snaps = await Promise.all(
    chunks(reviewIds, 30).map((ids) => getDocs(query(collection(db, 'helpful'), where('reviewId', 'in', ids)))),
  )
  snaps.forEach((snap) =>
    snap.docs.forEach((d) => {
      const { reviewId: id, uid } = d.data()
      ;(votes[id] ??= []).push(uid)
    }),
  )
  return votes
}

export async function setHelpful({ review, uid, value }) {
  const ref = doc(db, 'helpful', `${review.id}_${uid}`)
  if (!value) return deleteDoc(ref)
  return setDoc(ref, { reviewId: review.id, uid, author: review.uid, gameId: review.gameId, createdAt: serverTimestamp() })
}

// Las más útiles primero; a igual cantidad, las más recientes.
export function sortByHelpful(reviews, votes = {}) {
  return [...reviews].sort((a, b) => (votes[b.id]?.length ?? 0) - (votes[a.id]?.length ?? 0) || byUpdatedDesc(a, b))
}
