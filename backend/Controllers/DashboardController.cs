using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HRPortal.Data;
using HRPortal.DTOs;
using HRPortal.Models;
using HRPortal.Services;

namespace HRPortal.Controllers;

/// <summary>
/// Indicadores del panel según el rol: empresa (RRHH/Admin), equipo (coordinador) o personales (empleado).
/// Las sumas de importes se hacen en memoria porque SQLite no agrega columnas decimal.
/// </summary>
[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var me      = User.EmployeeId();
        var visible = await User.VisibleEmployeeIdsAsync(_db);
        var scope   = visible == null ? "company" : User.IsInRole("Coordinator") ? "team" : "self";

        var empQuery = _db.Employees.Include(e => e.User).AsNoTracking();
        if (visible != null) empQuery = empQuery.Where(e => visible.Contains(e.Id));
        var employees = await empQuery.ToListAsync();
        var activeIds = employees.Where(e => e.User?.IsActive != false).Select(e => e.Id).ToList();

        // Asistencia del último día con registros (hoy, o el último día laborable)
        var today   = DateOnly.FromDateTime(DateTime.Now);
        var attDate = await _db.Attendances
            .Where(a => a.Date <= today && activeIds.Contains(a.EmployeeId))
            .OrderByDescending(a => a.Date)
            .Select(a => (DateOnly?)a.Date)
            .FirstOrDefaultAsync();

        double attRate = 0;
        if (attDate.HasValue && activeIds.Count > 0)
        {
            var present = await _db.Attendances.CountAsync(a =>
                a.Date == attDate.Value && activeIds.Contains(a.EmployeeId) && a.Status != AttendanceStatus.Ausente);
            attRate = Math.Round((double)present / activeIds.Count * 100, 1);
        }

        // Nóminas: masa salarial de la empresa (RRHH/Admin) o la nómina propia (resto)
        var payQuery = _db.Payrolls.AsNoTracking();
        if (visible != null) payQuery = payQuery.Where(p => p.EmployeeId == me);
        var latest = await payQuery
            .OrderByDescending(p => p.Year).ThenByDescending(p => p.Month)
            .Select(p => new { p.Year, p.Month })
            .FirstOrDefaultAsync();
        decimal? payroll = null;
        if (latest != null)
        {
            var amounts = await payQuery
                .Where(p => p.Year == latest.Year && p.Month == latest.Month)
                .Select(p => p.NetSalary)
                .ToListAsync();
            payroll = amounts.Sum();
        }

        // Solicitudes pendientes: las que el usuario debe revisar, o las suyas si es empleado
        var leaveQuery = _db.LeaveRequests.Where(r => r.Status == RequestStatus.Pendiente);
        if (scope == "team") leaveQuery = leaveQuery.Where(r => visible!.Contains(r.EmployeeId) && r.EmployeeId != me);
        if (scope == "self") leaveQuery = leaveQuery.Where(r => r.EmployeeId == me);
        var pending = await leaveQuery.CountAsync();

        var unread = await _db.Notifications.CountAsync(n => n.EmployeeId == me && !n.IsRead);

        var byDept = scope == "self"
            ? new List<DeptStat>()
            : employees.Where(e => activeIds.Contains(e.Id))
                .GroupBy(e => e.Department.ToString())
                .Select(g => new DeptStat(g.Key, g.Count()))
                .OrderByDescending(d => d.Count)
                .ToList();

        var recent = (await _db.Attendances.AsNoTracking()
                .Where(a => a.EmployeeId == me && a.Date <= today)
                .OrderByDescending(a => a.Date)
                .Take(5)
                .ToListAsync())
            .Select(a => new AttendanceDayDto(
                a.Date.ToString("yyyy-MM-dd"), a.Status.ToString(),
                a.CheckIn?.ToString("HH:mm"), a.CheckOut?.ToString("HH:mm"),
                a.WorkedHours.HasValue ? Math.Round(a.WorkedHours.Value, 1) : null))
            .ToList();

        return Ok(new DashboardStats(
            scope,
            employees.Count, activeIds.Count, employees.Count - activeIds.Count,
            attRate, attDate?.ToString("yyyy-MM-dd"),
            payroll, latest?.Month, latest?.Year,
            pending, unread, byDept, recent));
    }
}
