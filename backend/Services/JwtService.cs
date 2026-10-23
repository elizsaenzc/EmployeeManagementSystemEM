using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using HRPortal.Data;
using HRPortal.DTOs;
using HRPortal.Models;
using HRPortal.Services;

namespace HRPortal.Services
{
    public class JwtService
    {
        private readonly IConfiguration _cfg;
        public JwtService(IConfiguration cfg) => _cfg = cfg;

        public string Generate(AppUser user, Employee emp)
        {
            var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name,           user.Username),
                new Claim(ClaimTypes.Role,           user.Role.ToString()),
                new Claim("employee_id",             emp.Id.ToString()),
                new Claim("full_name",               emp.FullName),
                new Claim("department",              emp.Department.ToString()),
            };
            var token = new JwtSecurityToken(
                issuer:   _cfg["Jwt:Issuer"],
                audience: _cfg["Jwt:Audience"],
                claims:   claims,
                expires:  DateTime.UtcNow.AddHours(10),
                signingCredentials: creds);
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}

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
