import { useState } from 'react'
import { Topbar, Spinner, Empty, Modal, StatusBadge, Avatar } from '../../components/ui'
import { useApi } from '../../hooks/useApi'
import { payrollApi } from '../../services/api'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const fmt = n => n?.toLocaleString('es-ES', { style:'currency', currency:'EUR', maximumFractionDigits:2 }) ?? '—'

export default function Payroll() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [genModal, setGenModal] = useState(false)
  const [genForm,  setGenForm]  = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const [generating, setGenerating] = useState(false)

  const { data: payrolls, loading, refetch } = useApi(
    () => payrollApi.getAll({ month, year }),
    [month, year]
  )
  const { data: summaries } = useApi(payrollApi.getSummaries)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await payrollApi.generate(genForm)
      alert(`Nómina generada para ${res.data.generated} empleados`)
      setGenModal(false)
      refetch()
    } catch (e) {
      alert(e.response?.data?.message || 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  const handlePay = async id => {
    await payrollApi.markPaid(id)
    refetch()
  }

  const totals = payrolls
    ? {
        gross: payrolls.reduce((s,p) => s + p.baseSalary + p.bonus, 0),
        net:   payrolls.reduce((s,p) => s + p.netSalary, 0),
        paid:  payrolls.filter(p => p.paid).length,
        total: payrolls.length,
      }
    : {}

  return (
    <>
      <Topbar title="Nóminas">
        <button className="btn btn-primary" onClick={() => setGenModal(true)}>+ Generar nómina</button>
      </Topbar>

      <div className="page section-gap">
        {/* Period selector */}
        <div className="toolbar">
          <select className="input" style={{width:'auto'}} value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="input" style={{width:'auto'}} value={year} onChange={e => setYear(+e.target.value)}>
            {[2023,2024,2025].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {/* Period summary */}
        {payrolls && payrolls.length > 0 && (
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            {[
              {label:'Masa salarial bruta', val: fmt(totals.gross), cls:'kpi-accent'},
              {label:'Masa salarial neta',  val: fmt(totals.net),   cls:'kpi-green'},
              {label:'Pagadas',             val: `${totals.paid} / ${totals.total}`, cls:'kpi-purple'},
            ].map(k => (
              <div key={k.label} className={`kpi ${k.cls}`} style={{flex:'1 1 200px'}}>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value" style={{fontSize:20}}>{k.val}</div>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{padding:0}}>
          {loading
            ? <Spinner />
            : !payrolls?.length
            ? <Empty icon="◎" text={`Sin nóminas para ${MONTHS[month-1]} ${year}. Genera el periodo primero.`} />
            : (
              <div className="table-wrap">
                <table className="hr-table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Departamento</th>
                      <th className="text-right">Salario base</th>
                      <th className="text-right">Bonus</th>
                      <th className="text-right">Deducciones</th>
                      <th className="text-right">Neto</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="flex gap-10">
                            <Avatar initials={p.employeeName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()} name={p.employeeName} size="avatar-sm" />
                            <span style={{fontWeight:500}}>{p.employeeName}</span>
                          </div>
                        </td>
                        <td><StatusBadge value={p.department} /></td>
                        <td className="mono text-right">{fmt(p.baseSalary)}</td>
                        <td className="mono text-right" style={{color: p.bonus > 0 ? 'var(--green)' : 'var(--text3)'}}>
                          {p.bonus > 0 ? fmt(p.bonus) : '—'}
                        </td>
                        <td className="mono text-right" style={{color:'var(--red)'}}>-{fmt(p.deductions)}</td>
                        <td className="mono text-right" style={{fontWeight:700}}>{fmt(p.netSalary)}</td>
                        <td>
                          {p.paid
                            ? <span className="badge badge-green">✓ Pagado</span>
                            : <span className="badge badge-amber">Pendiente</span>
                          }
                        </td>
                        <td>
                          {!p.paid && (
                            <button className="btn btn-success btn-sm" onClick={() => handlePay(p.id)}>
                              Marcar pagado
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>

        {/* History summaries */}
        {summaries && summaries.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="card-title">Histórico de periodos</span></div>
            <div className="table-wrap">
              <table className="hr-table">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th className="text-right">Bruto</th>
                    <th className="text-right">Neto</th>
                    <th>Empleados</th>
                    <th>Pagadas</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map(s => (
                    <tr key={`${s.year}-${s.month}`} style={{cursor:'pointer'}} onClick={() => { setMonth(s.month); setYear(s.year) }}>
                      <td style={{fontWeight:500}}>{MONTHS[s.month-1]} {s.year}</td>
                      <td className="mono text-right">{fmt(s.totalGross)}</td>
                      <td className="mono text-right">{fmt(s.totalNet)}</td>
                      <td>{s.employeeCount}</td>
                      <td>
                        <span className={`badge ${s.paidCount === s.employeeCount ? 'badge-green' : 'badge-amber'}`}>
                          {s.paidCount}/{s.employeeCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {genModal && (
        <Modal
          title="Generar nómina"
          onClose={() => setGenModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setGenModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generando…' : 'Generar'}
              </button>
            </>
          }
        >
          <p style={{color:'var(--text2)',marginBottom:18,lineHeight:1.7}}>
            Se generará una nómina para todos los empleados activos del periodo seleccionado.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mes</label>
              <select className="input" value={genForm.month} onChange={e => setGenForm(f=>({...f,month:+e.target.value}))}>
                {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Año</label>
              <select className="input" value={genForm.year} onChange={e => setGenForm(f=>({...f,year:+e.target.value}))}>
                {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
