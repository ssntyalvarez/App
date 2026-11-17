import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext.jsx'
import { getProfile } from '../lib/profiles.js'
import { chatId } from '../lib/social.js'
import Avatar from './Avatar.jsx'
import { Conversation, useChats } from './Conversation.jsx'

const ChatDockContext = createContext(() => {})

// oxlint-disable-next-line react/only-export-components
export function useOpenChat() {
  return useContext(ChatDockContext)
}

const MAX_WINDOWS = 2

// Ventanas de chat flotantes abajo a la derecha (como los susurros de Twitch).
export function ChatDockProvider({ children }) {
  const { user } = useAuth()
  const [windows, setWindows] = useState([])
  // Las conversaciones se escuchan siempre que hay sesión, para enterarse de los mensajes nuevos.
  const { chats } = useChats(user?.uid)
  const { pathname } = useLocation()

  const openChat = useCallback((profile) => {
    setWindows((list) => {
      const rest = list.filter((w) => w.profile.uid !== profile.uid)
      return [...rest, { profile, minimized: false }].slice(-MAX_WINDOWS)
    })
  }, [])
  // Mensaje entrante: se abre (o se expande) la ventana de esa conversación. Solo cuentan los
  // mensajes posteriores a abrir la página (o a iniciar sesión), así no se abren chats viejos.
  const seen = useRef(null)
  const [mountedAt] = useState(() => Date.now())
  const onMessagesPage = pathname.startsWith('/mensajes')
  useEffect(() => {
    if (!chats || !user) return
    const stamp = (c) => c.updatedAt?.toMillis?.() ?? 0
    if (!seen.current || seen.current.uid !== user.uid) {
      const since = seen.current ? Date.now() : mountedAt
      seen.current = { uid: user.uid, at: new Map(chats.map((c) => [c.id, Math.min(stamp(c), since)])) }
    }
    const fresh = chats.filter((c) => c.lastSender && c.lastSender !== user.uid && stamp(c) > (seen.current.at.get(c.id) ?? 0))
    chats.forEach((c) => seen.current.at.set(c.id, Math.max(stamp(c), seen.current.at.get(c.id) ?? 0)))
    if (onMessagesPage) return
    fresh.forEach(async (c) => {
      const profile = await getProfile(c.lastSender).catch(() => null)
      if (!profile) return
      setWindows((list) => {
        const open = list.find((w) => w.profile.uid === profile.uid)
        if (open) return list.map((w) => (w === open ? { ...w, minimized: false } : w))
        return [...list, { profile, minimized: false }].slice(-MAX_WINDOWS)
      })
    })
  }, [chats, user, onMessagesPage, mountedAt])

  const close = (uid) => setWindows((list) => list.filter((w) => w.profile.uid !== uid))
  const toggle = (uid) =>
    setWindows((list) => list.map((w) => (w.profile.uid === uid ? { ...w, minimized: !w.minimized } : w)))

  return (
    <ChatDockContext.Provider value={openChat}>
      {children}
      {user &&
        windows.length > 0 &&
        createPortal(
          <div className="chat-dock" aria-label="Chats abiertos">
            {windows.map(({ profile, minimized }) => {
              const chat = chats?.find((c) => c.id === chatId(user.uid, profile.uid))
              return (
                <section key={profile.uid} className={`chat-window ${minimized ? 'is-min' : ''}`} aria-label={`Chat con ${profile.displayName}`}>
                  <header className="chat-window__head">
                    <button type="button" className="chat-window__title" onClick={() => toggle(profile.uid)} aria-expanded={!minimized}>
                      <Avatar profile={profile} size={28} />
                      <strong>{profile.displayName}</strong>
                    </button>
                    <Link to={`/mensajes/${profile.handle}`} className="chat-window__btn" title="Abrir en pantalla completa" onClick={() => close(profile.uid)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" /></svg>
                      <span className="sr-only">Abrir en pantalla completa</span>
                    </Link>
                    <button type="button" className="chat-window__btn" onClick={() => toggle(profile.uid)} title={minimized ? 'Expandir' : 'Minimizar'}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d={minimized ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} /></svg>
                      <span className="sr-only">{minimized ? 'Expandir chat' : 'Minimizar chat'}</span>
                    </button>
                    <button type="button" className="chat-window__btn" onClick={() => close(profile.uid)} title="Cerrar">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                      <span className="sr-only">Cerrar chat con {profile.displayName}</span>
                    </button>
                  </header>
                  {!minimized && chats && <Conversation me={user.uid} other={profile} chat={chat} compact />}
                </section>
              )
            })}
          </div>,
          document.body,
        )}
    </ChatDockContext.Provider>
  )
}
