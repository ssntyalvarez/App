// Progresión de niveles: la experiencia (XP) sale de las reseñas reales de cada persona,
// así que no se guarda en ningún lado ni se puede inflar a mano.
export const XP_PER_REVIEW = 100
export const XP_DETAILED_BONUS = 50 // reseña de 200 caracteres o más
export const DETAILED_LENGTH = 200

// XP total necesaria para llegar al nivel n: 0, 100, 300, 600, 1000, 1500…
export const xpForLevel = (n) => 50 * n * (n - 1)

// Rangos de la jerarquía: de colores apagados (niveles bajos) a colores intensos (niveles altos).
export const RANKS = [
  { min: 1, title: 'Novato', tier: 'novato' },
  { min: 3, title: 'Aprendiz', tier: 'aprendiz' },
  { min: 5, title: 'Jugador', tier: 'jugador' },
  { min: 8, title: 'Veterano', tier: 'veterano' },
  { min: 12, title: 'Experto', tier: 'experto' },
  { min: 18, title: 'Leyenda', tier: 'leyenda' },
]

export const reviewXp = (review) =>
  XP_PER_REVIEW + ((review.text?.trim().length ?? 0) >= DETAILED_LENGTH ? XP_DETAILED_BONUS : 0)

export function levelFromXp(xp) {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const rank = RANKS.filter((r) => level >= r.min).at(-1)
  return { level, title: rank.title, tier: rank.tier, xp, base, next, progress: (xp - base) / (next - base), toNext: next - xp }
}

export const levelFromReviews = (reviews) => levelFromXp(reviews.reduce((sum, r) => sum + reviewXp(r), 0))
