import { useEffect, useRef, useState } from 'react'
import GameImage from './GameImage.jsx'

// Galería de capturas con visor modal accesible (<dialog>: Esc cierra, foco atrapado).
export default function Gallery({ images, title }) {
  const dialogRef = useRef(null)
  const [index, setIndex] = useState(null)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (index != null && !dlg.open) dlg.showModal()
    if (index == null && dlg.open) dlg.close()
  }, [index])

  const move = (delta) => setIndex((i) => (i + delta + images.length) % images.length)

  return (
    <>
      <ul className="gallery">
        {images.map((img, i) => (
          <li key={img.id}>
            <button type="button" className="gallery__thumb" onClick={() => setIndex(i)}>
              <GameImage src={img.image} width={420} alt={`Captura ${i + 1} de ${title}`} label={false} />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label={`Capturas de ${title}`}
        onClose={() => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') move(1)
          if (e.key === 'ArrowLeft') move(-1)
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIndex(null)
        }}
      >
        {index != null && (
          <div className="lightbox__inner">
            <GameImage src={images[index].image} width={1280} alt={`Captura ${index + 1} de ${title}`} eager />
            <div className="lightbox__bar">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => move(-1)} aria-label="Captura anterior">
                ←
              </button>
              <span>
                {index + 1} / {images.length}
              </span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => move(1)} aria-label="Captura siguiente">
                →
              </button>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setIndex(null)}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
