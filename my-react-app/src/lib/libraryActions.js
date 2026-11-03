import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { invalidateProfileData } from './hooks.js'
import { MAX_FEATURED, addToLibrary, removeFromLibrary, setFeatured } from './library.js'
import { firestoreMessage } from './profiles.js'

// Acciones de biblioteca reutilizables (ficha del juego y perfil del dueño).
export function useLibraryActions(uid) {
  const { profile } = useAuth()
  const notify = useToast()
  const queryClient = useQueryClient()
  const done = (message) => () => {
    queryClient.invalidateQueries({ queryKey: ['library', uid] })
    invalidateProfileData(queryClient)
    if (message) notify(message)
  }
  const fail = (fallback) => (err) => notify(firestoreMessage(err, fallback), 'error')

  return {
    add: useMutation({
      mutationFn: ({ game }) => addToLibrary(uid, game),
      onSuccess: done('Agregado a tu biblioteca.'),
      onError: fail('No se pudo agregar a la biblioteca.'),
    }),
    remove: useMutation({
      mutationFn: ({ gameId }) => removeFromLibrary(uid, gameId, profile),
      onSuccess: done('Se quitó de tu biblioteca.'),
      onError: fail('No se pudo quitar de la biblioteca.'),
    }),
    feature: useMutation({
      mutationFn: ({ gameId, value }) => {
        const current = profile?.featured ?? []
        const id = String(gameId)
        const next = value ? [...current.filter((x) => x !== id), id] : current.filter((x) => x !== id)
        if (next.length > MAX_FEATURED) throw new Error('max')
        return setFeatured(uid, next)
      },
      onSuccess: (_, { value }) => done(value ? 'Destacado en tu perfil.' : 'Ya no está destacado.')(),
      onError: (err) =>
        err.message === 'max'
          ? notify(`Podés destacar hasta ${MAX_FEATURED} juegos. Quitá uno primero.`, 'error')
          : fail('No se pudo actualizar los destacados.')(err),
    }),
  }
}
