export default function Logo({ small = false }) {
  return (
    <span className={`logo ${small ? 'logo--small' : ''}`}>
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--lime)" />
        <path d="M10 25V7" stroke="var(--ink-on-lime)" strokeWidth="3" strokeLinecap="round" />
        <path d="M11.5 8h11l-3 4.5 3 4.5h-11z" fill="var(--ink-on-lime)" />
      </svg>
      <span className="logo__word">Checkpoint</span>
    </span>
  )
}
