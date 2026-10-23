import { useState } from 'react'
import {
  Inbox, Send, Star, Trash2, SquarePen, Reply, Paperclip, Mail, ArrowLeft, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { emailApi, employeesApi } from '../../services/api'
import { Spinner, Empty, Modal, Topbar, Avatar } from '../../components/ui'

const FOLDERS = [
  { id: 'inbox',   label: 'Recibidos',  icon: Inbox },
  { id: 'sent',    label: 'Enviados',   icon: Send },
  { id: 'starred', label: 'Destacados', icon: Star },
  { id: 'trash',   label: 'Papelera',   icon: Trash2 },
]

const emptyDraft = { recipientId: '', subject: '', body: '' }

const listDate = iso => {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
const preview = body => (body.length > 90 ? `${body.slice(0, 90).trimEnd()}…` : body)

export default function Email() {
  const { user } = useAuth()
  const empId = user?.employeeId

  const [folder, setFolder]     = useState('inbox')
  const [selected, setSelected] = useState(null)
  const [compose, setCompose]   = useState(false)
  const [draft, setDraft]       = useState(emptyDraft)
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')

  const { data: emails, loading, refetch } = useApi(() => emailApi.getAll({ folder }), [folder])
  const { data: employees } = useApi(employeesApi.getAll, [])

  const select = async email => {
    setSelected(email)
    // Solo el destinatario marca un correo como leído
    if (!email.isRead && email.recipientId === empId) {
      await emailApi.markRead(email.id)
      refetch()
    }
  }

  const toggleStar = async (e, email) => {
    e.stopPropagation()
    await emailApi.toggleStar(email.id)
    if (selected?.id === email.id) setSelected({ ...selected, isStarred: !email.isStarred })
    refetch()
  }

  const remove = async id => {
    await emailApi.delete(id)
    setSelected(null)
    refetch()
  }

  const openCompose = (d = emptyDraft) => { setDraft(d); setError(''); setCompose(true) }

  const send = async () => {
    if (!draft.recipientId || !draft.subject.trim() || !draft.body.trim()) {
      setError('Indica destinatario, asunto y mensaje.')
      return
    }
    setSending(true)
    setError('')
    try {
      await emailApi.send({ recipientId: parseInt(draft.recipientId, 10), subject: draft.subject.trim(), body: draft.body })
      setCompose(false)
      setDraft(emptyDraft)
      if (folder === 'sent') refetch()
    } catch (e) {
      setError(e.response?.data?.message ?? 'No se pudo enviar el correo')
    } finally {
      setSending(false)
    }
  }

  const unread = folder === 'inbox' ? (emails ?? []).filter(e => !e.isRead).length : 0
  const who = email => (folder === 'sent' || email.senderId === empId ? `Para: ${email.recipientName}` : email.senderName)

  return (
    <>
      <Topbar title="Correo">
        <button className="btn btn-primary" onClick={() => openCompose()}>
          <SquarePen size={16} /> Redactar
        </button>
      </Topbar>

      <div className={`email-shell ${selected ? 'has-selection' : ''}`}>
        <nav className="email-left" aria-label="Carpetas">
          {FOLDERS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`email-folder-btn ${folder === id ? 'active' : ''}`}
                    onClick={() => { setFolder(id); setSelected(null) }}>
              <Icon size={16} strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {id === 'inbox' && unread > 0 && <span className="count-pill">{unread}</span>}
            </button>
          ))}
        </nav>

        <div className="email-list">
          {loading ? <Spinner /> : !emails?.length ? (
            <Empty icon={Mail} text="No hay correos en esta carpeta" />
          ) : emails.map(email => (
            <div key={email.id} role="button" tabIndex={0}
                 className={`email-row ${!email.isRead && email.recipientId === empId ? 'unread' : ''} ${selected?.id === email.id ? 'selected' : ''}`}
                 onClick={() => select(email)} onKeyDown={e => e.key === 'Enter' && select(email)}>
              <div className="email-row-top">
                <span className="email-from">{who(email)}</span>
                <span className="email-date">{listDate(email.sentAt)}</span>
              </div>
              <div className="email-row-subject">
                <span className="email-subject">{email.subject}</span>
                <button className={`star-btn ${email.isStarred ? 'on' : ''}`} onClick={e => toggleStar(e, email)}
                        aria-label={email.isStarred ? 'Quitar de destacados' : 'Destacar'}>
                  <Star size={14} />
                </button>
              </div>
              <div className="email-preview">{preview(email.body)}</div>
            </div>
          ))}
        </div>

        <article className="email-detail">
          {!selected ? (
            <div className="email-placeholder">
              <Mail size={36} strokeWidth={1.25} />
              <div>Selecciona un correo para leerlo</div>
            </div>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm email-back" onClick={() => setSelected(null)}>
                <ArrowLeft size={15} /> Volver
              </button>
              <h2 className="email-title">{selected.subject}</h2>
              <div className="email-meta">
                <Avatar name={selected.senderName} size="av-md" />
                <div className="min-w-0 flex-1">
                  <div><strong>{selected.senderName}</strong> <span className="text-muted">&lt;{selected.senderEmail}&gt;</span></div>
                  <div className="text-sm text-muted">Para {selected.recipientName} · {new Date(selected.sentAt).toLocaleString('es-ES', {
                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}</div>
                </div>
                <div className="flex gap-8">
                  {selected.senderId !== empId && (
                    <button className="btn btn-secondary btn-sm"
                            onClick={() => openCompose({ recipientId: String(selected.senderId), subject: `Re: ${selected.subject}`, body: '' })}>
                      <Reply size={14} /> Responder
                    </button>
                  )}
                  {folder !== 'trash' && (
                    <button className="btn btn-ghost btn-icon" onClick={() => remove(selected.id)}
                            title="Mover a la papelera" aria-label="Mover a la papelera"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
              <div className="email-body">{selected.body}</div>
              {selected.attachmentName && (
                <div className="attachment"><Paperclip size={14} /> {selected.attachmentName}</div>
              )}
            </>
          )}
        </article>
      </div>

      {compose && (
        <Modal title="Nuevo correo" onClose={() => setCompose(false)}
               footer={
                 <>
                   <button className="btn btn-secondary" onClick={() => setCompose(false)}>Descartar</button>
                   <button className="btn btn-primary" onClick={send} disabled={sending}>
                     <Send size={15} /> {sending ? 'Enviando…' : 'Enviar'}
                   </button>
                 </>
               }>
          {error && <div className="alert alert-error mb-16"><AlertCircle size={16} /> {error}</div>}
          <div className="form-grid cols-1">
            <div className="form-group">
              <label className="form-label" htmlFor="mail-to">Para</label>
              <select id="mail-to" className="form-input" value={draft.recipientId}
                      onChange={e => setDraft(p => ({ ...p, recipientId: e.target.value }))}>
                <option value="">Selecciona destinatario</option>
                {(employees ?? []).filter(e => e.id !== empId && e.isActive).map(e => (
                  <option key={e.id} value={e.id}>{e.fullName} · {e.email}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="mail-subject">Asunto</label>
              <input id="mail-subject" className="form-input" value={draft.subject}
                     onChange={e => setDraft(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="mail-body">Mensaje</label>
              <textarea id="mail-body" className="form-input" rows={8} value={draft.body}
                        onChange={e => setDraft(p => ({ ...p, body: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
