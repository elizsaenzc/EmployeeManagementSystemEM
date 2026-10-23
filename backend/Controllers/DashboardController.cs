using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HRPortal.Api.Data;
using HRPortal.Api.DTOs;
using HRPortal.Api.Models;

namespace HRPortal.Api.Controllers;

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
        var employees = await _db.Employees.ToListAsync();

        var today = DateOnly.FromDateTime(DateTime.Today);
        var todayAtt = await _db.Attendances
            .Where(a => a.Date == today)
            .ToListAsync();

        var totalActive  = employees.Count(e => e.Status == EmploymentStatus.Active);
        var todayPresent = todayAtt.Count(a => a.Status != AttendanceStatus.Absent);
        var attRate      = totalActive > 0
            ? Math.Round((double)todayPresent / totalActive * 100, 1) : 0;

        var thisMonth = await _db.Payrolls
            .Where(p => p.Month == today.Month && p.Year == today.Year)
            .ToListAsync();
        var monthlyPayroll = thisMonth.Sum(p => p.BaseSalary + p.Bonus - p.Deductions);

        var byDept = employees
            .GroupBy(e => e.Department.ToString())
            .Select(g => new DeptCount(g.Key, g.Count()))
            .ToList();

        // Weekly trend: last 7 working days
        var weekly = new List<WeeklyAttendance>();
        var checkDate = today;
        int days = 0;
        while (days < 7)
        {
            if (checkDate.DayOfWeek != DayOfWeek.Saturday &&
                checkDate.DayOfWeek != DayOfWeek.Sunday)
            {
                var dayAtt = await _db.Attendances.Where(a => a.Date == checkDate).ToListAsync();
                weekly.Add(new WeeklyAttendance(
                    checkDate.ToString("ddd dd/MM"),
                    dayAtt.Count(a => a.Status != AttendanceStatus.Absent),
                    totalActive));
                days++;
            }
            checkDate = checkDate.AddDays(-1);
        }
        weekly.Reverse();

        return Ok(new DashboardStats(
            employees.Count,
            totalActive,
            employees.Count(e => e.Status == EmploymentStatus.OnLeave),
            attRate,
            monthlyPayroll,
            byDept,
            weekly));
    }
}
