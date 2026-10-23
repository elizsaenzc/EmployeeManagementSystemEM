using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HRPortal.Data;
using HRPortal.DTOs;
using HRPortal.Models;
using HRPortal.Services;

namespace HRPortal.Controllers;

[ApiController]
[Route("api/employees")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly AppDbContext _db;
    public EmployeesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? q, [FromQuery] string? department)
    {
        var query = _db.Employees.Include(e => e.User).AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(e => e.FirstName.Contains(q)
                                  || e.LastName.Contains(q)
                                  || e.Email.Contains(q)
                                  || e.Position.Contains(q));

        if (!string.IsNullOrWhiteSpace(department) && Enum.TryParse<Department>(department, out var dept))
            query = query.Where(e => e.Department == dept);

        var list = await query.OrderBy(e => e.FirstName).ThenBy(e => e.LastName).ToListAsync();
        // El directorio es visible para todos (correo, chat); el salario solo para RRHH y Administración
        var showSalary = User.IsHrOrAdmin();
        return Ok(list.Select(e => ToListDto(e, showSalary)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOne(int id)
    {
        var e = await _db.Employees.Include(e => e.User).Include(e => e.Manager)
                         .FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return NotFound();
        if (!await User.CanAccessEmployeeAsync(_db, id)) return Forbid();

        return Ok(new EmployeeDetailDto(
            e.Id, e.FirstName, e.LastName, e.FullName, e.Email,
            e.Phone, e.NationalId, e.BirthDate, e.Address,
            e.Position, e.Department.ToString(), e.RoleInCompany.ToString(),
            e.ContractType.ToString(), e.GrossSalary, e.MonthlySalary,
            e.HireDate, e.ContractEndDate, e.ManagerId,
            e.Manager != null ? $"{e.Manager.FirstName} {e.Manager.LastName}" : null,
            e.Initials, e.WorkSchedule, e.User?.IsActive ?? false));
    }

    [HttpPost]
    [Authorize(Roles = "HR,Admin")]
    public async Task<IActionResult> Create(CreateEmployeeRequest req)
    {
        var dept = Enum.Parse<Department>(req.Department);
        var role = Enum.Parse<UserRole>(req.Role);
        var ct   = Enum.Parse<ContractType>(req.ContractType);

        // Create user account
        var username = $"{req.FirstName.ToLower().Split(' ')[0]}.{req.LastName.ToLower().Split(' ')[0]}";
        var user = new AppUser
        {
            Username     = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Temp2025!"),
            Role         = role
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var employee = new Employee
        {
            UserId       = user.Id,
            FirstName    = req.FirstName,
            LastName     = req.LastName,
            Email        = req.Email,
            Phone        = req.Phone,
            NationalId   = req.NationalId,
            BirthDate    = req.BirthDate,
            Address      = req.Address,
            Position     = req.Position,
            Department   = dept,
            RoleInCompany = role,
            ContractType = ct,
            GrossSalary  = req.GrossSalary,
            HireDate     = req.HireDate,
            ManagerId    = req.ManagerId,
            WorkSchedule = req.WorkSchedule ?? "09:00-18:00"
        };
        _db.Employees.Add(employee);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOne), new { id = employee.Id }, ToListDto(employee));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "HR,Admin")]
    public async Task<IActionResult> Update(int id, UpdateEmployeeRequest req)
    {
        var e = await _db.Employees.Include(e => e.User).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return NotFound();

        e.FirstName     = req.FirstName;
        e.LastName      = req.LastName;
        e.Email         = req.Email;
        e.Phone         = req.Phone;
        e.NationalId    = req.NationalId;
        e.Address       = req.Address;
        e.Position      = req.Position;
        e.Department    = Enum.Parse<Department>(req.Department);
        e.RoleInCompany = Enum.Parse<UserRole>(req.Role);
        e.ContractType  = Enum.Parse<ContractType>(req.ContractType);
        e.GrossSalary   = req.GrossSalary;
        e.ManagerId     = req.ManagerId;
        e.WorkSchedule  = req.WorkSchedule;
        e.UpdatedAt     = DateTime.UtcNow;

        if (e.User != null) e.User.IsActive = req.IsActive;

        await _db.SaveChangesAsync();
        return Ok(ToListDto(e));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await _db.Employees.Include(e => e.User).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return NotFound();
        if (e.User != null) e.User.IsActive = false;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static EmployeeListDto ToListDto(Employee e, bool showSalary = true) => new(
        e.Id,
        $"{e.FirstName} {e.LastName}",
        e.Email, e.Position,
        e.Department.ToString(),
        e.RoleInCompany.ToString(),
        e.ContractType.ToString(),
        showSalary ? e.GrossSalary : null,
        showSalary ? e.MonthlySalary : null,
        e.Initials,
        e.HireDate,
        e.User?.IsActive ?? true,
        e.ManagerId,
        e.WorkSchedule);
}
