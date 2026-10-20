const dateFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
const monthFmt = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })

// Las fechas de RAWG llegan como 'YYYY-MM-DD'; se interpretan como fecha local.
export function formatReleased(released, tba) {
  if (tba) return 'Por anunciar'
  if (!released) return 'Fecha sin confirmar'
  const [y, m, d] = released.split('-').map(Number)
  return dateFmt.format(new Date(y, m - 1, d))
}

export function releaseYear(released) {
  return released ? released.slice(0, 4) : null
}

export function formatDate(value) {
  const date = toDate(value)
  return date ? dateFmt.format(date) : ''
}

export function formatMonth(value) {
  const date = toDate(value)
  return date ? monthFmt.format(date) : ''
}

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value.toDate === 'function') return value.toDate()
  if (typeof value === 'string') {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d || 1)
  }
  return null
}

// RAWG permite pedir versiones redimensionadas de sus imágenes.
export function rawgImage(url, width = 640) {
  if (!url) return null
  if (!url.startsWith('https://media.rawg.io/media/')) return url
  if (url.includes('/media/resize/') || url.includes('/media/crop/')) return url
  return url.replace('/media/', `/media/resize/${width}/-/`)
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

export function formatAverage(avg) {
  return avg == null ? '–' : avg.toFixed(1).replace('.', ',')
}
