import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(Boolean(auth))
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    if (!auth) return undefined
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
    })
  }, [])

  // El perfil público del usuario se escucha en tiempo real.
  useEffect(() => {
    if (!user) {
      setProfile(null)
      setProfileLoading(false)
      return undefined
    }
    setProfileLoading(true)
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        setProfile(snap.exists() ? { uid: user.uid, ...snap.data() } : null)
        setProfileLoading(false)
      },
      () => setProfileLoading(false),
    )
  }, [user])

  const value = {
    user,
    profile,
    loading: authLoading || profileLoading,
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    register: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

// oxlint-disable-next-line react/only-export-components
export function authMessage(err) {
  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Correo o contraseña incorrectos.'
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con ese correo.'
    case 'auth/invalid-email':
      return 'El correo no tiene un formato válido.'
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Esperá unos minutos.'
    case 'auth/network-request-failed':
      return 'Sin conexión con el servicio de autenticación.'
    case 'auth/operation-not-allowed':
      return 'El acceso con correo y contraseña no está habilitado en Firebase.'
    default:
      return 'No se pudo completar la operación. Intentá de nuevo.'
  }
}
