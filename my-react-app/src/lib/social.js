// Parte social: seguir, amigos (seguimiento mutuo), amigos de amigos y chat 1 a 1.
//   follows/{seguidor}_{seguido}  → { follower, followed, createdAt }
//   chats/{uidA}_{uidB}           → { members: [a, b], via?, createdAt, updatedAt, lastText, lastSender }
//   chats/{id}/messages/{msgId}   → { sender, text, createdAt }
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase.js'

export const MAX_MESSAGE = 1000

// Configuración de privacidad por defecto (las cuentas siempre son públicas).
export const DEFAULT_SETTINGS = { messages: 'everyone', showFollows: true, showHours: true }

export const MESSAGE_OPTIONS = [
  { value: 'everyone', label: 'Cualquier persona' },
  { value: 'fof', label: 'Amigos y amigos de amigos' },
  { value: 'friends', label: 'Solo amigos' },
  { value: 'nobody', label: 'Nadie' },
]

export const settingsOf = (profile) => ({ ...DEFAULT_SETTINGS, ...(profile?.settings ?? {}) })

const followId = (from, to) => `${from}_${to}`
export const chatId = (a, b) => [a, b].sort().join('_')

// ---------- Seguir ----------

export async function follow(me, other) {
  await setDoc(doc(db, 'follows', followId(me, other)), { follower: me, followed: other, createdAt: serverTimestamp() })
}

export async function unfollow(me, other) {
  await deleteDoc(doc(db, 'follows', followId(me, other)))
}

export async function listFollowing(uid) {
  const snap = await getDocs(query(collection(db, 'follows'), where('follower', '==', uid)))
  return snap.docs.map((d) => d.data().followed)
}

export async function listFollowers(uid) {
  const snap = await getDocs(query(collection(db, 'follows'), where('followed', '==', uid)))
  return snap.docs.map((d) => d.data().follower)
}

// Seguidores, seguidos y amigos (los que se siguen mutuamente) de una persona.
export async function getConnections(uid) {
  const [following, followers] = await Promise.all([listFollowing(uid), listFollowers(uid)])
  const followerSet = new Set(followers)
  return { following, followers, friends: following.filter((u) => followerSet.has(u)) }
}

// Amigos de amigos que todavía no sigo, ordenados por cantidad de amigos en común.
export async function suggestFriendsOfFriends(uid, friends, following, max = 8) {
  const exclude = new Set([uid, ...following])
  const counts = new Map()
  const lists = await Promise.all(friends.slice(0, 15).map((f) => getConnections(f)))
  lists.forEach((c, i) => {
    for (const fof of c.friends) {
      if (exclude.has(fof)) continue
      const entry = counts.get(fof) ?? { uid: fof, mutual: [] }
      entry.mutual.push(friends[i])
      counts.set(fof, entry)
    }
  })
  return [...counts.values()].sort((a, b) => b.mutual.length - a.mutual.length).slice(0, max)
}

// ---------- Chat ----------

// Comprueba si `me` puede iniciar una conversación con `other` según su configuración.
// Devuelve { allowed, via } — via es un amigo en común (lo exigen las reglas para “amigos de amigos”).
export async function canMessage(me, other, otherProfile) {
  const setting = settingsOf(otherProfile).messages
  if (setting === 'everyone') return { allowed: true }
  if (setting === 'nobody') return { allowed: false }
  const [mine, theirs] = await Promise.all([getConnections(me), getConnections(other)])
  if (mine.friends.includes(other)) return { allowed: true }
  if (setting === 'friends') return { allowed: false }
  const via = mine.friends.find((f) => theirs.friends.includes(f))
  return via ? { allowed: true, via } : { allowed: false }
}

export async function getChat(me, other) {
  const snap = await getDoc(doc(db, 'chats', chatId(me, other)))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function sendMessage({ me, other, text, existing, via }) {
  const id = chatId(me, other)
  const clean = text.trim()
  const batch = writeBatch(db)
  const chatRef = doc(db, 'chats', id)
  const preview = { updatedAt: serverTimestamp(), lastText: clean.slice(0, 140), lastSender: me }
  if (existing) {
    batch.update(chatRef, preview)
  } else {
    batch.set(chatRef, {
      members: [me, other].sort(),
      ...(via ? { via } : {}),
      createdAt: serverTimestamp(),
      ...preview,
    })
  }
  batch.set(doc(collection(db, 'chats', id, 'messages')), { sender: me, text: clean, createdAt: serverTimestamp() })
  await batch.commit()
}

export function watchMessages(id, onData, onError) {
  return onSnapshot(
    query(collection(db, 'chats', id, 'messages'), orderBy('createdAt', 'asc'), limit(200)),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  )
}

export function watchChats(uid, onData, onError) {
  return onSnapshot(
    query(collection(db, 'chats'), where('members', 'array-contains', uid)),
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0)),
      ),
    onError,
  )
}

// ---------- Buscar personas ----------

// Sin texto: las cuentas más nuevas. Con texto: coincidencias por comienzo del alias o del nombre.
export async function searchPeople(text, max = 40) {
  const q = text.trim().replace(/^@/, '')
  if (!q) {
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(max)))
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
  }
  const handle = q.toLowerCase()
  const capital = q.charAt(0).toUpperCase() + q.slice(1)
  const byName = (prefix) =>
    getDocs(query(collection(db, 'users'), where('displayName', '>=', prefix), where('displayName', '<', `${prefix}\uf8ff`), limit(20)))
  const [handles, ...names] = await Promise.all([
    getDocs(query(collection(db, 'handles'), where(documentId(), '>=', handle), where(documentId(), '<', `${handle}\uf8ff`), limit(20))),
    byName(q),
    ...(capital !== q ? [byName(capital)] : []),
  ])
  const found = new Map()
  for (const snap of names) for (const d of snap.docs) found.set(d.id, { uid: d.id, ...d.data() })
  const missing = handles.docs.map((d) => d.data().uid).filter((uid) => !found.has(uid))
  const extra = await Promise.all(missing.map((uid) => getDoc(doc(db, 'users', uid))))
  for (const d of extra) if (d.exists()) found.set(d.id, { uid: d.id, ...d.data() })
  return [...found.values()].slice(0, max)
}
