import { useState } from 'react'
import { rawgImage } from '../lib/format.js'

// Imagen de juego con estado claro cuando RAWG no tiene imagen o falla la carga.
export default function GameImage({ src, alt = '', width = 640, className = '', eager = false, label = true }) {
  // 0: versión redimensionada · 1: original (si la redimensionada falla) · 2: sin imagen
  const [attempt, setAttempt] = useState(0)
  const resized = rawgImage(src, width)
  const url = attempt === 0 ? resized : attempt === 1 && resized !== src ? src : null

  if (!url) {
    return (
      <div className={`game-img game-img--empty ${className}`} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <rect x="6" y="12" width="36" height="24" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M15 24h6M18 21v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="31" cy="22" r="1.8" fill="currentColor" />
          <circle cx="34" cy="26" r="1.8" fill="currentColor" />
        </svg>
        {label && <span>Sin imagen disponible</span>}
      </div>
    )
  }

  return (
    <img
      className={`game-img ${className}`}
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setAttempt((a) => (a === 0 && resized !== src ? 1 : 2))}
    />
  )
}
