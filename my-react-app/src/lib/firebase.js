// Punto único de conexión con Firebase (Authentication + Cloud Firestore).
// La configuración web es pública y llega por variables VITE_ (ver .env.example).
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const env = import.meta.env
const useEmulators = env.VITE_USE_FIREBASE_EMULATORS === 'true'

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

const missing = Object.entries({
  VITE_FIREBASE_API_KEY: config.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: config.authDomain,
  VITE_FIREBASE_PROJECT_ID: config.projectId,
  VITE_FIREBASE_APP_ID: config.appId,
})
  .filter(([, v]) => !v)
  .map(([k]) => k)

// Con emuladores alcanza un projectId de demostración.
if (useEmulators) {
  config.projectId ||= 'demo-checkpoint'
  config.apiKey ||= 'demo-key'
  config.authDomain ||= 'localhost'
}

export const firebaseReady = useEmulators || missing.length === 0
export const firebaseMissingVars = useEmulators ? [] : missing
export const usingEmulators = useEmulators

export const app = firebaseReady ? initializeApp(config) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null

if (app && useEmulators) {
  const host = env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1'
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
}
