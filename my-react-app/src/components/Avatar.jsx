// Avatar del perfil: imagen propia o monograma generado a partir del nombre.
const HUES = [72, 160, 200, 260, 320, 20, 40]

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function Avatar({ profile, size = 40, className = '' }) {
  const name = profile?.displayName ?? ''
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }
  if (profile?.avatar) {
    return <img className={`avatar ${className}`} src={profile.avatar} alt="" style={style} />
  }
  const seed = [...(profile?.handle ?? name)].reduce((s, c) => s + c.charCodeAt(0), 0)
  const hue = HUES[seed % HUES.length]
  return (
    <span
      className={`avatar avatar--mono ${className}`}
      style={{ ...style, '--avatar-hue': hue }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
