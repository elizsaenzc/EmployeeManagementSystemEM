import { Clock, Timer, CalendarDays, Coffee, UtensilsCrossed, Briefcase } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { employeesApi, leavesApi } from '../../services/api'
import { Topbar, Spinner } from '../../components/ui'

const SCHEDULES = {
  '08:00-17:00': 'Jornada de mañana',
  '09:00-18:00': 'Jornada estándar',
  '09:00-17:00': 'Jornada reducida',
}
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const ANNUAL_DAYS = 23   // días laborables de vacaciones por convenio

const toMin  = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toTime = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export default function Schedule() {
  const { user } = useAuth()
  const { data: emp, loading } = useApi(() => employeesApi.getOne(user?.employeeId), [user?.employeeId])
  const { data: leaves } = useApi(leavesApi.getAll, [])

  if (loading) return (<><Topbar title="Mi horario" /><div className="page"><Spinner /></div></>)

  const schedule = emp?.workSchedule ?? '09:00-18:00'
  const [start, end] = schedule.split('-')
  const lunchFrom = Math.min(toMin(start) + 5 * 60, 14 * 60)
  const lunchTo   = lunchFrom + 60
  const daily     = (toMin(end) - toMin(start) - 60) / 60

  // Vacaciones del año en curso a partir de las solicitudes reales
  const year = new Date().getFullYear()
  const vac = (leaves ?? []).filter(l => l.type === 'Vacaciones' && l.startDate.startsWith(String(year)))
  const used    = vac.filter(l => l.status === 'Aprobada').reduce((s, l) => s + l.totalDays, 0)
  const pending = vac.filter(l => l.status === 'Pendiente').reduce((s, l) => s + l.totalDays, 0)

  const stats = [
    { label: 'Jornada', value: SCHEDULES[schedule] ?? 'Personalizada', icon: Briefcase },
    { label: 'Horas al día', value: `${daily} h`, icon: Timer },
    { label: 'Horas a la semana', value: `${daily * 5} h`, icon: CalendarDays },
    { label: 'Pausa para comer', value: '1 hora', icon: UtensilsCrossed },
  ]

  const blocks = [
    { label: 'Entrada', time: start, tone: 'green', icon: Clock },
    { label: 'Mañana', time: `${start}–${toTime(lunchFrom)}`, tone: 'blue', icon: Briefcase },
    { label: 'Comida', time: `${toTime(lunchFrom)}–${toTime(lunchTo)}`, tone: 'purple', icon: Coffee },
    { label: 'Tarde', time: `${toTime(lunchTo)}–${end}`, tone: 'blue', icon: Briefcase },
    { label: 'Salida', time: end, tone: 'muted', icon: Clock },
  ]

  return (
    <>
      <Topbar title="Mi horario" />
      <div className="page section-gap">
        <div className="kpi-grid">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="kpi">
              <div className="kpi-icon tone-blue"><Icon size={18} strokeWidth={1.75} /></div>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value sm">{value}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Semana</span>
            <span className="badge badge-blue">Lunes a viernes · {start}–{end}</span>
          </div>
          <div className="card-body">
            <div className="week-grid">
              {DAYS.map((d, i) => {
                const work = i < 5
                return (
                  <div key={d} className={`week-day ${work ? 'work' : ''}`}>
                    <div className="week-name">{d.slice(0, 3)}</div>
                    {work ? (<><div className="fw-600">{start}</div><div className="fw-600">{end}</div></>)
                          : <div className="text-sm text-muted">Libre</div>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-header"><span className="card-title">Un día de trabajo</span></div>
            <div className="card-body timeline">
              {blocks.map(({ label, time, tone, icon: Icon }) => (
                <div key={label} className="timeline-row">
                  <span className={`timeline-icon tone-${tone}`}><Icon size={15} /></span>
                  <span className="flex-1 fw-500">{label}</span>
                  <span className="mono">{time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Vacaciones {year}</span></div>
            <div className="card-body">
              <div className="stat-tiles three">
                <div className="stat-tile"><div className="stat-label">Por convenio</div><div className="stat-value">{ANNUAL_DAYS}</div></div>
                <div className="stat-tile"><div className="stat-label">Aprobadas</div><div className="stat-value">{used}</div></div>
                <div className="stat-tile"><div className="stat-label">Disponibles</div><div className="stat-value">{Math.max(0, ANNUAL_DAYS - used - pending)}</div></div>
              </div>
              {pending > 0 && <p className="text-sm text-muted mt-12">{pending} días en solicitudes pendientes de aprobar.</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
