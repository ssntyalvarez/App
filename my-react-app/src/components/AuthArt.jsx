import { useState } from 'react'
import Logo from './Logo.jsx'

// Personajes de las pantallas de acceso (recortes en public/personajes/).
const LEGENDS = {
  snake: { character: 'Big Boss', game: 'Metal Gear Solid: Peace Walker' },
  leon: { character: 'Leon S. Kennedy', game: 'Resident Evil 4 (2023)' },
  kratos: { character: 'Kratos', game: 'God of War (2018)' },
  link: { character: 'Link', game: 'The Legend of Zelda: Breath of the Wild' },
  batman: { character: 'Batman', game: 'Batman: Arkham City' },
  fisher: { character: 'Sam Fisher', game: 'Splinter Cell' },
}

// En Ingresar aparece uno distinto en cada visita.
const LOGIN_CAST = ['snake', 'leon', 'kratos', 'link', 'batman']
// En Crear cuenta aparecen juntos, como un póster de reparto, todos cortados por el borde inferior.
// Si falta el archivo de algún personaje (p. ej. fisher.webp), simplemente no se muestra.
const REGISTER_CAST = ['leon', 'kratos', 'snake', 'link', 'fisher']

function Character({ id, className = '', eager = false }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  const { character, game } = LEGENDS[id]
  return (
    <img
      className={`character character--${id} ${className}`}
      src={`/personajes/${id}.webp`}
      alt={`${character} (${game})`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

export function LoginArt() {
  const [id] = useState(() => LOGIN_CAST[Math.floor(Math.random() * LOGIN_CAST.length)])
  const { character, game } = LEGENDS[id]
  return (
    <div className="auth__art auth__art--login">
      <div className="auth__art-inner">
        <Logo />
        <p className="auth__quote">
          Tu partida
          <br />
          <span className="accent">te estaba esperando.</span>
        </p>
        <p className="auth-caption">
          <strong>{character}</strong>
          <span>{game}</span>
        </p>
      </div>
      <div className="login-stage" aria-hidden="true">
        <Character id={id} className="login-stage__hero" eager />
      </div>
    </div>
  )
}

export function RegisterArt() {
  return (
    <div className="auth__art auth__art--register">
      <div className="auth__art-inner">
        <p className="auth__quote">
          Sumate a las <span className="accent">leyendas.</span>
        </p>
        <ol className="auth__points">
          <li><span>01</span> Puntuá de 0 a 10</li>
          <li><span>02</span> Armá tu biblioteca</li>
          <li><span>03</span> Compartí tu perfil</li>
        </ol>
      </div>
      <div className="cast" aria-label="Personajes de videojuegos">
        {REGISTER_CAST.map((id) => (
          <Character key={id} id={id} className="cast__member" eager />
        ))}
      </div>
    </div>
  )
}
