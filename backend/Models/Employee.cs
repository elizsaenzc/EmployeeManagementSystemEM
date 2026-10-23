namespace HRPortal.Api.Models;

public enum EmploymentStatus { Active, OnLeave, Terminated }
public enum Department { Engineering, Sales, Marketing, Finance, HR, Operations, Design }

public class Employee
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public Department Department { get; set; }
    public EmploymentStatus Status { get; set; } = EmploymentStatus.Active;
    public decimal BaseSalary { get; set; }
    public DateTime HireDate { get; set; }
    public string? AvatarInitials => $"{FirstName[0]}{LastName[0]}".ToUpper();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<Payroll> Payrolls { get; set; } = new List<Payroll>();
}
