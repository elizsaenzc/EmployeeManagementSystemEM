import { useAuth } from '../../context/AuthContext'
import { useApi, fmt } from '../../hooks/useApi'
import { dashboardApi } from '../../services/api'
import { Topbar, Spinner } from '../../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const DEPT_COLORS = ['#2563EB','#059669','#7C3AED','#D97706','#DC2626','#0891B2','#9D174D','#065F46']

const ROLE_GREET = {
  Employee:    'Mi panel',
  Coordinator: 'Panel de coordinación',
  HR:          'Panel de RRHH',
  Admin:       'Panel de administración',
}

export default function Dashboard() {
  const { user }  = useAuth()
  const { data: stats, loading } = useApi(dashboardApi.get)

  return (
    <>
      <Topbar title={ROLE_GREET[user?.role] ?? 'Dashboard'}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          ESC Media &amp; Tech S.L. · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </Topbar>

      <div className="page section-gap">
        {loading ? <Spinner /> : (
          <>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-icon" style={{ background: 'var(--brand-dim)' }}>👥</div>
                <div className="kpi-label">Plantilla activa</div>
                <div className="kpi-value">{stats?.active ?? 0}</div>
                <div className="kpi-sub">de {stats?.totalEmployees} en total</div>
              </div>
              <div className="kpi">
                <div className="kpi-icon" style={{ background: 'var(--green-dim)' }}>📅</div>
                <div className="kpi-label">Asistencia hoy</div>
                <div className="kpi-value">{stats?.todayAttendanceRate ?? 0}<span style={{ fontSize: 16, fontWeight: 400 }}>%</span></div>
                <div className="kpi-sub">de empleados activos</div>
              </div>
              <div className="kpi">
                <div className="kpi-icon" style={{ background: 'var(--purple-dim)' }}>💶</div>
                <div className="kpi-label">Masa salarial (mes)</div>
                <div className="kpi-value" style={{ fontSize: 20 }}>{fmt(stats?.monthlyPayroll ?? 0, 0)}</div>
                <div className="kpi-sub">neto empleados</div>
              </div>
              <div className="kpi">
                <div className="kpi-icon" style={{ background: 'var(--amber-dim)' }}>🌴</div>
                <div className="kpi-label">Permisos pendientes</div>
                <div className="kpi-value">{stats?.pendingRequests ?? 0}</div>
                <div className="kpi-sub">por revisar</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Distribución por departamento</span>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={stats?.byDepartment ?? []} dataKey="count" nameKey="department"
                           cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {(stats?.byDepartment ?? []).map((_, i) => (
                          <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Accesos rápidos</span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Marcar entrada / salida', path: '/attendance', icon: '🕐' },
                    { label: 'Solicitar permiso', path: '/leaves', icon: '🌴' },
                    { label: 'Ver mis nóminas', path: '/documents', icon: '💶' },
                    { label: 'Abrir correo', path: '/email', icon: '✉️' },
                    { label: 'Chat con equipo', path: '/chat', icon: '💬' },
                  ].map(a => (
                    <a key={a.path} href={a.path}
                       style={{
                         display: 'flex', alignItems: 'center', gap: 10,
                         padding: '9px 12px', borderRadius: 8,
                         border: '1px solid var(--border)', fontSize: 13,
                         color: 'var(--text2)', transition: 'all .15s'
                       }}
                       onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                       onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span>{a.icon}</span> {a.label}
                    </a>
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
