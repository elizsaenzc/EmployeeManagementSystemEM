import { useState } from 'react'
import { useAuth }   from '../../context/AuthContext'
import { useApi }    from '../../hooks/useApi'
import { emailApi, employeesApi } from '../../services/api'
import { Spinner, Empty, Modal } from '../../components/ui'

const FOLDERS = [
  { id: 'inbox',   label: 'Bandeja de entrada', icon: '📥' },
  { id: 'sent',    label: 'Enviados',            icon: '📤' },
  { id: 'starred', label: 'Destacados',          icon: '⭐' },
  { id: 'trash',   label: 'Papelera',            icon: '🗑️' },
]

export default function Email() {
  const { user } = useAuth()
  const empId    = user?.employeeId

  const [folder,   setFolder]   = useState('inbox')
  const [selected, setSelected] = useState(null)
  const [compose,  setCompose]  = useState(false)
  const [draft,    setDraft]    = useState({ recipientId: '', subject: '', body: '' })
  const [sending,  setSending]  = useState(false)

  const params = folder === 'starred'
    ? { employeeId: empId, folder: 'inbox' }
    : { employeeId: empId, folder }

  const { data: emails, loading, refetch } = useApi(
    () => emailApi.getAll({ employeeId: empId, folder }), [empId, folder]
  )
  const { data: employees } = useApi(employeesApi.getAll, [])

  // For starred, filter client-side
  const displayed = folder === 'starred'
    ? (emails ?? []).filter(e => e.isStarred)
    : (emails ?? [])

  const handleSelect = async email => {
    setSelected(email)
    if (!email.isRead) {
      await emailApi.markRead(email.id)
      refetch()
    }
  }

  const handleStar = async (e, email) => {
    e.stopPropagation()
    await emailApi.toggleStar(email.id)
    refetch()
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    await emailApi.delete(id)
    setSelected(null)
    refetch()
  }

  const handleSend = async () => {
    if (!draft.recipientId || !draft.subject || !draft.body) return
    setSending(true)
    try {
      await emailApi.send({
        recipientId: parseInt(draft.recipientId),
        subject: draft.subject,
        body: draft.body
      })
      setCompose(false)
      setDraft({ recipientId: '', subject: '', body: '' })
      if (folder === 'sent') refetch()
    } finally {
      setSending(false)
    }
  }

  const unreadCount = (emails ?? []).filter(e => !e.isRead && folder === 'inbox').length

  return (
    <div className="email-shell">
      {/* Left folder panel */}
      <div className="email-left">
        <button className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}
                onClick={() => setCompose(true)}>
          ✏️ Redactar
        </button>
        {FOLDERS.map(f => (
          <button key={f.id} className={`email-folder-btn ${folder === f.id ? 'active' : ''}`}
                  onClick={() => { setFolder(f.id); setSelected(null) }}>
            <span>{f.icon}</span>
            <span style={{ flex: 1 }}>{f.label}</span>
            {f.id === 'inbox' && unreadCount > 0 && (
              <span style={{
                background: 'var(--brand-light)', color: '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700
              }}>{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Email list */}
      <div className="email-list" style={{ width: 320 }}>
        {loading ? <Spinner /> : !displayed?.length
          ? <Empty icon="📭" text="Esta carpeta está vacía" />
          : displayed.map(email => (
            <div key={email.id}
                 className={`email-row ${!email.isRead ? 'unread' : ''} ${selected?.id === email.id ? 'selected' : ''}`}
                 onClick={() => handleSelect(email)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontWeight: email.isRead ? 400 : 700, fontSize: 13, color: 'var(--text)' }}>
                  {folder === 'sent' ? email.recipientName : email.senderName}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={e => handleStar(e, email)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: email.isStarred ? 1 : 0.3 }}>
                    ⭐
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {new Date(email.sentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
              <div style={{ fontWeight: email.isRead ? 400 : 600, fontSize: 13, marginBottom: 3 }}>
                {email.subject}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {email.body.slice(0, 75)}…
              </div>
            </div>
          ))
        }
      </div>

      {/* Email detail */}
      <div className="email-detail">
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✉️</div>
            <div>Selecciona un correo para leerlo</div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, lineHeight: 1.4 }}>
                {selected.subject}
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13 }}>
                  <div style={{ marginBottom: 4 }}>
                    <span className="text-muted">De: </span>
                    <strong>{selected.senderName}</strong>
                    <span className="text-muted" style={{ marginLeft: 6 }}>&lt;{selected.senderEmail}&gt;</span>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span className="text-muted">Para: </span>
                    <strong>{selected.recipientName}</strong>
                    <span className="text-muted" style={{ marginLeft: 6 }}>&lt;{selected.recipientEmail}&gt;</span>
                  </div>
                  <div>
                    <span className="text-muted">Fecha: </span>
                    {new Date(selected.sentAt).toLocaleDateString('es-ES', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setDraft({ recipientId: selected.senderId, subject: `Re: ${selected.subject}`, body: '' })
                            setCompose(true)
                          }}>
                    ↩ Responder
                  </button>
                  <button className="btn btn-danger btn-sm"
                          onClick={e => handleDelete(e, selected.id)}>
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
              {selected.body}
            </div>

            {selected.attachmentName && (
              <div style={{ marginTop: 20, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                📎 <strong>{selected.attachmentName}</strong>
                <span className="text-muted">— Adjunto</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compose modal */}
      {compose && (
        <Modal title="Nuevo mensaje" onClose={() => setCompose(false)}
               footer={
                 <>
                   <button className="btn btn-secondary" onClick={() => setCompose(false)}>Descartar</button>
                   <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
                     {sending ? 'Enviando…' : '📤 Enviar'}
                   </button>
                 </>
               }>
          <div className="form-grid cols-1" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Para</label>
              <select className="form-input" value={draft.recipientId}
                      onChange={e => setDraft(p => ({ ...p, recipientId: e.target.value }))}>
                <option value="">— Selecciona destinatario —</option>
                {(employees ?? [])
                  .filter(e => e.id !== empId)
                  .map(e => (
                    <option key={e.id} value={e.id}>{e.fullName} — {e.email}</option>
                  ))
                }
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Asunto</label>
              <input className="form-input" value={draft.subject}
                     onChange={e => setDraft(p => ({ ...p, subject: e.target.value }))}
                     placeholder="Asunto del correo" />
            </div>
            <div className="form-group">
              <label className="form-label">Mensaje</label>
              <textarea className="form-input" rows={7} value={draft.body}
                        onChange={e => setDraft(p => ({ ...p, body: e.target.value }))}
                        placeholder="Escribe tu mensaje aquí…"
                        style={{ resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
