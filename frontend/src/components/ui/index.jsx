import { avatarColor, statusCls } from '../../hooks/useApi'

export function Spinner() {
  return <div className="spinner-box"><div className="spinner" /></div>
}

export function Empty({ icon = '📋', text = 'Sin datos' }) {
  return (
    <div className="empty-box">
      <div className="empty-icon">{icon}</div>
      <div>{text}</div>
    </div>
  )
}

export function Avatar({ name = '', size = 'av-md' }) {
  const initials = name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
  return <div className={`avatar ${size} ${avatarColor(name)}`}>{initials}</div>
}

export function Badge({ label, status }) {
  const cls = status ? statusCls(status) : 'badge-muted'
  return <span className={`badge ${cls}`}>{label ?? status}</span>
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 720 } : {}}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Topbar({ title, children }) {
  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-right">{children}</div>
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button key={t.id} className={`tab ${active === t.id ? 'active' : ''}`}
                onClick={() => onChange(t.id)}>
          {t.label}
          {t.count != null && (
            <span style={{ marginLeft: 5, background: 'var(--border)', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Confirm({ message, onConfirm, onClose }) {
  return (
    <Modal
      title="Confirmar"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirmar</button>
        </>
      }
    >
      <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>{message}</p>
    </Modal>
  )
}
