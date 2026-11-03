import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import Avatar from '../components/Avatar.jsx'
import { EmptyState, FirebasePending, Spinner } from '../components/States.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { formatDate } from '../lib/format.js'
import { useDocumentTitle, useProfile, useProfileByHandle } from '../lib/hooks.js'
import { firestoreMessage } from '../lib/profiles.js'
import { MAX_MESSAGE, canMessage, chatId, sendMessage, watchChats, watchMessages } from '../lib/social.js'

const timeFmt = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })

function useChats(uid) {
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

function ChatListItem({ chat, me, active }) {
  const otherUid = chat.members.find((m) => m !== me)
  const { data: other } = useProfile(otherUid)
  if (!other) return <li className="chat-item is-loading"><span className="muted">Cargando…</span></li>
  return (
    <li>
      <Link to={`/mensajes/${other.handle}`} className={`chat-item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
        <Avatar profile={other} size={42} />
        <span className="chat-item__text">
          <strong>{other.displayName}</strong>
          <span className="muted">
            {chat.lastSender === me ? 'Vos: ' : ''}
            {chat.lastText}
          </span>
        </span>
      </Link>
    </li>
  )
}

function Conversation({ me, other, chat }) {
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
    <section className="chat" aria-label={`Conversación con ${other.displayName}`}>
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
          <label htmlFor="chat-input" className="sr-only">Mensaje</label>
          <textarea
            id="chat-input"
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

export default function Messages() {
  const { handle } = useParams()
  const { user, profile, loading } = useAuth()
  const { chats, error } = useChats(user?.uid)
  const otherQ = useProfileByHandle(handle)
  useDocumentTitle(otherQ.data ? `Chat con ${otherQ.data.displayName}` : 'Mensajes')

  if (!firebaseReady) return <div className="page container"><FirebasePending /></div>
  if (loading) return <div className="page container"><Spinner /></div>
  if (!user) return <Navigate to="/ingresar" replace state={{ from: '/mensajes' }} />
  if (!profile) return <Navigate to="/bienvenida" replace />

  const other = otherQ.data
  const chat = other ? chats?.find((c) => c.id === chatId(user.uid, other.uid)) : null

  return (
    <div className={`page container messages ${handle ? 'has-chat' : ''}`}>
      <aside className="messages__list" aria-label="Conversaciones">
        <h1>Mensajes</h1>
        {error ? (
          <p className="form-error">No se pudieron cargar tus conversaciones.</p>
        ) : !chats ? (
          <Spinner />
        ) : chats.length ? (
          <ul>
            {chats.map((c) => (
              <ChatListItem key={c.id} chat={c} me={user.uid} active={other && c.id === chatId(user.uid, other.uid)} />
            ))}
          </ul>
        ) : (
          <p className="muted">Todavía no tenés conversaciones. Entrá al perfil de alguien y tocá “Mensaje”.</p>
        )}
      </aside>
      <div className="messages__main">
        {!handle ? (
          <EmptyState title="Elegí una conversación">
            <p>O buscá a alguien en sus perfiles y tocá “Mensaje”.</p>
          </EmptyState>
        ) : otherQ.isPending || !chats ? (
          <Spinner />
        ) : !other ? (
          <EmptyState title="Ese perfil no existe" />
        ) : other.uid === user.uid ? (
          <EmptyState title="No podés escribirte a vos mismo" />
        ) : (
          <Conversation key={other.uid} me={user.uid} other={other} chat={chat} />
        )}
      </div>
    </div>
  )
}
