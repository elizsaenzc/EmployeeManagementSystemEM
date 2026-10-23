import { useState, useEffect, useRef } from 'react'
import { useAuth }   from '../../context/AuthContext'
import { useApi, avatarColor } from '../../hooks/useApi'
import { chatApi }   from '../../services/api'
import { Spinner }   from '../../components/ui'

const DEPT_LABELS = {
  Direccion: 'Dirección', Tecnologia: 'Tecnología', Marketing: 'Marketing',
  Ventas: 'Ventas', Finanzas: 'Finanzas', RRHH: 'RRHH',
  Operaciones: 'Operaciones', Legal: 'Legal', Atencion_al_Cliente: 'Atención al cliente'
}

export default function Chat() {
  const { user } = useAuth()
  const empId    = user?.employeeId

  const [contact, setContact]   = useState(null)
  const [messages, setMessages] = useState([])
  const [loadMsgs, setLoadMsgs] = useState(false)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [search, setSearch]     = useState('')
  const bottomRef               = useRef(null)

  const { data: contacts, loading: loadContacts } = useApi(chatApi.getContacts, [])

  const filtered = (contacts ?? []).filter(c =>
    search === '' ||
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    c.position.toLowerCase().includes(search.toLowerCase())
  )

  const loadConversation = async c => {
    setContact(c)
    setLoadMsgs(true)
    try {
      const res = await chatApi.getConversation(c.id)
      setMessages(res.data)
    } finally {
      setLoadMsgs(false)
    }
  }

  const handleSend = async () => {
    if (!text.trim() || !contact) return
    setSending(true)
    try {
      const res = await chatApi.send({ recipientId: contact.id, body: text.trim() })
      setMessages(prev => [...prev, res.data])
      setText('')
    } finally {
      setSending(false)
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initials = name => name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()

  return (
    <div className="chat-shell">
      {/* Contacts sidebar */}
      <div className="chat-sidebar">
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <input
            className="form-input"
            placeholder="Buscar persona…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>

        {loadContacts ? <Spinner /> : (
          <div>
            {filtered.map(c => {
              const name     = `${c.firstName} ${c.lastName}`
              const avClass  = avatarColor(name)
              const isActive = contact?.id === c.id
              return (
                <div
                  key={c.id}
                  onClick={() => loadConversation(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    background: isActive ? 'var(--brand-dim)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background .12s'
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className={`avatar av-sm ${avClass}`}>{initials(name)}</div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: isActive ? 'var(--brand-light)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.position}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="chat-main">
        {!contact ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Chat corporativo</div>
            <div style={{ fontSize: 13 }}>Selecciona un contacto para iniciar una conversación</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 18px', borderBottom: '1px solid var(--border)',
              background: 'var(--surface)'
            }}>
              <div className={`avatar av-md ${avatarColor(`${contact.firstName} ${contact.lastName}`)}`}>
                {initials(`${contact.firstName} ${contact.lastName}`)}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{contact.firstName} {contact.lastName}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {contact.position} · {DEPT_LABELS[contact.department] ?? contact.department}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {loadMsgs ? <Spinner /> : !messages.length ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, marginTop: 30 }}>
                  No hay mensajes aún. ¡Empieza la conversación!
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === empId
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {!isMe && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3, marginLeft: 4 }}>
                          {msg.senderName}
                        </span>
                      )}
                      <div className={`chat-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                        {msg.body}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, marginLeft: 4, marginRight: 4 }}>
                        {new Date(msg.sentAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="chat-input-row">
              <textarea
                className="form-input"
                style={{ flex: 1, resize: 'none', height: 40, padding: '8px 12px', fontSize: 13 }}
                placeholder={`Mensaje a ${contact.firstName}…`}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />
              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={sending || !text.trim()}
                style={{ height: 40, padding: '0 16px' }}
              >
                {sending ? '…' : '↑ Enviar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
