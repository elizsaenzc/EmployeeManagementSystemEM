import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Clock, CalendarDays, CalendarCheck, Timer, Wallet, ClipboardCheck,
  ChartColumn, Bell, Mail, MessageSquare, Users, LogOut, Building2, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { avatarColor } from '../../hooks/useApi'
import { useShell } from './ShellContext'

const ROLE_NAV = {
  Employee: [
    { section: 'Mi jornada' },
    { path: '/dashboard',     label: 'Inicio',          icon: LayoutDashboard },
    { path: '/attendance',    label: 'Asistencia',      icon: Clock },
    { path: '/schedule',      label: 'Mi horario',      icon: CalendarDays },
    { section: 'Solicitudes' },
    { path: '/leaves',        label: 'Vacaciones',      icon: CalendarCheck },
    { path: '/overtime',      label: 'Horas extra',     icon: Timer },
    { path: '/documents',     label: 'Nóminas',         icon: Wallet },
    { path: '/performance',   label: 'Mi desempeño',    icon: ClipboardCheck },
    { section: 'Comunicación' },
    { path: '/notifications', label: 'Notificaciones',  icon: Bell },
    { path: '/email',         label: 'Correo',          icon: Mail },
    { path: '/chat',          label: 'Chat',            icon: MessageSquare },
  ],
  Coordinator: [
    { section: 'Mi jornada' },
    { path: '/dashboard',     label: 'Panel',           icon: LayoutDashboard },
    { path: '/attendance',    label: 'Asistencia',      icon: Clock },
    { section: 'Mi equipo' },
    { path: '/team',          label: 'Equipo',          icon: Users },
    { path: '/leaves',        label: 'Permisos',        icon: CalendarCheck },
    { path: '/overtime',      label: 'Horas extra',     icon: Timer },
    { path: '/performance',   label: 'Evaluaciones',    icon: ClipboardCheck },
    { section: 'Mis documentos' },
    { path: '/documents',     label: 'Nóminas',         icon: Wallet },
    { section: 'Comunicación' },
    { path: '/notifications', label: 'Notificaciones',  icon: Bell },
    { path: '/email',         label: 'Correo',          icon: Mail },
    { path: '/chat',          label: 'Chat',            icon: MessageSquare },
  ],
  HR: [
    { section: 'General' },
    { path: '/dashboard',     label: 'Panel',           icon: LayoutDashboard },
    { section: 'Empleados' },
    { path: '/employees',     label: 'Plantilla',       icon: Users },
    { path: '/attendance',    label: 'Control horario', icon: Clock },
    { path: '/leaves',        label: 'Permisos',        icon: CalendarCheck },
    { path: '/overtime',      label: 'Horas extra',     icon: Timer },
    { section: 'Nómina' },
    { path: '/payroll',       label: 'Nóminas',         icon: Wallet },
    { path: '/reports',       label: 'Informes',        icon: ChartColumn },
    { section: 'Desempeño' },
    { path: '/performance',   label: 'Evaluaciones',    icon: ClipboardCheck },
    { section: 'Comunicación' },
    { path: '/notifications', label: 'Notificaciones',  icon: Bell },
    { path: '/email',         label: 'Correo',          icon: Mail },
    { path: '/chat',          label: 'Chat',            icon: MessageSquare },
  ],
  Admin: [
    { section: 'General' },
    { path: '/dashboard',     label: 'Panel',           icon: LayoutDashboard },
    { section: 'Gestión' },
    { path: '/employees',     label: 'Empleados',       icon: Users },
    { path: '/attendance',    label: 'Asistencia',      icon: Clock },
    { path: '/leaves',        label: 'Permisos',        icon: CalendarCheck },
    { path: '/overtime',      label: 'Horas extra',     icon: Timer },
    { section: 'Económico' },
    { path: '/payroll',       label: 'Nóminas',         icon: Wallet },
    { path: '/reports',       label: 'Informes',        icon: ChartColumn },
    { section: 'Calidad' },
    { path: '/performance',   label: 'Evaluaciones',    icon: ClipboardCheck },
    { section: 'Comunicación' },
    { path: '/notifications', label: 'Avisos',          icon: Bell },
    { path: '/email',         label: 'Correo',          icon: Mail },
    { path: '/chat',          label: 'Chat',            icon: MessageSquare },
  ],
}

const ROLE_LABELS = {
  Employee: 'Empleado', Coordinator: 'Coordinador', HR: 'RRHH', Admin: 'Administrador',
}

export default function Sidebar() {
  const { user, logout }        = useAuth()
  const { navOpen, setNavOpen } = useShell()

  const nav      = ROLE_NAV[user?.role] ?? ROLE_NAV.Employee
  const initials = user?.fullName?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? 'US'
  const close    = () => setNavOpen(false)

  return (
    <>
      <div className={`sidebar-backdrop ${navOpen ? 'open' : ''}`} onClick={close} aria-hidden="true" />
      <aside className={`sidebar ${navOpen ? 'open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-logo">
          <div className="logo-mark"><Building2 size={18} strokeWidth={2} /></div>
          <div>
            <div className="logo-brand">ESC Media &amp; Tech</div>
            <div className="logo-sub">Portal de RRHH</div>
          </div>
          <button className="sidebar-close" onClick={close} aria-label="Cerrar menú"><X size={18} /></button>
        </div>

        <div className="sidebar-user">
          <div className="user-chip">
            <div className={`user-av ${avatarColor(user?.fullName ?? '')}`}>{initials}</div>
            <div className="min-w-0">
              <div className="user-name">{user?.fullName ?? user?.username}</div>
              <div className="user-role">{ROLE_LABELS[user?.role] ?? user?.role}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item, i) => {
            if (item.section) return <div key={i} className="nav-section">{item.section}</div>
            const Icon = item.icon
            return (
              <NavLink key={item.path} to={item.path} onClick={close}
                       className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon className="nav-icon" size={17} strokeWidth={1.75} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item nav-item-muted" onClick={logout}>
            <LogOut className="nav-icon" size={17} strokeWidth={1.75} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
