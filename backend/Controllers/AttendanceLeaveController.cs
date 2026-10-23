using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HRPortal.Data;
using HRPortal.DTOs;
using HRPortal.Models;
using HRPortal.Services;

namespace HRPortal.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly AppDbContext _db;
    public AttendanceController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? employeeId, [FromQuery] string? from, [FromQuery] string? to)
    {
        var q = _db.Attendances.Include(a => a.Employee).AsQueryable();

        var visible = await User.VisibleEmployeeIdsAsync(_db);
        if (visible != null) q = q.Where(a => visible.Contains(a.EmployeeId));
        if (employeeId.HasValue) q = q.Where(a => a.EmployeeId == employeeId.Value);
        if (DateOnly.TryParse(from, out var f)) q = q.Where(a => a.Date >= f);
        if (DateOnly.TryParse(to,   out var t)) q = q.Where(a => a.Date <= t);

        var list = await q.OrderByDescending(a => a.Date).ToListAsync();
        return Ok(list.Select(ToDto));
    }

    [HttpPost("checkin")]
    public async Task<IActionResult> CheckIn(CheckInRequest req)
    {
        if (!await User.CanAccessEmployeeAsync(_db, req.EmployeeId)) return Forbid();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var att   = await _db.Attendances.FirstOrDefaultAsync(
            a => a.EmployeeId == req.EmployeeId && a.Date == today);

        if (att == null)
        {
            att = new Attendance
            {
                EmployeeId = req.EmployeeId,
                Date       = today,
                Status     = AttendanceStatus.Presente
            };
            _db.Attendances.Add(att);
        }
        att.CheckIn = TimeOnly.Parse(req.Time);
        await _db.SaveChangesAsync();
        await _db.Entry(att).Reference(a => a.Employee).LoadAsync();
        return Ok(ToDto(att));
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> CheckOut(CheckOutRequest req)
    {
        if (!await User.CanAccessEmployeeAsync(_db, req.EmployeeId)) return Forbid();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var att   = await _db.Attendances.FirstOrDefaultAsync(
            a => a.EmployeeId == req.EmployeeId && a.Date == today);

        if (att == null) return NotFound(new { message = "No hay registro de entrada hoy" });

        att.CheckOut   = TimeOnly.Parse(req.Time);
        if (!string.IsNullOrEmpty(req.LunchStart)) att.LunchStart = TimeOnly.Parse(req.LunchStart);
        if (!string.IsNullOrEmpty(req.LunchEnd))   att.LunchEnd   = TimeOnly.Parse(req.LunchEnd);

        await _db.SaveChangesAsync();
        await _db.Entry(att).Reference(a => a.Employee).LoadAsync();
        return Ok(ToDto(att));
    }

    [HttpPost]
    [Authorize(Roles = "Coordinator,HR,Admin")]
    public async Task<IActionResult> Upsert(UpsertAttendanceRequest req)
    {
        if (!await User.CanAccessEmployeeAsync(_db, req.EmployeeId)) return Forbid();
        var date = DateOnly.Parse(req.Date);
        var att  = await _db.Attendances
            .FirstOrDefaultAsync(a => a.EmployeeId == req.EmployeeId && a.Date == date);

        if (att == null)
        {
            att = new Attendance { EmployeeId = req.EmployeeId, Date = date };
            _db.Attendances.Add(att);
        }

        att.Status    = Enum.Parse<AttendanceStatus>(req.Status);
        att.Notes     = req.Notes;
        att.CheckIn   = req.CheckIn   != null ? TimeOnly.Parse(req.CheckIn)   : null;
        att.CheckOut  = req.CheckOut  != null ? TimeOnly.Parse(req.CheckOut)  : null;
        att.LunchStart = req.LunchStart != null ? TimeOnly.Parse(req.LunchStart) : null;
        att.LunchEnd   = req.LunchEnd   != null ? TimeOnly.Parse(req.LunchEnd)   : null;

        await _db.SaveChangesAsync();
        await _db.Entry(att).Reference(a => a.Employee).LoadAsync();
        return Ok(ToDto(att));
    }

    private static AttendanceDto ToDto(Attendance a) => new(
        a.Id, a.EmployeeId,
        a.Employee != null ? $"{a.Employee.FirstName} {a.Employee.LastName}" : "",
        a.Employee != null ? $"{a.Employee.FirstName[0]}{a.Employee.LastName[0]}".ToUpper() : "??",
        a.Date.ToString("yyyy-MM-dd"),
        a.CheckIn?.ToString("HH:mm"),
        a.CheckOut?.ToString("HH:mm"),
        a.LunchStart?.ToString("HH:mm"),
        a.LunchEnd?.ToString("HH:mm"),
        a.Status.ToString(),
        a.Notes,
        a.WorkedHours.HasValue ? Math.Round(a.WorkedHours.Value, 2) : null);
}

