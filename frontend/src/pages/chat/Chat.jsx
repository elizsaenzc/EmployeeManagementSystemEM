import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Send, MessageSquare, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApi, label } from '../../hooks/useApi'
import { chatApi } from '../../services/api'
import { Spinner, Topbar, Avatar } from '../../components/ui'

const time = iso => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
const dayLabel = iso => {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function Chat() {
  const { user } = useAuth()
  const empId = user?.employeeId

  const [contact, setContact]   = useState(null)
  const [messages, setMessages] = useState([])
  const [loadMsgs, setLoadMsgs] = useState(false)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const bottomRef = useRef(null)

  const { data: contacts, loading: loadContacts } = useApi(chatApi.getContacts, [])

  const term = search.trim().toLowerCase()
  const filtered = (contacts ?? []).filter(c =>
    !term || `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) || c.position.toLowerCase().includes(term))

  const fetchConversation = useCallback(async id => {
    const res = await chatApi.getConversation(id)
    setMessages(res.data)
  }, [])

  const openConversation = async c => {
    setContact(c)
    setError('')
    setLoadMsgs(true)
    try { await fetchConversation(c.id) }
    catch { setError('No se pudo cargar la conversación') }
    finally { setLoadMsgs(false) }
  }

  // Refresco periódico de la conversación abierta
  useEffect(() => {
    if (!contact) return
    const t = setInterval(() => fetchConversation(contact.id).catch(() => {}), 10000)
    return () => clearInterval(t)
  }, [contact, fetchConversation])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const body = text.trim()
    if (!body || !contact) return
    setSending(true)
    setError('')
    try {
      const res = await chatApi.send({ recipientId: contact.id, body })
      setMessages(prev => [...prev, res.data])
      setText('')
    } catch (e) {
      setError(e.response?.data?.message ?? 'No se pudo enviar el mensaje')
    } finally {
      setSending(false)
    }
  }

  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const contactName = contact ? `${contact.firstName} ${contact.lastName}` : ''

  return (
    <>
      <Topbar title="Chat" />
      <div className={`chat-shell ${contact ? 'has-contact' : ''}`}>
        <aside className="chat-sidebar" aria-label="Contactos">
          <div className="chat-search">
            <div className="search-wrap">
              <Search className="search-ico" size={15} />
              <input className="form-input" placeholder="Buscar persona" value={search}
                     onChange={e => setSearch(e.target.value)} aria-label="Buscar contacto" />
            </div>
          </div>
          {loadContacts ? <Spinner /> : filtered.map(c => {
            const name = `${c.firstName} ${c.lastName}`
            return (
              <button key={c.id} className={`contact-row ${contact?.id === c.id ? 'active' : ''}`}
                      onClick={() => openConversation(c)}>
                <Avatar name={name} size="av-sm" />
                <span className="min-w-0">
                  <span className="contact-name">{name}</span>
                  <span className="contact-meta">{c.position}</span>
                </span>
              </button>
            )
          })}
        </aside>

        <section className="chat-main">
          {!contact ? (
            <div className="chat-placeholder">
              <MessageSquare size={36} strokeWidth={1.25} />
              <div className="fw-600">Chat interno</div>
              <div className="text-sm">Elige una persona de la lista para empezar a escribir.</div>
            </div>
          ) : (
            <>
              <header className="chat-header">
                <button className="btn btn-ghost btn-icon chat-back" onClick={() => setContact(null)} aria-label="Volver a contactos">
                  <ArrowLeft size={18} />
                </button>
                <Avatar name={contactName} size="av-md" />
                <div className="min-w-0">
                  <div className="fw-600">{contactName}</div>
                  <div className="text-sm text-muted">{contact.position} · {label(contact.department)}</div>
                </div>
              </header>

              <div className="chat-messages">
                {loadMsgs ? <Spinner /> : !messages.length ? (
                  <div className="chat-empty">Todavía no hay mensajes con {contact.firstName}.</div>
                ) : messages.map((msg, i) => {
                  const isMe = msg.senderId === empId
                  const showDay = i === 0 || dayLabel(messages[i - 1].sentAt) !== dayLabel(msg.sentAt)
                  return (
                    <div key={msg.id} className="chat-row-wrap">
                      {showDay && <div className="chat-day">{dayLabel(msg.sentAt)}</div>}
                      <div className={`chat-row ${isMe ? 'me' : 'other'}`}>
                        <div className={`chat-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>{msg.body}</div>
                        <span className="chat-time">{time(msg.sentAt)}</span>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {error && <div className="chat-error">{error}</div>}
              <div className="chat-input-row">
                <textarea className="form-input chat-input" rows={1} value={text}
                          placeholder={`Escribe a ${contact.firstName}…`} aria-label="Mensaje"
                          onChange={e => setText(e.target.value)} onKeyDown={onKey} />
                <button className="btn btn-primary" onClick={send} disabled={sending || !text.trim()}>
                  <Send size={15} /> Enviar
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
