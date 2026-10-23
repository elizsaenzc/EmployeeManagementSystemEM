import { Topbar, Spinner, StatusBadge, Avatar } from '../../components/ui'
import { useApi } from '../../hooks/useApi'
import { dashboardApi } from '../../services/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const DEPT_COLORS = ['#6C7FFF','#34D399','#C084FC','#FBBF24','#22D3EE','#F87171','#FB923C']

const fmt = n => typeof n === 'number'
  ? n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  : '—'

export default function Dashboard() {
  const { data: stats, loading } = useApi(dashboardApi.get)

  if (loading) return <><Topbar title="Dashboard" /><Spinner /></>

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="page section-gap">

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi kpi-accent">
            <div className="kpi-icon accent">◈</div>
            <div className="kpi-label">Total empleados</div>
            <div className="kpi-value">{stats?.totalEmployees ?? 0}</div>
            <div className="kpi-sub">{stats?.activeEmployees} activos · {stats?.onLeave} en baja</div>
          </div>
          <div className="kpi kpi-green">
            <div className="kpi-icon green">◷</div>
            <div className="kpi-label">Asistencia hoy</div>
            <div className="kpi-value">{stats?.todayAttendanceRate ?? 0}<span style={{fontSize:16,fontWeight:400}}>%</span></div>
            <div className="kpi-sub">de empleados activos</div>
          </div>
          <div className="kpi kpi-purple">
            <div className="kpi-icon purple">◎</div>
            <div className="kpi-label">Nómina mensual</div>
            <div className="kpi-value" style={{fontSize:22}}>{fmt(stats?.monthlyPayroll)}</div>
            <div className="kpi-sub">mes en curso</div>
          </div>
          <div className="kpi kpi-cyan">
            <div className="kpi-icon cyan">◧</div>
            <div className="kpi-label">Departamentos</div>
            <div className="kpi-value">{stats?.byDepartment?.length ?? 0}</div>
            <div className="kpi-sub">equipos activos</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Attendance trend */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Tendencia de asistencia — últimos 7 días laborables</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.weeklyTrend} barSize={20}>
                <XAxis dataKey="day" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="present" name="Presentes" fill="var(--accent)" radius={[4,4,0,0]} />
                <Bar dataKey="total"   name="Total"    fill="var(--surface2)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By department */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Por departamento</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats?.byDepartment}
                  dataKey="count"
                  nameKey="department"
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                >
                  {(stats?.byDepartment ?? []).map((_, i) => (
                    <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </>
  )
}
