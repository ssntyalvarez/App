import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { invalidateProfileData } from './hooks.js'
import { MAX_FEATURED, addToLibrary, removeFromLibrary, setFavorite, setFeatured, statusLabel, updateLibraryEntry } from './library.js'
import { firestoreMessage } from './profiles.js'

// Controles de biblioteca reutilizables (ficha del juego y perfil del dueño).
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

  // Actualización optimista: la interfaz refleja el cambio al instante y se revierte si Firestore lo rechaza.
  const optimistic = (patch) => async (vars) => {
    await queryClient.cancelQueries({ queryKey: ['library', uid] })
    const previous = queryClient.getQueryData(['library', uid])
    queryClient.setQueryData(['library', uid], (list) =>
      list?.map((e) => (e.gameId === String(vars.gameId) ? { ...e, ...patch(vars, e) } : e)),
    )
    return { previous }
  }
  const rollback = (fallback) => (err, _vars, ctx) => {
    if (ctx?.previous) queryClient.setQueryData(['library', uid], ctx.previous)
    fail(fallback)(err)
  }

  return {
    add: useMutation({
      mutationFn: ({ game, status }) => addToLibrary(uid, game, status),
      onSuccess: (_, { status }) => done(`Agregado a tu biblioteca como “${statusLabel(status)}”.`)(),
      onError: fail('No se pudo agregar a la biblioteca.'),
    }),
    update: useMutation({
      mutationFn: ({ gameId, changes }) => updateLibraryEntry(uid, gameId, changes),
      onMutate: optimistic(({ changes }) =>
        changes.status && changes.status !== 'completed' ? { ...changes, finishedAt: null } : changes,
      ),
      onSuccess: done('Biblioteca actualizada.'),
      onError: rollback('No se pudo actualizar la biblioteca.'),
    }),
    remove: useMutation({
      mutationFn: ({ gameId }) => removeFromLibrary(uid, gameId, profile),
      onSuccess: done('Se quitó de tu biblioteca.'),
      onError: fail('No se pudo quitar de la biblioteca.'),
    }),
    favorite: useMutation({
      mutationFn: ({ gameId, value }) => setFavorite(uid, gameId, value, profile),
      onMutate: optimistic(({ value }) => ({ favorite: value })),
      onSuccess: (_, { value }) => done(value ? 'Marcado como favorito.' : 'Quitado de favoritos.')(),
      onError: rollback('No se pudo actualizar favoritos.'),
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
