import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { avatarColor } from '../../hooks/useApi'

const ROLE_NAV = {
  Employee: [
    { section: 'Mi Jornada' },
    { path: '/dashboard',      label: 'Inicio',           icon: '🏠' },
    { path: '/attendance',     label: 'Asistencia',       icon: '🕐' },
    { path: '/schedule',       label: 'Mi Horario',       icon: '📅' },
    { section: 'Solicitudes' },
    { path: '/leaves',         label: 'Vacaciones',       icon: '🌴' },
    { path: '/overtime',       label: 'Horas Extra',      icon: '⏱' },
    { path: '/documents',      label: 'Nóminas',          icon: '💶' },
    { path: '/performance',    label: 'Mi Desempeño',     icon: '📊' },
    { section: 'Comunicación' },
    { path: '/notifications',  label: 'Notificaciones',   icon: '🔔' },
    { path: '/email',          label: 'Correo',           icon: '✉️' },
    { path: '/chat',           label: 'Chat',             icon: '💬' },
  ],
  Coordinator: [
    { section: 'Mi Jornada' },
    { path: '/dashboard',      label: 'Dashboard',        icon: '🏠' },
    { path: '/attendance',     label: 'Asistencia',       icon: '🕐' },
    { section: 'Mi Equipo' },
    { path: '/team',           label: 'Mi Equipo',        icon: '👥' },
    { path: '/leaves',         label: 'Permisos',         icon: '🌴' },
    { path: '/overtime',       label: 'Horas Extra',      icon: '⏱' },
    { path: '/performance',    label: 'Evaluaciones',     icon: '📊' },
    { section: 'Mis documentos' },
    { path: '/documents',      label: 'Nóminas',          icon: '💶' },
    { section: 'Comunicación' },
    { path: '/notifications',  label: 'Notificaciones',   icon: '🔔' },
    { path: '/email',          label: 'Correo',           icon: '✉️' },
    { path: '/chat',           label: 'Chat',             icon: '💬' },
  ],
  HR: [
    { section: 'General' },
    { path: '/dashboard',      label: 'Dashboard',        icon: '🏠' },
    { section: 'Empleados' },
    { path: '/employees',      label: 'Plantilla',        icon: '👥' },
    { path: '/attendance',     label: 'Control Horario',  icon: '🕐' },
    { path: '/leaves',         label: 'Permisos',         icon: '🌴' },
    { path: '/overtime',       label: 'Horas Extra',      icon: '⏱' },
    { section: 'Nómina' },
    { path: '/payroll',        label: 'Gestión Nóminas',  icon: '💶' },
    { path: '/reports',        label: 'Informes',         icon: '📈' },
    { section: 'Desempeño' },
    { path: '/performance',    label: 'Evaluaciones',     icon: '📊' },
    { section: 'Comunicación' },
    { path: '/notifications',  label: 'Notificaciones',   icon: '🔔' },
    { path: '/email',          label: 'Correo',           icon: '✉️' },
    { path: '/chat',           label: 'Chat',             icon: '💬' },
  ],
  Admin: [
    { section: 'General' },
    { path: '/dashboard',      label: 'Dashboard',        icon: '🏠' },
    { section: 'Gestión' },
    { path: '/employees',      label: 'Empleados',        icon: '👥' },
    { path: '/attendance',     label: 'Asistencia',       icon: '🕐' },
    { path: '/leaves',         label: 'Permisos',         icon: '🌴' },
    { path: '/overtime',       label: 'Horas Extra',      icon: '⏱' },
    { section: 'Económico' },
    { path: '/payroll',        label: 'Nóminas',          icon: '💶' },
    { path: '/reports',        label: 'Informes',         icon: '📈' },
    { section: 'Calidad' },
    { path: '/performance',    label: 'Evaluaciones',     icon: '📊' },
    { section: 'Comunicación' },
    { path: '/notifications',  label: 'Avisos empresa',   icon: '🔔' },
    { path: '/email',          label: 'Correo',           icon: '✉️' },
    { path: '/chat',           label: 'Chat',             icon: '💬' },
  ],
}

const ROLE_LABELS = {
  Employee: 'Empleado', Coordinator: 'Coordinador', HR: 'RRHH', Admin: 'Administrador'
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate   = useNavigate()
  const { pathname } = useLocation()

  const nav = ROLE_NAV[user?.role] ?? ROLE_NAV.Employee
  const initials = user?.fullName?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() ?? 'US'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-brand">ESC Media &amp; Tech</div>
        <div className="logo-sub">Portal de RRHH</div>
      </div>

      <div className="sidebar-user">
        <div className="user-chip">
          <div className={`user-av ${avatarColor(user?.fullName ?? '')}`}>{initials}</div>
          <div>
            <div className="user-name">{user?.fullName?.split(' ')[0] ?? user?.username}</div>
            <div className="user-role">{ROLE_LABELS[user?.role] ?? user?.role}</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map((item, i) =>
          item.section
            ? <div key={i} className="nav-section">{item.section}</div>
            : (
              <button
                key={item.path}
                className={`nav-item ${pathname.startsWith(item.path) && item.path !== '/' ? 'active' : pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            )
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" style={{ color: 'rgba(255,255,255,.5)' }} onClick={logout}>
          <span className="nav-icon">🚪</span> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
