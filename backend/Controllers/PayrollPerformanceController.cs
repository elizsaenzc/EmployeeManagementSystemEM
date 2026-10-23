using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HRPortal.Data;
using HRPortal.DTOs;
using HRPortal.Models;
using HRPortal.Services;
using ClosedXML.Excel;

namespace HRPortal.Controllers;

[ApiController]
[Route("api/payroll")]
[Authorize]
public class PayrollController : ControllerBase
{
    private readonly AppDbContext _db;
    public PayrollController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? employeeId, [FromQuery] int? month, [FromQuery] int? year)
    {
        var q = _db.Payrolls.Include(p => p.Employee).AsQueryable();
        var visible = await User.VisibleEmployeeIdsAsync(_db);
        // Las nóminas son personales: un coordinador solo ve la suya, no la de su equipo
        if (visible != null) { var me = User.EmployeeId(); q = q.Where(p => p.EmployeeId == me); }
        if (employeeId.HasValue) q = q.Where(p => p.EmployeeId == employeeId.Value);
        if (month.HasValue)      q = q.Where(p => p.Month == month.Value);
        if (year.HasValue)       q = q.Where(p => p.Year  == year.Value);

        var list = await q.OrderByDescending(p => p.Year).ThenByDescending(p => p.Month).ToListAsync();
        return Ok(list.Select(ToDto));
    }

    [HttpGet("summary")]
    [Authorize(Roles = "HR,Admin")]
    public async Task<IActionResult> GetSummaries()
    {
        // SQLite no agrega columnas decimal: se cargan y se agrupan en memoria
        var payrolls = await _db.Payrolls.AsNoTracking().ToListAsync();
        var summary = payrolls
            .GroupBy(p => new { p.Year, p.Month })
            .Select(g => new PayrollSummaryDto(
                g.Key.Month, g.Key.Year,
                g.Sum(p => p.GrossBase + p.OvertimePay + p.Bonus),
                g.Sum(p => p.NetSalary),
                g.Count(),
                g.Count(p => p.Status == PayrollStatus.Pagada)))
            .OrderByDescending(s => s.Year).ThenByDescending(s => s.Month)
            .ToList();
        return Ok(summary);
    }

    [HttpPost("generate")]
    [Authorize(Roles = "HR,Admin")]
    public async Task<IActionResult> Generate(GeneratePayrollRequest req)
    {
        var exists = await _db.Payrolls.AnyAsync(p => p.Month == req.Month && p.Year == req.Year);
        if (exists) return BadRequest(new { message = "Ya existe nómina para ese periodo" });

        var employees = await _db.Employees
            .Include(e => e.OvertimeEntries)
            .Include(e => e.LeaveRequests)
            .Where(e => e.User!.IsActive)
            .ToListAsync();

        var payrolls = new List<Payroll>();
        foreach (var e in employees)
        {
            var monthly = Math.Round(e.GrossSalary / 12, 2);
            var ot      = e.OvertimeEntries
                .Where(o => o.Approved && o.Date.Month == req.Month && o.Date.Year == req.Year)
                .Sum(o => o.Hours);
            var otPay   = Math.Round((decimal)ot * (monthly / 160), 2); // hourly rate approx

            // Unpaid absences (Ausente without approved leave)
            var absences = await _db.Attendances
                .Where(a => a.EmployeeId == e.Id
                         && a.Date.Month == req.Month
                         && a.Date.Year  == req.Year
                         && a.Status == AttendanceStatus.Ausente)
                .CountAsync();

            var approvedAbsences = await _db.LeaveRequests
                .Where(r => r.EmployeeId == e.Id && r.Status == RequestStatus.Aprobada
                         && r.StartDate.Month == req.Month && r.StartDate.Year == req.Year)
                .SumAsync(r => r.TotalDays);

            var unpaidAbsences = Math.Max(0, absences - approvedAbsences);
            var dailyRate      = Math.Round(monthly / 22, 2);
            var deductAbsences = unpaidAbsences * dailyRate;

            var ss   = Math.Round(monthly * 0.0635m, 2);
            var irpf = Math.Round(monthly * 0.14m, 2);
            var totalDeductions = ss + irpf + deductAbsences;
            var net  = Math.Round(monthly + otPay - totalDeductions, 2);

            payrolls.Add(new Payroll
            {
                EmployeeId     = e.Id,
                Month          = req.Month,
                Year           = req.Year,
                GrossBase      = monthly,
                OvertimePay    = otPay,
                Bonus          = 0,
                SocialSecurity = ss,
                Deductions     = totalDeductions,
                NetSalary      = net,
                Status         = PayrollStatus.Calculada,
                Notes          = unpaidAbsences > 0 ? $"Descuento {unpaidAbsences} día(s) ausencia" : null
            });
        }

        _db.Payrolls.AddRange(payrolls);
        await _db.SaveChangesAsync();
        return Ok(new { generated = payrolls.Count });
    }

    [HttpPatch("{id}/pay")]
    [Authorize(Roles = "HR,Admin")]
    public async Task<IActionResult> MarkPaid(int id)
    {
        var p = await _db.Payrolls.FindAsync(id);
        if (p == null) return NotFound();
        p.Status = PayrollStatus.Pagada;
        p.PaidAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(p).Reference(x => x.Employee).LoadAsync();
        return Ok(ToDto(p));
    }

    // ── Reports & Downloads ───────────────────────────────────────────────────

    [HttpGet("{id}/download")]
    public async Task<IActionResult> DownloadPayslip(int id)
    {
        var p = await _db.Payrolls.Include(x => x.Employee).FirstOrDefaultAsync(x => x.Id == id);
        if (p == null) return NotFound();
        if (!User.IsHrOrAdmin() && p.EmployeeId != User.EmployeeId()) return Forbid();

        var culture = new System.Globalization.CultureInfo("es-ES");
        var sb      = new System.Text.StringBuilder();
        sb.AppendLine("ESC MEDIA & TECH S.L.");
        sb.AppendLine("CIF: B-12345678  |  Calle Gran Vía 45, 28013 Madrid");
        sb.AppendLine(new string('-', 55));
        sb.AppendLine($"NÓMINA — {culture.DateTimeFormat.GetMonthName(p.Month).ToUpper()} {p.Year}");
        sb.AppendLine(new string('-', 55));
        sb.AppendLine($"Empleado   : {p.Employee?.FirstName} {p.Employee?.LastName}");
        sb.AppendLine($"Puesto     : {p.Employee?.Position}");
        sb.AppendLine($"Dpto.      : {p.Employee?.Department}");
        sb.AppendLine($"Contrato   : {p.Employee?.ContractType}");
        sb.AppendLine(new string('-', 55));
        sb.AppendLine($"Salario bruto base  : {p.GrossBase,10:C2}");
        sb.AppendLine($"Horas extra         : {p.OvertimePay,10:C2}");
        sb.AppendLine($"Bonus               : {p.Bonus,10:C2}");
        sb.AppendLine($"{"",30}{"--------",12}");
        sb.AppendLine($"TOTAL DEVENGADO      : {(p.GrossBase + p.OvertimePay + p.Bonus),10:C2}");
        sb.AppendLine();
        sb.AppendLine($"Seg. Social (6,35%)  : -{p.SocialSecurity,9:C2}");
        sb.AppendLine($"Total deducciones    : -{p.Deductions,9:C2}");
        sb.AppendLine($"{"",30}{"--------",12}");
        sb.AppendLine($"LÍQUIDO A PERCIBIR   : {p.NetSalary,10:C2}");
        if (!string.IsNullOrEmpty(p.Notes))
            sb.AppendLine($"\nObs.: {p.Notes}");
        sb.AppendLine(new string('-', 55));
        sb.AppendLine($"Estado: {p.Status}   Pagado: {p.PaidAt?.ToString("dd/MM/yyyy") ?? "Pendiente"}");

        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/plain; charset=utf-8", $"nomina_{p.Employee?.LastName}_{p.Year}_{p.Month:D2}.txt");
    }

    [HttpGet("report/excel")]
    [Authorize(Roles = "HR,Admin")]
    public async Task<IActionResult> ExportExcel([FromQuery] int? month, [FromQuery] int? year, [FromQuery] string? period)
    {
        var q = _db.Payrolls.Include(p => p.Employee).AsQueryable();

        // period = "monthly" | "quarterly" | "annual"
        if (month.HasValue && year.HasValue)
        {
            q = period switch
            {
                "quarterly" => q.Where(p => p.Year == year && p.Month >= month && p.Month < month + 3),
                "annual"    => q.Where(p => p.Year == year),
                _           => q.Where(p => p.Month == month && p.Year == year)
            };
        }

        var list = await q.OrderBy(p => p.Year).ThenBy(p => p.Month)
                          .ThenBy(p => p.Employee!.LastName).ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nóminas");

        // Header row
        var headers = new[] { "Empleado", "Departamento", "Mes", "Año", "Base Bruta", "Horas Extra",
                               "Bonus", "SS Empleado", "Total Deducciones", "Neto", "Estado", "Pagado" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
            ws.Cell(1, i + 1).Style.Font.Bold = true;
            ws.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#2563EB");
            ws.Cell(1, i + 1).Style.Font.FontColor       = XLColor.White;
        }

        int row = 2;
        foreach (var p in list)
        {
            ws.Cell(row, 1).Value  = $"{p.Employee?.FirstName} {p.Employee?.LastName}";
            ws.Cell(row, 2).Value  = p.Employee?.Department.ToString();
            ws.Cell(row, 3).Value  = p.Month;
            ws.Cell(row, 4).Value  = p.Year;
            ws.Cell(row, 5).Value  = p.GrossBase;
            ws.Cell(row, 6).Value  = p.OvertimePay;
            ws.Cell(row, 7).Value  = p.Bonus;
            ws.Cell(row, 8).Value  = p.SocialSecurity;
            ws.Cell(row, 9).Value  = p.Deductions;
            ws.Cell(row, 10).Value = p.NetSalary;
            ws.Cell(row, 11).Value = p.Status.ToString();
            ws.Cell(row, 12).Value = p.PaidAt?.ToString("dd/MM/yyyy") ?? "Pendiente";
            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new System.IO.MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"nominas_{period ?? "periodo"}_{year}_{month:D2}.xlsx");
    }

    private static PayrollDto ToDto(Payroll p) => new(
        p.Id, p.EmployeeId,
        p.Employee != null ? $"{p.Employee.FirstName} {p.Employee.LastName}" : "",
        p.Employee?.Department.ToString() ?? "",
        p.Month, p.Year, p.GrossBase, p.OvertimePay, p.Bonus,
        p.SocialSecurity, p.Deductions, p.NetSalary,
        p.Status.ToString(), p.PaidAt, p.Notes);
}

