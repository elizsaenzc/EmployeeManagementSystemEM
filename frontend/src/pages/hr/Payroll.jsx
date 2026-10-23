import { useState }    from 'react'
import { useAuth }     from '../../context/AuthContext'
import { useApi, fmt, monthName, downloadBlob } from '../../hooks/useApi'
import { payrollApi }  from '../../services/api'
import { Topbar, Spinner, Empty, Modal, Badge } from '../../components/ui'

// ── Documents (employee: my payslips) ─────────────────────────────────────────
export function DocumentsPage() {
  const { user } = useAuth()
  const empId    = user?.employeeId
  const { data, loading } = useApi(() => payrollApi.getAll({ employeeId: empId }), [empId])

  const handleDownload = async p => {
    const res = await payrollApi.download(p.id)
    downloadBlob(res.data, `nomina_${p.year}_${String(p.month).padStart(2,'0')}.txt`)
  }

  return (
    <>
      <Topbar title="Mis nóminas" />
      <div className="page section-gap">
        <div className="card">
          {loading ? <Spinner /> : !data?.length ? <Empty icon="💶" text="Sin nóminas disponibles" /> : (
            <div className="tbl-wrap">
              <table className="hr-tbl">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th className="text-right">Bruto base</th>
                    <th className="text-right">Horas extra</th>
                    <th className="text-right">SS + IRPF</th>
                    <th className="text-right">Líquido</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{monthName(p.month)} {p.year}</td>
                      <td className="mono text-right">{fmt(p.grossBase)}</td>
                      <td className="mono text-right">{p.overtimePay > 0 ? fmt(p.overtimePay) : '—'}</td>
                      <td className="mono text-right text-red">-{fmt(p.deductions)}</td>
                      <td className="mono text-right fw-600">{fmt(p.netSalary)}</td>
                      <td><Badge status={p.status} /></td>
                      <td>
                        {p.status === 'Pagada' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDownload(p)}>
                            ↓ Descargar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Payroll management (HR / Admin) ───────────────────────────────────────────
export function PayrollPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [genModal, setGenModal] = useState(false)
  const [genForm,  setGenForm]  = useState({ month: now.getMonth() + 1, year: now.getFullYear() })

  const { data: payrolls, loading, refetch } = useApi(
    () => payrollApi.getAll({ month, year }), [month, year]
  )
  const { data: summaries } = useApi(payrollApi.getSummary, [])

  const handleGenerate = async () => {
    await payrollApi.generate(genForm)
    setGenModal(false)
    refetch()
  }

  const handlePay = async id => {
    await payrollApi.markPaid(id)
    refetch()
  }

  const handleDownload = async p => {
    const res = await payrollApi.download(p.id)
    downloadBlob(res.data, `nomina_${p.employeeName.replace(' ','_')}_${p.year}_${String(p.month).padStart(2,'0')}.txt`)
  }

  const totals = payrolls ? {
    gross: payrolls.reduce((s,p) => s + p.grossBase + p.overtimePay + p.bonus, 0),
    net:   payrolls.reduce((s,p) => s + p.netSalary, 0),
    paid:  payrolls.filter(p => p.status === 'Pagada').length,
  } : {}

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <>
      <Topbar title="Gestión de nóminas">
        <button className="btn btn-primary" onClick={() => setGenModal(true)}>+ Generar nómina</button>
      </Topbar>

      <div className="page section-gap">
        <div className="toolbar">
          <select className="form-input" style={{ width: 'auto' }} value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={year} onChange={e => setYear(+e.target.value)}>
            {[2023,2024,2025].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {payrolls?.length > 0 && (
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-label">Masa salarial bruta</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(totals.gross, 0)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Masa salarial neta</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(totals.net, 0)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Nóminas pagadas</div>
              <div className="kpi-value">{totals.paid} / {payrolls.length}</div>
            </div>
          </div>
        )}

        <div className="card">
          {loading ? <Spinner /> : !payrolls?.length
            ? <Empty icon="💶" text={`Sin nóminas para ${MONTHS[month-1]} ${year}. Genera el periodo primero.`} />
            : (
              <div className="tbl-wrap">
                <table className="hr-tbl">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Depto.</th>
                      <th className="text-right">Base bruta</th>
                      <th className="text-right">Horas extra</th>
                      <th className="text-right">Deducciones</th>
                      <th className="text-right">Neto</th>
                      <th>Estado</th>
                      <th>Notas</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.employeeName}</td>
                        <td className="text-muted">{p.department}</td>
                        <td className="mono text-right">{fmt(p.grossBase)}</td>
                        <td className="mono text-right">{p.overtimePay > 0 ? fmt(p.overtimePay) : '—'}</td>
                        <td className="mono text-right text-red">-{fmt(p.deductions)}</td>
                        <td className="mono text-right fw-600">{fmt(p.netSalary)}</td>
                        <td><Badge status={p.status} /></td>
                        <td className="text-sm text-muted">{p.notes ?? '—'}</td>
                        <td>
                          <div className="flex gap-8">
                            {p.status !== 'Pagada' && (
                              <button className="btn btn-success btn-sm" onClick={() => handlePay(p.id)}>✓ Pagar</button>
                            )}
                            <button className="btn btn-secondary btn-sm" onClick={() => handleDownload(p)}>↓</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>

        {/* Historical summaries */}
        {summaries?.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="card-title">Histórico de periodos</span></div>
            <div className="tbl-wrap">
              <table className="hr-tbl">
                <thead>
                  <tr><th>Periodo</th><th className="text-right">Bruto</th><th className="text-right">Neto</th><th>Empleados</th><th>Pagadas</th></tr>
                </thead>
                <tbody>
                  {summaries.map(s => (
                    <tr key={`${s.year}-${s.month}`} style={{ cursor: 'pointer' }}
                        onClick={() => { setMonth(s.month); setYear(s.year) }}>
                      <td style={{ fontWeight: 500 }}>{MONTHS[s.month-1]} {s.year}</td>
                      <td className="mono text-right">{fmt(s.totalGross, 0)}</td>
                      <td className="mono text-right">{fmt(s.totalNet, 0)}</td>
                      <td>{s.count}</td>
                      <td>
                        <span className={`badge ${s.paidCount === s.count ? 'badge-green' : 'badge-amber'}`}>
                          {s.paidCount}/{s.count}
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
        <Modal title="Generar nómina mensual" onClose={() => setGenModal(false)}
               footer={<>
                 <button className="btn btn-secondary" onClick={() => setGenModal(false)}>Cancelar</button>
                 <button className="btn btn-primary" onClick={handleGenerate}>Generar</button>
               </>}>
          <p style={{ color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
            Se calculará la nómina de todos los empleados activos para el periodo indicado, incluyendo horas extra aprobadas y descuentos por ausencias injustificadas.
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Mes</label>
              <select className="form-input" value={genForm.month}
                      onChange={e => setGenForm(f => ({ ...f, month: +e.target.value }))}>
                {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Año</label>
              <select className="form-input" value={genForm.year}
                      onChange={e => setGenForm(f => ({ ...f, year: +e.target.value }))}>
                {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Reports (HR / Admin) ──────────────────────────────────────────────────────
export function ReportsPage() {
  const [month,  setMonth]  = useState(new Date().getMonth() + 1)
  const [year,   setYear]   = useState(new Date().getFullYear())
  const [period, setPeriod] = useState('monthly')
  const [loading, setLoading] = useState(false)

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await payrollApi.exportExcel({ month, year, period })
      downloadBlob(res.data, `informe_${period}_${year}_${String(month).padStart(2,'0')}.xlsx`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar title="Informes y reportes" />
      <div className="page section-gap">
        <div className="card">
          <div className="card-header"><span className="card-title">Exportar informe de nóminas</span></div>
          <div className="card-body">
            <p style={{ color: 'var(--text2)', marginBottom: 18, fontSize: 13, lineHeight: 1.6 }}>
              Genera informes en formato Excel con el detalle de nóminas por periodo. Disponibles en formato mensual, trimestral y anual.
            </p>
            <div className="form-grid" style={{ maxWidth: 520 }}>
              <div className="form-group">
                <label className="form-label">Tipo de informe</label>
                <select className="form-input" value={period} onChange={e => setPeriod(e.target.value)}>
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Año</label>
                <select className="form-input" value={year} onChange={e => setYear(+e.target.value)}>
                  {[2023,2024,2025].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              {period !== 'annual' && (
                <div className="form-group">
                  <label className="form-label">{period === 'quarterly' ? 'Mes de inicio' : 'Mes'}</label>
                  <select className="form-input" value={month} onChange={e => setMonth(+e.target.value)}>
                    {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleExport} disabled={loading}>
              {loading ? 'Generando…' : '↓ Exportar Excel'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
