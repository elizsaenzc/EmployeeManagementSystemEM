import { useEffect } from 'react'
import { Inbox, X, Menu } from 'lucide-react'
import { avatarColor, statusCls, label as enumLabel } from '../../hooks/useApi'
import { useShell } from '../layout/ShellContext'

export function Spinner() {
  return <div className="spinner-box"><div className="spinner" /></div>
}

export function Empty({ icon: Icon = Inbox, text = 'Sin datos' }) {
  return (
    <div className="empty-box">
      <div className="empty-icon"><Icon size={28} strokeWidth={1.5} /></div>
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
  return <span className={`badge ${cls}`}>{label ?? enumLabel(status)}</span>
}

export function Modal({ title, onClose, children, footer, wide }) {
  // Cerrar con Escape
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { maxWidth: 720 } : {}}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Topbar({ title, children }) {
  const { setNavOpen } = useShell()
  return (
    <div className="topbar">
      <button className="topbar-menu" onClick={() => setNavOpen(true)} aria-label="Abrir menú">
        <Menu size={20} />
      </button>
      <h1 className="topbar-title">{title}</h1>
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
            <span className="tab-count">{t.count}</span>
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
