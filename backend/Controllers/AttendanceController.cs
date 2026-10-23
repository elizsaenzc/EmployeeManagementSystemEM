using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HRPortal.Api.Data;
using HRPortal.Api.DTOs;
using HRPortal.Api.Models;

namespace HRPortal.Api.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly AppDbContext _db;
    public AttendanceController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? employeeId,
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        var query = _db.Attendances.Include(a => a.Employee).AsQueryable();

        if (employeeId.HasValue)
            query = query.Where(a => a.EmployeeId == employeeId);

        if (DateOnly.TryParse(from, out var f))
            query = query.Where(a => a.Date >= f);

        if (DateOnly.TryParse(to, out var t))
            query = query.Where(a => a.Date <= t);

        var list = await query.OrderByDescending(a => a.Date).ToListAsync();
        return Ok(list.Select(ToDto));
    }

    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var list  = await _db.Attendances
            .Include(a => a.Employee)
            .Where(a => a.Date == today)
            .ToListAsync();
        return Ok(list.Select(ToDto));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string? from, [FromQuery] string? to)
    {
        var query = _db.Attendances.AsQueryable();

        if (DateOnly.TryParse(from, out var f)) query = query.Where(a => a.Date >= f);
        if (DateOnly.TryParse(to,   out var t)) query = query.Where(a => a.Date <= t);

        var data = await query.ToListAsync();
        var byDate = data
            .GroupBy(a => a.Date)
            .OrderBy(g => g.Key)
            .Select(g => new DailyAttendanceSummary(
                g.Key.ToString("yyyy-MM-dd"),
                g.Count(a => a.Status == AttendanceStatus.Present),
                g.Count(a => a.Status == AttendanceStatus.Absent),
                g.Count(a => a.Status == AttendanceStatus.Late),
                g.Count(a => a.Status == AttendanceStatus.Remote),
                g.Count(a => a.Status == AttendanceStatus.HalfDay),
                g.Count()))
            .ToList();

        return Ok(byDate);
    }

    [HttpPost]
    public async Task<IActionResult> Upsert(UpsertAttendanceRequest req)
    {
        var date   = DateOnly.Parse(req.Date);
        var status = Enum.Parse<AttendanceStatus>(req.Status);

        var existing = await _db.Attendances
            .FirstOrDefaultAsync(a => a.EmployeeId == req.EmployeeId && a.Date == date);

        if (existing == null)
        {
            existing = new Attendance { EmployeeId = req.EmployeeId, Date = date };
            _db.Attendances.Add(existing);
        }

        existing.Status   = status;
        existing.CheckIn  = req.CheckIn  != null ? TimeOnly.Parse(req.CheckIn)  : null;
        existing.CheckOut = req.CheckOut != null ? TimeOnly.Parse(req.CheckOut) : null;
        existing.Notes    = req.Notes;

        await _db.SaveChangesAsync();
        await _db.Entry(existing).Reference(a => a.Employee).LoadAsync();
        return Ok(ToDto(existing));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var a = await _db.Attendances.FindAsync(id);
        if (a == null) return NotFound();
        _db.Attendances.Remove(a);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static AttendanceDto ToDto(Attendance a) => new(
        a.Id, a.EmployeeId,
        a.Employee != null ? $"{a.Employee.FirstName} {a.Employee.LastName}" : "",
        a.Employee != null ? $"{a.Employee.FirstName[0]}{a.Employee.LastName[0]}".ToUpper() : "??",
        a.Date.ToString("yyyy-MM-dd"),
        a.CheckIn?.ToString("HH:mm"),
        a.CheckOut?.ToString("HH:mm"),
        a.Status.ToString(),
        a.Notes,
        a.HoursWorked.HasValue ? Math.Round(a.HoursWorked.Value, 1) : null);
}
