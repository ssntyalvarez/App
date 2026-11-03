// Pruebas de las reglas de Firestore contra el emulador.
// Ejecutar con: npm run test:rules
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, getDocs, collection, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'

let env

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-checkpoint-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(() => env?.cleanup())
beforeEach(() => env.clearFirestore())

const as = (uid) => env.authenticatedContext(uid).firestore()
const anon = () => env.unauthenticatedContext().firestore()

async function createProfile(db, uid, handle, extra = {}) {
  const b = writeBatch(db)
  b.set(doc(db, 'handles', handle), { uid })
  b.set(doc(db, 'users', uid), { displayName: 'Ana', handle, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra })
  return b.commit()
}

const review = (uid, extra = {}) => ({
  uid, gameId: '3498', gameName: 'Grand Theft Auto V', gameSlug: 'grand-theft-auto-v',
  gameImage: 'https://media.rawg.io/media/games/a.jpg', score: 8, text: 'Muy bueno',
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
})

describe('perfiles y alias', () => {
  it('un usuario crea su perfil reservando su alias', async () => {
    await assertSucceeds(createProfile(as('ana'), 'ana', 'ana_g'))
  })

  it('no se puede crear el perfil de otro usuario', async () => {
    await assertFails(createProfile(as('ana'), 'beto', 'beto'))
  })

  it('no se puede reutilizar un alias ajeno', async () => {
    await createProfile(as('ana'), 'ana', 'ana_g')
    await assertFails(createProfile(as('beto'), 'beto', 'ana_g'))
  })

  it('no se pueden guardar campos privados como el correo', async () => {
    await assertFails(createProfile(as('ana'), 'ana', 'ana_g', { email: 'ana@example.com' }))
  })

  it('valida formato de alias y nombre', async () => {
    await assertFails(createProfile(as('ana'), 'ana', 'Ana G'))
    await assertFails(createProfile(as('ana'), 'ana', 'ana', { displayName: '' }))
  })

  it('los perfiles son públicos pero solo los edita su dueño', async () => {
    await createProfile(as('ana'), 'ana', 'ana_g')
    await assertSucceeds(getDoc(doc(anon(), 'users', 'ana')))
    await assertFails(updateDoc(doc(as('beto'), 'users', 'ana'), { displayName: 'Hackeado', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(as('ana'), 'users', 'ana'), { displayName: 'Ana García', updatedAt: serverTimestamp() }))
  })

  it('cambiar de alias libera el anterior en la misma operación', async () => {
    await createProfile(as('ana'), 'ana', 'ana_g')
    const db = as('ana')
    const b = writeBatch(db)
    b.set(doc(db, 'handles', 'ana_nueva'), { uid: 'ana' })
    b.delete(doc(db, 'handles', 'ana_g'))
    b.update(doc(db, 'users', 'ana'), { handle: 'ana_nueva', updatedAt: serverTimestamp() })
    await assertSucceeds(b.commit())
    // Sin liberar el alias viejo, el cambio se rechaza.
    const b2 = writeBatch(db)
    b2.set(doc(db, 'handles', 'otra'), { uid: 'ana' })
    b2.update(doc(db, 'users', 'ana'), { handle: 'otra', updatedAt: serverTimestamp() })
    await assertFails(b2.commit())
  })

  it('nadie puede borrar el alias de otro', async () => {
    await createProfile(as('ana'), 'ana', 'ana_g')
    await assertFails(deleteDoc(doc(as('beto'), 'handles', 'ana_g')))
  })
})

describe('reseñas', () => {
  it('cualquiera puede leer reseñas (incluso sin sesión)', async () => {
    await assertSucceeds(getDocs(query(collection(anon(), 'reviews'), where('gameId', '==', '3498'))))
  })

  it('sin sesión no se puede publicar', async () => {
    await assertFails(setDoc(doc(anon(), 'reviews', '3498_ana'), review('ana')))
  })

  it('el usuario crea su reseña con id gameId_uid; 0 es válido', async () => {
    await assertSucceeds(setDoc(doc(as('ana'), 'reviews', '3498_ana'), review('ana', { score: 0 })))
  })

  it('no se puede publicar a nombre de otro ni con otro id', async () => {
    await assertFails(setDoc(doc(as('ana'), 'reviews', '3498_beto'), review('beto')))
    await assertFails(setDoc(doc(as('ana'), 'reviews', 'cualquiera'), review('ana')))
  })

  it('valida puntuación, longitud y campos permitidos', async () => {
    const db = as('ana')
    const ref = doc(db, 'reviews', '3498_ana')
    await assertFails(setDoc(ref, review('ana', { score: 11 })))
    await assertFails(setDoc(ref, review('ana', { score: -1 })))
    await assertFails(setDoc(ref, review('ana', { score: 7.5 })))
    await assertFails(setDoc(ref, review('ana', { text: 'x'.repeat(2001) })))
    await assertFails(setDoc(ref, review('ana', { likes: 999 })))
    await assertFails(setDoc(ref, review('ana', { gameImage: 'https://evil.example/x.png' })))
  })

  it('una sola reseña por usuario y juego: no se puede “recrear” encima', async () => {
    const db = as('ana')
    await setDoc(doc(db, 'reviews', '3498_ana'), review('ana'))
    await assertFails(setDoc(doc(db, 'reviews', '3498_ana'), review('ana')))
  })

  it('el autor edita y elimina; otro usuario no', async () => {
    await setDoc(doc(as('ana'), 'reviews', '3498_ana'), review('ana'))
    await assertFails(updateDoc(doc(as('beto'), 'reviews', '3498_ana'), { score: 1, updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(as('beto'), 'reviews', '3498_ana')))
    await assertSucceeds(updateDoc(doc(as('ana'), 'reviews', '3498_ana'), { score: 10, text: 'Editada', updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(doc(as('ana'), 'reviews', '3498_ana')))
  })

  it('el autor no puede cambiar el dueño ni el juego', async () => {
    await setDoc(doc(as('ana'), 'reviews', '3498_ana'), review('ana'))
    await assertFails(updateDoc(doc(as('ana'), 'reviews', '3498_ana'), { uid: 'beto', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(as('ana'), 'reviews', '3498_ana'), { gameId: '1', updatedAt: serverTimestamp() }))
  })
})

describe('perfil personalizable', () => {
  const tinyJpeg = 'data:image/jpeg;base64,' + 'A'.repeat(2000)

  it('acepta bio, avatar, portada de RAWG y hasta 4 destacados', async () => {
    await createProfile(as('ana'), 'ana', 'ana_g')
    await assertSucceeds(updateDoc(doc(as('ana'), 'users', 'ana'), {
      bio: 'Fan de los metroidvania.', avatar: tinyJpeg,
      coverUrl: 'https://media.rawg.io/media/games/x.jpg', featured: ['1', '2', '3', '4'], updatedAt: serverTimestamp(),
    }))
  })

  it('rechaza bio larga, avatar no imagen o enorme, portada externa y más de 4 destacados', async () => {
    await createProfile(as('ana'), 'ana', 'ana_g')
    const ref = doc(as('ana'), 'users', 'ana')
    const upd = (data) => updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
    await assertFails(upd({ bio: 'x'.repeat(161) }))
    await assertFails(upd({ avatar: 'https://evil.example/a.png' }))
    await assertFails(upd({ avatar: 'data:text/html;base64,PHNjcmlwdD4=' }))
    await assertFails(upd({ avatar: 'data:image/jpeg;base64,' + 'A'.repeat(80001) }))
    await assertFails(upd({ coverUrl: 'https://evil.example/cover.jpg' }))
    await assertFails(upd({ featured: ['1', '2', '3', '4', '5'] }))
  })
})

describe('biblioteca personal', () => {
  const entry = (extra = {}) => ({
    gameId: '3498', name: 'Grand Theft Auto V', slug: 'gta-v', image: 'https://media.rawg.io/media/games/a.jpg',
    released: '2013-09-17', status: 'want', favorite: false, finishedAt: null,
    addedAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
  })

  it('es pública para lectura', async () => {
    await setDoc(doc(as('ana'), 'libraries/ana/games/3498'), entry())
    await assertSucceeds(getDoc(doc(anon(), 'libraries/ana/games/3498')))
  })

  it('cada usuario solo modifica su biblioteca', async () => {
    await assertSucceeds(setDoc(doc(as('ana'), 'libraries/ana/games/3498'), entry()))
    await assertFails(setDoc(doc(as('beto'), 'libraries/ana/games/1'), entry({ gameId: '1' })))
    await assertFails(updateDoc(doc(as('beto'), 'libraries/ana/games/3498'), { status: 'abandoned', updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(as('beto'), 'libraries/ana/games/3498')))
    await assertSucceeds(deleteDoc(doc(as('ana'), 'libraries/ana/games/3498')))
  })

  it('valida estado, coherencia del id y fecha de finalización', async () => {
    const ref = doc(as('ana'), 'libraries/ana/games/3498')
    await assertFails(setDoc(ref, entry({ status: 'terminado' })))
    await assertFails(setDoc(ref, entry({ gameId: '1' })))
    await assertFails(setDoc(ref, entry({ status: 'playing', finishedAt: '2024-01-01' })))
    await assertFails(setDoc(ref, entry({ status: 'completed', finishedAt: 'ayer' })))
    await assertSucceeds(setDoc(ref, entry({ status: 'completed', finishedAt: '2024-01-01' })))
  })

  it('no admite una puntuación en la biblioteca (la nota vive en la reseña)', async () => {
    await assertFails(setDoc(doc(as('ana'), 'libraries/ana/games/3498'), entry({ score: 10 })))
  })
})
