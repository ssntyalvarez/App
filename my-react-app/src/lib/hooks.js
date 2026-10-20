// Hooks de datos con caché (React Query). Las consultas a RAWG se hacen a demanda
// y se reutilizan mientras estén frescas para ahorrar llamadas.
import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchGame, fetchGames, fetchGenres, fetchPlatforms, fetchScreenshots } from './rawg.js'
import { firebaseReady } from './firebase.js'
import { getCommunityStats, listGameReviews, listRecentReviews, listUserReviews } from './reviews.js'
import { getProfile, getProfileByHandle } from './profiles.js'

const DAY = 24 * 60 * 60 * 1000

export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function useGames(params, options = {}) {
  return useQuery({
    queryKey: ['rawg', 'games', params],
    queryFn: () => fetchGames(params),
    staleTime: 30 * 60 * 1000,
    ...options,
  })
}

export function useInfiniteGames(params) {
  return useInfiniteQuery({
    queryKey: ['rawg', 'games-infinite', params],
    queryFn: ({ pageParam }) => fetchGames({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.hasNext ? pages.length + 1 : undefined),
    staleTime: 30 * 60 * 1000,
  })
}

export function useGame(id) {
  return useQuery({ queryKey: ['rawg', 'game', id], queryFn: () => fetchGame(id), staleTime: DAY, enabled: !!id })
}

export function useScreenshots(id) {
  return useQuery({
    queryKey: ['rawg', 'screenshots', id],
    queryFn: () => fetchScreenshots(id),
    staleTime: DAY,
    enabled: !!id,
  })
}

export function useGenres() {
  return useQuery({ queryKey: ['rawg', 'genres'], queryFn: fetchGenres, staleTime: DAY })
}

export function usePlatforms() {
  return useQuery({ queryKey: ['rawg', 'platforms'], queryFn: fetchPlatforms, staleTime: DAY })
}

// ---------- Firestore ----------

// Tras crear, editar o eliminar una reseña se refrescan todas las vistas que la usan.
export function invalidateReviewData(queryClient, gameId, uid) {
  queryClient.invalidateQueries({ queryKey: ['reviews'] })
  queryClient.invalidateQueries({ queryKey: ['stats', String(gameId)] })
  if (uid) queryClient.invalidateQueries({ queryKey: ['library', uid] })
}

export function useCommunityStats(gameId) {
  return useQuery({
    queryKey: ['stats', String(gameId)],
    queryFn: () => getCommunityStats(gameId),
    enabled: firebaseReady && !!gameId,
    staleTime: 60 * 1000,
  })
}

export function useGameReviews(gameId) {
  return useQuery({
    queryKey: ['reviews', 'game', String(gameId)],
    queryFn: () => listGameReviews(gameId),
    enabled: firebaseReady && !!gameId,
  })
}

export function useUserReviews(uid) {
  return useQuery({
    queryKey: ['reviews', 'user', uid],
    queryFn: () => listUserReviews(uid),
    enabled: firebaseReady && !!uid,
  })
}

export function useRecentReviews() {
  return useQuery({ queryKey: ['reviews', 'recent'], queryFn: () => listRecentReviews(6), enabled: firebaseReady })
}

export function useProfile(uid) {
  return useQuery({
    queryKey: ['profile', uid],
    queryFn: () => getProfile(uid),
    enabled: firebaseReady && !!uid,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProfileByHandle(handle) {
  return useQuery({
    queryKey: ['profile-handle', handle],
    queryFn: () => getProfileByHandle(handle),
    enabled: firebaseReady && !!handle,
  })
}