// ── Performance ────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/performance")]
[Authorize]
public class PerformanceController : ControllerBase
{
    private readonly AppDbContext _db;
    public PerformanceController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? employeeId, [FromQuery] int? year)
    {
        var q = _db.PerformanceReviews.Include(r => r.Employee).AsQueryable();
        var visible = await User.VisibleEmployeeIdsAsync(_db);
        if (visible != null) q = q.Where(r => visible.Contains(r.EmployeeId));
        if (employeeId.HasValue) q = q.Where(r => r.EmployeeId == employeeId.Value);
        if (year.HasValue)       q = q.Where(r => r.Year == year.Value);
        var list = await q.OrderByDescending(r => r.Year).ThenByDescending(r => r.Quarter).ToListAsync();
        return Ok(list.Select(ToDto));
    }

    [HttpPost]
    [Authorize(Roles = "Coordinator,HR,Admin")]
    public async Task<IActionResult> Create(CreatePerformanceRequest req)
    {
        var reviewerId = User.EmployeeId();
        if (!await User.CanAccessEmployeeAsync(_db, req.EmployeeId)) return Forbid();
        if (req.EmployeeId == reviewerId)
            return BadRequest(new { message = "No puedes evaluarte a ti mismo" });
        var overall    = Math.Round((req.QualityScore + req.EfficiencyScore + req.TeamworkScore + req.InitiativeScore) / 4, 2);

        var review = new PerformanceReview
        {
            EmployeeId      = req.EmployeeId,
            ReviewerId      = reviewerId,
            Quarter         = req.Quarter,
            Year            = req.Year,
            QualityScore    = req.QualityScore,
            EfficiencyScore = req.EfficiencyScore,
            TeamworkScore   = req.TeamworkScore,
            InitiativeScore = req.InitiativeScore,
            OverallScore    = overall,
            Strengths       = req.Strengths,
            AreasToImprove  = req.AreasToImprove,
            Goals           = req.Goals
        };
        _db.PerformanceReviews.Add(review);
        await _db.SaveChangesAsync();
        await _db.Entry(review).Reference(r => r.Employee).LoadAsync();
        return CreatedAtAction(nameof(GetAll), new { employeeId = review.EmployeeId }, ToDto(review));
    }

    private static PerformanceDto ToDto(PerformanceReview r) => new(
        r.Id, r.EmployeeId,
        r.Employee != null ? $"{r.Employee.FirstName} {r.Employee.LastName}" : "",
        r.Employee?.Department.ToString() ?? "",
        r.Quarter, r.Year,
        r.QualityScore, r.EfficiencyScore, r.TeamworkScore, r.InitiativeScore, r.OverallScore,
        r.Strengths, r.AreasToImprove, r.Goals, r.CreatedAt);
}
