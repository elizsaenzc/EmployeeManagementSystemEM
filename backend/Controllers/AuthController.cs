using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HRPortal.Data;
using HRPortal.DTOs;
using HRPortal.Services;

namespace HRPortal.Controllers
{
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtService  _jwt;

    public AuthController(AppDbContext db, JwtService jwt) { _db = db; _jwt = jwt; }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Faltan credenciales" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username && u.IsActive);
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Usuario o contraseña incorrectos" });

        var emp = await _db.Employees.FirstOrDefaultAsync(e => e.UserId == user.Id);
        if (emp == null)
            return Unauthorized(new { message = "Empleado no encontrado" });

        var token = _jwt.Generate(user, emp);

        return Ok(new LoginResponse(
            token, user.Username, user.Role.ToString(),
            emp.Id, emp.FullName, emp.Department.ToString(),
            emp.Position, emp.Email));
    }

    [HttpGet("me")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public IActionResult Me()
    {
        return Ok(new
        {
            userId     = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
            username   = User.Identity?.Name,
            role       = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value,
            employeeId = User.FindFirst("employee_id")?.Value,
            fullName   = User.FindFirst("full_name")?.Value,
            department = User.FindFirst("department")?.Value,
        });
    }
}
}
