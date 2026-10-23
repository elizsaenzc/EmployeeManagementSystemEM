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