// ── Leave ──────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/leaves")]
[Authorize]
public class LeaveController : ControllerBase
{
    private readonly AppDbContext _db;
    public LeaveController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? employeeId, [FromQuery] string? status)
    {
        var q = _db.LeaveRequests.Include(r => r.Employee).AsQueryable();

        var visible = await User.VisibleEmployeeIdsAsync(_db);
        if (visible != null) q = q.Where(r => visible.Contains(r.EmployeeId));
        if (employeeId.HasValue) q = q.Where(r => r.EmployeeId == employeeId.Value);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<RequestStatus>(status, out var s))
            q = q.Where(r => r.Status == s);

        var list = await q.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(await Task.WhenAll(list.Select(r => ToDtoAsync(r))));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateLeaveRequest req)
    {
        if (!await User.CanAccessEmployeeAsync(_db, req.EmployeeId)) return Forbid();
        var leave = new LeaveRequest
        {
            EmployeeId = req.EmployeeId,
            Type       = Enum.Parse<LeaveType>(req.Type),
            StartDate  = DateOnly.Parse(req.StartDate),
            EndDate    = DateOnly.Parse(req.EndDate),
            TotalDays  = req.TotalDays,
            Reason     = req.Reason,
            Status     = RequestStatus.Pendiente
        };
        _db.LeaveRequests.Add(leave);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { employeeId = leave.EmployeeId }, await ToDtoAsync(leave));
    }

    [HttpPatch("{id}/review")]
    [Authorize(Roles = "Coordinator,HR,Admin")]
    public async Task<IActionResult> Review(int id, ReviewLeaveRequest req)
    {
        var leave = await _db.LeaveRequests.FindAsync(id);
        if (leave == null) return NotFound();
        if (!await User.CanAccessEmployeeAsync(_db, leave.EmployeeId)) return Forbid();

        var reviewerId = User.EmployeeId();
        if (leave.EmployeeId == reviewerId && !User.IsHrOrAdmin())
            return BadRequest(new { message = "No puedes revisar tus propias solicitudes" });
        leave.Status      = Enum.Parse<RequestStatus>(req.Status);
        leave.ReviewedById = reviewerId;
        leave.ReviewNotes = req.ReviewNotes;
        leave.ReviewedAt  = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(await ToDtoAsync(leave));
    }

    private async Task<LeaveRequestDto> ToDtoAsync(LeaveRequest r)
    {
        string? reviewerName = null;
        if (r.ReviewedById.HasValue)
        {
            var rev = await _db.Employees.FindAsync(r.ReviewedById.Value);
            reviewerName = rev != null ? $"{rev.FirstName} {rev.LastName}" : null;
        }
        var empName = r.Employee != null
            ? $"{r.Employee.FirstName} {r.Employee.LastName}"
            : (await _db.Employees.FindAsync(r.EmployeeId)) is Employee emp
                ? $"{emp.FirstName} {emp.LastName}" : "—";

        return new LeaveRequestDto(
            r.Id, r.EmployeeId, empName, r.Type.ToString(),
            r.StartDate.ToString("yyyy-MM-dd"), r.EndDate.ToString("yyyy-MM-dd"),
            r.TotalDays, r.Reason, r.Status.ToString(),
            r.ReviewedById, reviewerName, r.ReviewNotes, r.ReviewedAt, r.CreatedAt);
    }
}

// ── Overtime ───────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/overtime")]
[Authorize]
public class OvertimeController : ControllerBase
{
    private readonly AppDbContext _db;
    public OvertimeController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? employeeId)
    {
        var q = _db.OvertimeEntries.Include(o => o.Employee).AsQueryable();
        var visible = await User.VisibleEmployeeIdsAsync(_db);
        if (visible != null) q = q.Where(o => visible.Contains(o.EmployeeId));
        if (employeeId.HasValue) q = q.Where(o => o.EmployeeId == employeeId.Value);
        var list = await q.OrderByDescending(o => o.Date).ToListAsync();
        return Ok(list.Select(ToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOvertimeRequest req)
    {
        if (!await User.CanAccessEmployeeAsync(_db, req.EmployeeId)) return Forbid();
        var entry = new OvertimeEntry
        {
            EmployeeId = req.EmployeeId,
            Date       = DateOnly.Parse(req.Date),
            Hours      = req.Hours,
            Reason     = req.Reason,
            Approved   = false
        };
        _db.OvertimeEntries.Add(entry);
        await _db.SaveChangesAsync();
        await _db.Entry(entry).Reference(o => o.Employee).LoadAsync();
        return CreatedAtAction(nameof(GetAll), new { employeeId = entry.EmployeeId }, ToDto(entry));
    }

    [HttpPatch("{id}/approve")]
    [Authorize(Roles = "Coordinator,HR,Admin")]
    public async Task<IActionResult> Approve(int id)
    {
        var entry = await _db.OvertimeEntries.FindAsync(id);
        if (entry == null) return NotFound();
        if (!await User.CanAccessEmployeeAsync(_db, entry.EmployeeId)) return Forbid();
        var approverId = User.EmployeeId();
        if (entry.EmployeeId == approverId && !User.IsHrOrAdmin())
            return BadRequest(new { message = "No puedes aprobar tus propias horas extra" });
        entry.Approved     = true;
        entry.ApprovedById = approverId;
        await _db.SaveChangesAsync();
        await _db.Entry(entry).Reference(o => o.Employee).LoadAsync();
        return Ok(ToDto(entry));
    }

    private static OvertimeDto ToDto(OvertimeEntry o) => new(
        o.Id, o.EmployeeId,
        o.Employee != null ? $"{o.Employee.FirstName} {o.Employee.LastName}" : "",
        o.Date.ToString("yyyy-MM-dd"),
        o.Hours, o.Reason, o.Approved, o.ApprovedById);
}
