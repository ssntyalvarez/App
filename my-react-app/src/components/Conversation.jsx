import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate } from '../lib/format.js'
import { firestoreMessage } from '../lib/profiles.js'
import { MAX_MESSAGE, canMessage, chatId, sendMessage, watchChats, watchMessages } from '../lib/social.js'
import Avatar from './Avatar.jsx'

const timeFmt = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })

// oxlint-disable-next-line react/only-export-components
export function useChats(uid) {
  const [state, setState] = useState({ uid: null, chats: null, error: null })
  useEffect(() => {
    if (!uid) return undefined
    return watchChats(
      uid,
      (chats) => setState({ uid, chats, error: null }),
      (error) => setState({ uid, chats: [], error }),
    )
  }, [uid])
  return state.uid === uid ? state : { chats: null, error: null }
}

export function Conversation({ me, other, chat, compact = false }) {
  const notify = useToast()
  const [messages, setMessages] = useState({ id: null, list: [] })
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [blocked, setBlocked] = useState(null)
  const endRef = useRef(null)
  const id = chatId(me, other.uid)

  useEffect(() => {
    if (!chat) return undefined
    return watchMessages(
      id,
      (list) => setMessages({ id, list }),
      () => setMessages({ id, list: [] }),
    )
  }, [chat, id])
  const list = chat && messages.id === id ? messages.list : []

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [list.length])

  const onSubmit = async (e) => {
    e.preventDefault()
    const clean = text.trim()
    if (!clean || sending) return
    setSending(true)
    try {
      let via
      if (!chat) {
        const check = await canMessage(me, other.uid, other)
        if (!check.allowed) {
          setBlocked(`${other.displayName} no recibe mensajes de personas que no son sus amigos.`)
          return
        }
        via = check.via
      }
      await sendMessage({ me, other: other.uid, text: clean, existing: Boolean(chat), via })
      setText('')
    } catch (err) {
      notify(firestoreMessage(err, 'No se pudo enviar el mensaje.'), 'error')
    } finally {
      setSending(false)
    }
  }

  // Separador de día: se marca el primer mensaje de cada fecha.
  const items = list.map((m, i) => {
    const date = m.createdAt?.toDate?.()
    const day = date ? formatDate(date) : null
    const prevDate = list[i - 1]?.createdAt?.toDate?.()
    return { ...m, date, day, showDay: day && day !== (prevDate ? formatDate(prevDate) : null) }
  })
  return (
    <section className={`chat ${compact ? 'chat--compact' : ''}`} aria-label={`Conversación con ${other.displayName}`}>
      {!compact && (
      <header className="chat__head">
        <Link to="/mensajes" className="chat__back">← <span className="sr-only">Volver a mensajes</span></Link>
        <Link to={`/u/${other.handle}`} className="chat__who">
          <Avatar profile={other} size={40} />
          <span>
            <strong>{other.displayName}</strong>
            <span className="muted">@{other.handle}</span>
          </span>
        </Link>
      </header>
      )}
      <ol className="chat__messages" aria-live="polite">
        {!chat && <li className="chat__empty muted">Todavía no hay mensajes. ¡Escribí el primero!</li>}
        {items.map((m) => (
          <li key={m.id} className={`msg ${m.sender === me ? 'msg--mine' : ''}`}>
            {m.showDay && <span className="msg__day">{m.day}</span>}
            <p className="msg__bubble">
              {m.text}
              <span className="msg__time">{m.date ? timeFmt.format(m.date) : 'Enviando…'}</span>
            </p>
          </li>
        ))}
        <li ref={endRef} aria-hidden="true" />
      </ol>
      {blocked ? (
        <p className="form-error form-error--block chat__blocked" role="alert">{blocked}</p>
      ) : (
        <form className="chat__form" onSubmit={onSubmit}>
          <label htmlFor={`chat-input-${other.uid}`} className="sr-only">Mensaje</label>
          <textarea
            id={`chat-input-${other.uid}`}
            rows={1}
            value={text}
            maxLength={MAX_MESSAGE}
            placeholder="Escribí un mensaje…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) onSubmit(e)
            }}
          />
          <button type="submit" className="btn btn--primary" disabled={sending || !text.trim()}>
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
      )}
    </section>
  )
}

