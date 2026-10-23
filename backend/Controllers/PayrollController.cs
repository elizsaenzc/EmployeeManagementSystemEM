using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HRPortal.Api.Data;
using HRPortal.Api.DTOs;
using HRPortal.Api.Models;

namespace HRPortal.Api.Controllers;

[ApiController]
[Route("api/payroll")]
[Authorize]
public class PayrollController : ControllerBase
{
    private readonly AppDbContext _db;
    public PayrollController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? month, [FromQuery] int? year)
    {
        var query = _db.Payrolls.Include(p => p.Employee).AsQueryable();
        if (month.HasValue) query = query.Where(p => p.Month == month);
        if (year.HasValue)  query = query.Where(p => p.Year  == year);

        var list = await query.OrderByDescending(p => p.Year)
            .ThenByDescending(p => p.Month)
            .ToListAsync();
        return Ok(list.Select(ToDto));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummaries()
    {
        var summaries = await _db.Payrolls
            .GroupBy(p => new { p.Year, p.Month })
            .Select(g => new PayrollSummary(
                g.Key.Month, g.Key.Year,
                g.Sum(p => p.BaseSalary + p.Bonus),
                g.Sum(p => p.BaseSalary + p.Bonus - p.Deductions),
                g.Count(),
                g.Count(p => p.Paid)))
            .OrderByDescending(s => s.Year)
            .ThenByDescending(s => s.Month)
            .ToListAsync();

        return Ok(summaries);
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate(GeneratePayrollRequest req)
    {
        var exists = await _db.Payrolls
            .AnyAsync(p => p.Month == req.Month && p.Year == req.Year);

        if (exists)
            return BadRequest(new { message = "Ya existe nómina para ese periodo" });

        var employees = await _db.Employees
            .Where(e => e.Status == EmploymentStatus.Active)
            .ToListAsync();

        var payrolls = employees.Select(e => new Payroll
        {
            EmployeeId = e.Id,
            Month      = req.Month,
            Year       = req.Year,
            BaseSalary = Math.Round(e.BaseSalary / 12, 2),
            Bonus      = 0,
            Deductions = Math.Round(e.BaseSalary / 12 * 0.065m, 2),
            Paid       = false
        }).ToList();

        _db.Payrolls.AddRange(payrolls);
        await _db.SaveChangesAsync();
        return Ok(new { generated = payrolls.Count });
    }

    [HttpPatch("{id}/pay")]
    public async Task<IActionResult> MarkPaid(int id)
    {
        var p = await _db.Payrolls.FindAsync(id);
        if (p == null) return NotFound();
        p.Paid   = true;
        p.PaidAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(p).Reference(x => x.Employee).LoadAsync();
        return Ok(ToDto(p));
    }

    [HttpPatch("{id}/bonus")]
    public async Task<IActionResult> UpdateBonus(int id, [FromBody] decimal bonus)
    {
        var p = await _db.Payrolls.FindAsync(id);
        if (p == null) return NotFound();
        p.Bonus = bonus;
        await _db.SaveChangesAsync();
        await _db.Entry(p).Reference(x => x.Employee).LoadAsync();
        return Ok(ToDto(p));
    }

    private static PayrollDto ToDto(Payroll p) => new(
        p.Id, p.EmployeeId,
        p.Employee != null ? $"{p.Employee.FirstName} {p.Employee.LastName}" : "",
        p.Employee?.Department.ToString() ?? "",
        p.Month, p.Year,
        p.BaseSalary, p.Bonus, p.Deductions,
        p.BaseSalary + p.Bonus - p.Deductions,
        p.Paid, p.PaidAt);
}
