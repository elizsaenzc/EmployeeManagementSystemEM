using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using HRPortal.Data;

namespace HRPortal.Services;

/// <summary>
/// Reglas de visibilidad por rol:
///  - HR y Admin ven a toda la plantilla.
///  - Un coordinador se ve a sí mismo y a su equipo directo.
///  - Un empleado solo se ve a sí mismo.
/// </summary>
public static class AccessScope
{
    public static int EmployeeId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirst("employee_id")!.Value);

    public static bool IsHrOrAdmin(this ClaimsPrincipal user) =>
        user.IsInRole("HR") || user.IsInRole("Admin");

    /// <summary>Ids de empleado visibles para el usuario; null significa "todos".</summary>
    public static async Task<List<int>?> VisibleEmployeeIdsAsync(this ClaimsPrincipal user, AppDbContext db)
    {
        if (user.IsHrOrAdmin()) return null;

        var me = user.EmployeeId();
        if (!user.IsInRole("Coordinator")) return new List<int> { me };

        var team = await db.Employees
            .Where(e => e.ManagerId == me)
            .Select(e => e.Id)
            .ToListAsync();
        team.Add(me);
        return team;
    }

    public static async Task<bool> CanAccessEmployeeAsync(this ClaimsPrincipal user, AppDbContext db, int employeeId)
    {
        var visible = await user.VisibleEmployeeIdsAsync(db);
        return visible == null || visible.Contains(employeeId);
    }
}
