namespace HRPortal.Api.Models;

public enum AttendanceStatus { Present, Absent, Late, HalfDay, Remote }

public class Attendance
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee? Employee { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly? CheckIn { get; set; }
    public TimeOnly? CheckOut { get; set; }
    public AttendanceStatus Status { get; set; }
    public string? Notes { get; set; }

    public double? HoursWorked =>
        CheckIn.HasValue && CheckOut.HasValue
            ? (CheckOut.Value.ToTimeSpan() - CheckIn.Value.ToTimeSpan()).TotalHours
            : null;
}
