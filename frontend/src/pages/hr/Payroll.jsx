import { useEffect, useState } from 'react'
import { Download, Check, Plus, FileSpreadsheet, Wallet, AlertCircle } from 'lucide-react'
import { useAuth }     from '../../context/AuthContext'
import { useApi, fmt, monthName, downloadBlob, label, yearOptions, MONTHS } from '../../hooks/useApi'
import { payrollApi }  from '../../services/api'
import { Topbar, Spinner, Empty, Modal, Badge } from '../../components/ui'

const apiError = e => e.response?.data?.message ?? 'No se pudo completar la operación'

// ── Documents (employee: my payslips) ─────────────────────────────────────────
export function DocumentsPage() {
  const { user } = useAuth()
  const empId    = user?.employeeId
  const { data, loading } = useApi(() => payrollApi.getAll({ employeeId: empId }), [empId])

  const [error, setError] = useState('')
  const handleDownload = async p => {
    try {
      const res = await payrollApi.download(p.id)
      downloadBlob(res.data, `nomina_${p.year}_${String(p.month).padStart(2, '0')}.txt`)
    } catch (e) { setError(apiError(e)) }
  }

  return (
    <>
      <Topbar title="Mis nóminas" />
      <div className="page section-gap">
        {error && <div className="alert alert-error"><AlertCircle size={16} /> {error}</div>}
        <div className="card">
          {loading ? <Spinner /> : !data?.length ? <Empty icon={Wallet} text="Todavía no tienes nóminas disponibles" /> : (
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
                      <td className="fw-500">{monthName(p.month)} {p.year}</td>
                      <td className="mono text-right">{fmt(p.grossBase)}</td>
                      <td className="mono text-right">{p.overtimePay > 0 ? fmt(p.overtimePay) : '—'}</td>
                      <td className="mono text-right text-red">-{fmt(p.deductions)}</td>
                      <td className="mono text-right fw-600">{fmt(p.netSalary)}</td>
                      <td><Badge status={p.status} /></td>
                      <td>
                        {p.status === 'Pagada' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDownload(p)}>
                            <Download size={14} /> Descargar
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
  const [error, setError]       = useState('')
  const [genError, setGenError] = useState('')

  const { data: payrolls, loading, refetch } = useApi(
    () => payrollApi.getAll({ month, year }), [month, year]
  )
  const { data: summaries, refetch: refetchSummaries } = useApi(payrollApi.getSummary, [])

  // Abrir en el último periodo con nóminas en lugar de un mes vacío
  const [initialised, setInitialised] = useState(false)
  useEffect(() => {
    if (!initialised && summaries?.length) {
      setMonth(summaries[0].month)
      setYear(summaries[0].year)
      setInitialised(true)
    }
  }, [summaries, initialised])

  const handleGenerate = async () => {
    setGenError('')
    try {
      await payrollApi.generate(genForm)
      setGenModal(false)
      setMonth(genForm.month)
      setYear(genForm.year)
      refetch()
      refetchSummaries()
    } catch (e) { setGenError(apiError(e)) }
  }

  const handlePay = async id => {
    try { await payrollApi.markPaid(id); refetch(); refetchSummaries() }
    catch (e) { setError(apiError(e)) }
  }

  const handleDownload = async p => {
    try {
      const res = await payrollApi.download(p.id)
      downloadBlob(res.data, `nomina_${p.employeeName.replace(/ /g, '_')}_${p.year}_${String(p.month).padStart(2, '0')}.txt`)
    } catch (e) { setError(apiError(e)) }
  }

  const totals = payrolls ? {
    gross: payrolls.reduce((s,p) => s + p.grossBase + p.overtimePay + p.bonus, 0),
    net:   payrolls.reduce((s,p) => s + p.netSalary, 0),
    paid:  payrolls.filter(p => p.status === 'Pagada').length,
  } : {}

  return (
    <>
      <Topbar title="Gestión de nóminas">
        <button className="btn btn-primary" onClick={() => { setGenError(''); setGenModal(true) }}>
          <Plus size={16} /> Generar nómina
        </button>
      </Topbar>

      <div className="page section-gap">
        {error && <div className="alert alert-error"><AlertCircle size={16} /> {error}</div>}
        <div className="toolbar">
          <select className="form-input w-auto" aria-label="Mes" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="form-input w-auto" aria-label="Año" value={year} onChange={e => setYear(+e.target.value)}>
            {yearOptions().map(y => <option key={y}>{y}</option>)}
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
            ? <Empty icon={Wallet} text={`No hay nóminas de ${MONTHS[month - 1]} ${year}. Puedes generarlas con «Generar nómina».`} />
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
                        <td className="fw-500">{p.employeeName}</td>
                        <td className="text-muted">{label(p.department)}</td>
                        <td className="mono text-right">{fmt(p.grossBase)}</td>
                        <td className="mono text-right">{p.overtimePay > 0 ? fmt(p.overtimePay) : '—'}</td>
                        <td className="mono text-right text-red">-{fmt(p.deductions)}</td>
                        <td className="mono text-right fw-600">{fmt(p.netSalary)}</td>
                        <td><Badge status={p.status} /></td>
                        <td className="text-sm text-muted">{p.notes ?? '—'}</td>
                        <td>
                          <div className="flex gap-8">
                            {p.status !== 'Pagada' && (
                              <button className="btn btn-success btn-sm" onClick={() => handlePay(p.id)}><Check size={14} /> Marcar pagada</button>
                            )}
                            <button className="btn btn-ghost btn-icon" onClick={() => handleDownload(p)} title="Descargar nómina" aria-label={`Descargar nómina de ${p.employeeName}`}><Download size={15} /></button>
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
                    <tr key={`${s.year}-${s.month}`} className={`row-link ${s.month === month && s.year === year ? 'row-selected' : ''}`}
                        onClick={() => { setMonth(s.month); setYear(s.year) }}>
                      <td className="fw-500">{MONTHS[s.month - 1]} {s.year}</td>
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
          {genError && <div className="alert alert-error mb-16"><AlertCircle size={16} /> {genError}</div>}
          <p className="text-body mb-16">
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
                {yearOptions().map(y => <option key={y}>{y}</option>)}
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
  const [error, setError]     = useState('')

  const handleExport = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await payrollApi.exportExcel({ month, year, period })
      downloadBlob(res.data, `informe_${period}_${year}_${String(month).padStart(2, '0')}.xlsx`)
    } catch (e) {
      setError(apiError(e))
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
            {error && <div className="alert alert-error mb-16"><AlertCircle size={16} /> {error}</div>}
            <p className="text-body mb-16">
              Genera informes en formato Excel con el detalle de nóminas por periodo. Disponibles en formato mensual, trimestral y anual.
            </p>
            <div className="form-grid maxw-520">
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
                  {yearOptions().map(y => <option key={y}>{y}</option>)}
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
            <button className="btn btn-primary mt-16" onClick={handleExport} disabled={loading}>
              <FileSpreadsheet size={16} /> {loading ? 'Generando…' : 'Exportar a Excel'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
