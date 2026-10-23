import { Link } from 'react-router-dom'
import {
  Users, CalendarCheck, Wallet, Clock, Bell, Mail, MessageSquare, ChevronRight,
  UserPlus, ChartColumn, ClipboardCheck, AlertCircle,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { useApi, fmt, monthName, label } from '../../hooks/useApi'
import { dashboardApi } from '../../services/api'
import { Topbar, Spinner, Badge, Empty } from '../../components/ui'

const DEPT_COLORS = ['#2563EB', '#059669', '#7C3AED', '#D97706', '#DC2626', '#0891B2', '#DB2777', '#4D7C0F', '#64748B']

const TITLES = {
  Employee: 'Mi panel', Coordinator: 'Panel de coordinación', HR: 'Panel de RRHH', Admin: 'Panel de administración',
}

const QUICK_LINKS = {
  Employee: [
    { to: '/attendance', label: 'Fichar entrada o salida', icon: Clock },
    { to: '/leaves', label: 'Solicitar vacaciones', icon: CalendarCheck },
    { to: '/documents', label: 'Mis nóminas', icon: Wallet },
    { to: '/email', label: 'Correo', icon: Mail },
    { to: '/chat', label: 'Chat del equipo', icon: MessageSquare },
  ],
  Coordinator: [
    { to: '/leaves', label: 'Revisar permisos del equipo', icon: CalendarCheck },
    { to: '/team', label: 'Mi equipo', icon: Users },
    { to: '/performance', label: 'Evaluaciones', icon: ClipboardCheck },
    { to: '/attendance', label: 'Fichar entrada o salida', icon: Clock },
    { to: '/chat', label: 'Chat del equipo', icon: MessageSquare },
  ],
  HR: [
    { to: '/employees', label: 'Alta de empleado', icon: UserPlus },
    { to: '/leaves', label: 'Permisos pendientes', icon: CalendarCheck },
    { to: '/payroll', label: 'Gestión de nóminas', icon: Wallet },
    { to: '/reports', label: 'Informes', icon: ChartColumn },
    { to: '/notifications', label: 'Enviar aviso', icon: Bell },
  ],
}
QUICK_LINKS.Admin = QUICK_LINKS.HR

const shortDate = iso =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'

const isToday = iso => iso === new Date().toLocaleDateString('sv-SE')

function Kpi({ icon: Icon, tone, label: title, value, sub }) {
  return (
    <div className="kpi">
      <div className={`kpi-icon tone-${tone}`}><Icon size={18} strokeWidth={1.75} /></div>
      <div className="kpi-label">{title}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data: s, loading, error } = useApi(dashboardApi.get)

  const scope = s?.scope ?? 'self'
  const attLabel = s?.attendanceDate
    ? (isToday(s.attendanceDate) ? 'Hoy' : `Último día laborable · ${shortDate(s.attendanceDate)}`)
    : 'Sin registros'
  const payPeriod = s?.payrollMonth ? `${monthName(s.payrollMonth)} ${s.payrollYear}` : 'Sin nóminas'

  const kpis = !s ? [] : scope === 'company' ? [
    { icon: Users, tone: 'blue', label: 'Plantilla activa', value: s.active, sub: `de ${s.totalEmployees} empleados` },
    { icon: CalendarCheck, tone: 'green', label: 'Asistencia', value: `${s.attendanceRate}%`, sub: attLabel },
    { icon: Wallet, tone: 'purple', label: 'Masa salarial neta', value: fmt(s.payroll ?? 0, 0), sub: payPeriod },
    { icon: AlertCircle, tone: 'amber', label: 'Permisos por revisar', value: s.pendingRequests, sub: 'solicitudes pendientes' },
  ] : scope === 'team' ? [
    { icon: Users, tone: 'blue', label: 'Mi equipo', value: Math.max(0, s.active - 1), sub: 'personas a tu cargo' },
    { icon: CalendarCheck, tone: 'green', label: 'Asistencia del equipo', value: `${s.attendanceRate}%`, sub: attLabel },
    { icon: AlertCircle, tone: 'amber', label: 'Permisos por revisar', value: s.pendingRequests, sub: 'de tu equipo' },
    { icon: Wallet, tone: 'purple', label: 'Mi última nómina', value: fmt(s.payroll, 0), sub: payPeriod },
  ] : [
    { icon: Clock, tone: 'green', label: 'Días registrados', value: s.recentAttendance.length, sub: 'en los últimos días laborables' },
    { icon: CalendarCheck, tone: 'amber', label: 'Solicitudes pendientes', value: s.pendingRequests, sub: 'esperando revisión' },
    { icon: Wallet, tone: 'purple', label: 'Mi última nómina', value: fmt(s.payroll, 0), sub: payPeriod },
    { icon: Bell, tone: 'blue', label: 'Notificaciones', value: s.unreadNotifications, sub: 'sin leer' },
  ]

  const depts = (s?.byDepartment ?? []).map(d => ({ name: label(d.department), value: d.count }))

  return (
    <>
      <Topbar title={TITLES[user?.role] ?? 'Panel'}>
        <span className="topbar-meta">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </Topbar>

      <div className="page section-gap">
        {loading ? <Spinner /> : error ? (
          <div className="alert alert-error"><AlertCircle size={16} /> No se pudo cargar el panel: {error}</div>
        ) : (
          <>
            <div className="kpi-grid">
              {kpis.map(k => <Kpi key={k.label} {...k} />)}
            </div>

            <div className="dash-grid">
              {scope === 'company' ? (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Plantilla por departamento</span>
                    <span className="text-sm text-muted">{s.active} personas</span>
                  </div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={depts} dataKey="value" nameKey="name" cx="50%" cy="50%"
                             innerRadius={62} outerRadius={96} paddingAngle={2} stroke="none">
                          {depts.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => [`${v} personas`, '']}
                                 contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                                wrapperStyle={{ fontSize: 12, lineHeight: '22px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Mi asistencia reciente</span>
                    <Link to="/attendance" className="text-sm">Ver todo</Link>
                  </div>
                  {!s.recentAttendance.length ? <Empty text="Todavía no hay registros" /> : (
                    <div className="tbl-wrap">
                      <table className="hr-tbl">
                        <thead><tr><th>Día</th><th>Entrada</th><th>Salida</th><th className="text-right">Horas</th><th>Estado</th></tr></thead>
                        <tbody>
                          {s.recentAttendance.map(a => (
                            <tr key={a.date}>
                              <td className="fw-600">{shortDate(a.date)}</td>
                              <td className="mono">{a.checkIn ?? '—'}</td>
                              <td className="mono">{a.checkOut ?? '—'}</td>
                              <td className="mono text-right">{a.hours != null ? `${a.hours} h` : '—'}</td>
                              <td><Badge status={a.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="card">
                <div className="card-header"><span className="card-title">Accesos rápidos</span></div>
                <div className="card-body quick-links">
                  {(QUICK_LINKS[user?.role] ?? QUICK_LINKS.Employee).map(({ to, label: text, icon: Icon }) => (
                    <Link key={to + text} to={to} className="quick-link">
                      <Icon size={16} strokeWidth={1.75} />
                      <span>{text}</span>
                      <ChevronRight size={15} className="quick-link-arrow" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
