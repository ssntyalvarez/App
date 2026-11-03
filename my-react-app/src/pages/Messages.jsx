import { Link, Navigate, useParams } from 'react-router'
import Avatar from '../components/Avatar.jsx'
import { EmptyState, FirebasePending, Spinner } from '../components/States.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { firebaseReady } from '../lib/firebase.js'
import { useDocumentTitle, useProfile, useProfileByHandle } from '../lib/hooks.js'
import { chatId } from '../lib/social.js'
import { Conversation, useChats } from '../components/Conversation.jsx'

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
