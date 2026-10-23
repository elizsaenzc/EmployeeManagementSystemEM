import { useState } from 'react'
import { useAuth }   from '../../context/AuthContext'
import { useApi }    from '../../hooks/useApi'
import { notificationsApi } from '../../services/api'
import { Topbar, Spinner, Empty, Modal } from '../../components/ui'

const TYPE_ICON  = { Info: 'ℹ️', Aviso: '⚠️', Urgente: '🚨', Sistema: '⚙️' }
const TYPE_COLOR = {
  Info:    'var(--brand-light)',
  Aviso:   'var(--amber)',
  Urgente: 'var(--red)',
  Sistema: 'var(--text3)',
}

export default function Notifications() {
  const { user } = useAuth()
  const canBroadcast = user?.role === 'HR' || user?.role === 'Admin'
  const empId = user?.employeeId

  const [modal, setModal]     = useState(false)
  const [bcast, setBcast]     = useState({ title: '', body: '', type: 'Info' })

  const { data: notifs, loading, refetch } = useApi(
    () => notificationsApi.getAll({ employeeId: empId }), [empId]
  )

  const handleRead = async id => {
    await notificationsApi.markRead(id)
    refetch()
  }

  const handleBroadcast = async () => {
    await notificationsApi.broadcast(bcast)
    setModal(false)
    setBcast({ title: '', body: '', type: 'Info' })
  }

  const unread = notifs?.filter(n => !n.isRead).length ?? 0

  return (
    <>
      <Topbar title="Notificaciones">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {unread > 0 && (
            <span className="badge badge-red">{unread} sin leer</span>
          )}
          {canBroadcast && (
            <button className="btn btn-primary" onClick={() => setModal(true)}>
              📢 Enviar aviso
            </button>
          )}
        </div>
      </Topbar>

      <div className="page section-gap">
        {loading ? <Spinner /> : !notifs?.length
          ? <Empty icon="🔔" text="No tienes notificaciones por el momento" />
          : (
            <div className="card" style={{ padding: 0 }}>
              {notifs.map((n, i) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleRead(n.id)}
                  style={{
                    display: 'flex', gap: 14, padding: '14px 20px', cursor: !n.isRead ? 'pointer' : 'default',
                    borderBottom: i < notifs.length - 1 ? '1px solid var(--border)' : 'none',
                    background: !n.isRead ? '#EFF6FF' : 'transparent',
                    transition: 'background .15s',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={e => { if (!n.isRead) e.currentTarget.style.background = '#DBEAFE' }}
                  onMouseLeave={e => { if (!n.isRead) e.currentTarget.style.background = '#EFF6FF' }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: TYPE_COLOR[n.type] + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17
                  }}>
                    {TYPE_ICON[n.type] ?? 'ℹ️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 13 }}>{n.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {new Date(n.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{n.body}</div>
                  </div>
                  {!n.isRead && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--brand-light)', flexShrink: 0, marginTop: 6
                    }} />
                  )}
                </div>
              ))}
            </div>
          )
        }
      </div>

      {modal && (
        <Modal title="Enviar aviso a toda la empresa" onClose={() => setModal(false)}
               footer={
                 <>
                   <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                   <button className="btn btn-primary" onClick={handleBroadcast}
                           disabled={!bcast.title || !bcast.body}>
                     📢 Enviar a todos
                   </button>
                 </>
               }>
          <div className="form-grid cols-1" style={{ gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Tipo de notificación</label>
              <select className="form-input" value={bcast.type}
                      onChange={e => setBcast(p => ({ ...p, type: e.target.value }))}>
                <option value="Info">ℹ️ Informativo</option>
                <option value="Aviso">⚠️ Aviso</option>
                <option value="Urgente">🚨 Urgente</option>
                <option value="Sistema">⚙️ Sistema</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Asunto / Título</label>
              <input className="form-input" value={bcast.title}
                     onChange={e => setBcast(p => ({ ...p, title: e.target.value }))}
                     placeholder="Título del aviso" />
            </div>
            <div className="form-group">
              <label className="form-label">Mensaje</label>
              <textarea className="form-input" rows={4} value={bcast.body}
                        onChange={e => setBcast(p => ({ ...p, body: e.target.value }))}
                        placeholder="Escribe el mensaje completo aquí…"
                        style={{ resize: 'vertical' }} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>
            Este aviso se enviará a los {' '}<strong>20 empleados</strong>{' '}de la empresa.
          </p>
        </Modal>
      )}
    </>
  )
}
