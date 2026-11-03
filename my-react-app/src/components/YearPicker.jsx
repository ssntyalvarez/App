import { useEffect, useRef, useState } from 'react'

const CURRENT_YEAR = new Date().getFullYear()
const FIRST_DECADE = 1970
// Décadas de la más reciente a la más antigua: 2020, 2010, …, 1970.
const DECADES = Array.from(
  { length: Math.floor(CURRENT_YEAR / 10) - FIRST_DECADE / 10 + 1 },
  (_, i) => Math.floor(CURRENT_YEAR / 10) * 10 - i * 10,
)

function yearLabel(value) {
  if (!value) return 'Todos'
  return value.endsWith('s') ? `Década del ${value.slice(2, 4)}` : value
}

// Selector de año en dos pasos: se elige una década y después un año (o la década completa).
// value: '' (todos), 'AAAA' (un año) o 'AAAAs' (una década, p. ej. '2010s').
export default function YearPicker({ id, value, onChange }) {
  const [open, setOpen] = useState(false)
  const selectedDecade = value ? Math.floor(Number(value.slice(0, 4)) / 10) * 10 : DECADES[0]
  const [decade, setDecade] = useState(selectedDecade)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (v) => {
    onChange(v)
    setOpen(false)
  }
  const years = Array.from({ length: 10 }, (_, i) => decade + i).filter((y) => y <= CURRENT_YEAR + 1)

  return (
    <div className="year-picker" ref={ref}>
      <button
        id={id}
        type="button"
        className="year-picker__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setDecade(selectedDecade)
          setOpen((o) => !o)
        }}
      >
        <span>{yearLabel(value)}</span>
        <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      {open && (
        <div className="year-picker__panel" role="dialog" aria-label="Elegir año de lanzamiento">
          <div className="year-picker__decades" role="group" aria-label="Década">
            {DECADES.map((d) => (
              <button
                key={d}
                type="button"
                className={`chip ${decade === d ? 'is-active' : ''}`}
                aria-pressed={decade === d}
                onClick={() => setDecade(d)}
              >
                {String(d).slice(2)}s
              </button>
            ))}
          </div>
          <div className="year-picker__years" role="group" aria-label={`Años de la década de ${decade}`}>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={`year-picker__year ${value === String(y) ? 'is-selected' : ''}`}
                aria-pressed={value === String(y)}
                onClick={() => pick(String(y))}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="year-picker__foot">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => pick(`${decade}s`)}>
              Toda la década del {String(decade).slice(2)}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => pick('')} disabled={!value}>
              Todos los años
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
