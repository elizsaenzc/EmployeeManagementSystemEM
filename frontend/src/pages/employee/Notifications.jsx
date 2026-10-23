import { useState } from 'react'
import { Info, TriangleAlert, Siren, Settings, Bell, Megaphone, CheckCircle2, AlertCircle, CheckCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { notificationsApi } from '../../services/api'
import { Topbar, Spinner, Empty, Modal } from '../../components/ui'

const TYPES = {
  Info:    { icon: Info,          tone: 'blue',  label: 'Informativo' },
  Aviso:   { icon: TriangleAlert, tone: 'amber', label: 'Aviso' },
  Urgente: { icon: Siren,         tone: 'red',   label: 'Urgente' },
  Sistema: { icon: Settings,      tone: 'muted', label: 'Sistema' },
}

const when = iso => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Notifications() {
  const { user } = useAuth()
  const canBroadcast = user?.role === 'HR' || user?.role === 'Admin'

  const [modal, setModal]   = useState(false)
  const [bcast, setBcast]   = useState({ title: '', body: '', type: 'Info' })
  const [notice, setNotice] = useState(null)

  const { data: notifs, loading, refetch } = useApi(notificationsApi.getAll, [])
  const unread = notifs?.filter(n => !n.isRead) ?? []

  const markRead = async id => { await notificationsApi.markRead(id); refetch() }
  const markAll  = async () => { await Promise.all(unread.map(n => notificationsApi.markRead(n.id))); refetch() }

  const broadcast = async () => {
    try {
      const { data } = await notificationsApi.broadcast(bcast)
      setModal(false)
      setBcast({ title: '', body: '', type: 'Info' })
      setNotice({ ok: true, text: `Aviso enviado a ${data.sent} personas` })
      refetch()
    } catch (e) {
      setNotice({ ok: false, text: e.response?.data?.message ?? 'No se pudo enviar el aviso' })
    }
  }

  return (
    <>
      <Topbar title="Notificaciones">
        {unread.length > 0 && (
          <button className="btn btn-secondary" onClick={markAll}><CheckCheck size={16} /> Marcar todo como leído</button>
        )}
        {canBroadcast && (
          <button className="btn btn-primary" onClick={() => setModal(true)}><Megaphone size={16} /> Enviar aviso</button>
        )}
      </Topbar>

      <div className="page section-gap">
        {notice && (
          <div className={`alert ${notice.ok ? 'alert-success' : 'alert-error'}`}>
            {notice.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {notice.text}
          </div>
        )}
        {loading ? <Spinner /> : !notifs?.length ? (
          <Empty icon={Bell} text="No tienes notificaciones" />
        ) : (
          <div className="card list-card">
            {notifs.map(n => {
              const t = TYPES[n.type] ?? TYPES.Info
              const Icon = t.icon
              return (
                <div key={n.id} className={`notif-row ${n.isRead ? '' : 'unread'}`}
                     role={n.isRead ? undefined : 'button'} tabIndex={n.isRead ? undefined : 0}
                     onClick={() => !n.isRead && markRead(n.id)}
                     onKeyDown={e => e.key === 'Enter' && !n.isRead && markRead(n.id)}>
                  <div className={`notif-icon tone-${t.tone}`}><Icon size={17} strokeWidth={1.75} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="notif-top">
                      <span className="notif-title">{n.title}</span>
                      <span className="text-xs text-muted">{when(n.createdAt)}</span>
                    </div>
                    <div className="notif-body">{n.body}</div>
                  </div>
                  {!n.isRead && <span className="unread-dot" aria-label="Sin leer" />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <Modal title="Enviar aviso a toda la empresa" onClose={() => setModal(false)}
               footer={<>
                 <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                 <button className="btn btn-primary" onClick={broadcast} disabled={!bcast.title.trim() || !bcast.body.trim()}>
                   <Megaphone size={15} /> Enviar a todos
                 </button>
               </>}>
          <div className="form-grid cols-1">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-input" value={bcast.type} onChange={e => setBcast(p => ({ ...p, type: e.target.value }))}>
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Título</label>
              <input className="form-input" value={bcast.title} onChange={e => setBcast(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Mensaje</label>
              <textarea className="form-input" rows={4} value={bcast.body} onChange={e => setBcast(p => ({ ...p, body: e.target.value }))} />
            </div>
          </div>
          <p className="text-sm text-muted mt-12">Lo recibirá toda la plantilla en su bandeja de notificaciones.</p>
        </Modal>
      )}
    </>
  )
}
