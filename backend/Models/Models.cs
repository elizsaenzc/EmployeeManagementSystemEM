using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HRPortal.Models;

// ── Enumerations ──────────────────────────────────────────────────────────────

public enum UserRole
{
    Employee    = 1,
    Coordinator = 2,
    HR          = 3,
    Admin       = 4
}

public enum Department
{
    Direccion,
    Tecnologia,
    Marketing,
    Ventas,
    Finanzas,
    RRHH,
    Operaciones,
    Legal,
    Atencion_al_Cliente
}

public enum ContractType { Indefinido, Temporal, Practicas, Obra_y_Servicio }

public enum RequestStatus { Pendiente, Aprobada, Rechazada, Cancelada }

public enum LeaveType
{
    Vacaciones,
    Permiso_Medico,
    Asunto_Personal,
    Asunto_Familiar,
    Calamidad_Domestica,
    Permiso_Remunerado,
    Baja_por_Enfermedad
}

public enum AttendanceStatus { Presente, Ausente, Tarde, Teletrabajo, Media_Jornada }

public enum NotificationType { Info, Aviso, Urgente, Sistema }

public enum PayrollStatus { Borrador, Calculada, Pagada }

// ── User / Employee ───────────────────────────────────────────────────────────

public class AppUser
{
    public int      Id           { get; set; }
    public string   Username     { get; set; } = string.Empty;
    public string   PasswordHash { get; set; } = string.Empty;
    public UserRole Role         { get; set; }
    public bool     IsActive     { get; set; } = true;
    public DateTime CreatedAt    { get; set; } = DateTime.UtcNow;

    public Employee? Employee { get; set; }
}

public class Employee
{
    public int        Id           { get; set; }
    public int        UserId       { get; set; }
    public AppUser?   User         { get; set; }

    // Personal data
    [MaxLength(80)]  public string FirstName   { get; set; } = string.Empty;
    [MaxLength(80)]  public string LastName    { get; set; } = string.Empty;
    [MaxLength(200)] public string Email       { get; set; } = string.Empty;
    [MaxLength(25)]  public string? Phone      { get; set; }
    [MaxLength(20)]  public string? NationalId { get; set; }
    public DateTime?  BirthDate    { get; set; }
    [MaxLength(250)] public string? Address    { get; set; }

    // Job data
    [MaxLength(120)] public string   Position      { get; set; } = string.Empty;
    public Department                Department    { get; set; }
    public UserRole                  RoleInCompany { get; set; }
    public ContractType              ContractType  { get; set; }
    public DateTime                  HireDate      { get; set; }
    public DateTime?                 ContractEndDate { get; set; }
    public decimal                   GrossSalary   { get; set; }
    public int?                      ManagerId     { get; set; }
    [MaxLength(50)] public string?   WorkSchedule  { get; set; } // e.g. "09:00-18:00"

    // Computed
    [NotMapped] public string FullName      => $"{FirstName} {LastName}";
    [NotMapped] public string Initials      => $"{FirstName[0]}{LastName[0]}".ToUpper();
    [NotMapped] public decimal MonthlySalary => Math.Round(GrossSalary / 12, 2);

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Employee?              Manager         { get; set; }
    public ICollection<Employee>  DirectReports   { get; set; } = new List<Employee>();
    public ICollection<Attendance>     Attendances     { get; set; } = new List<Attendance>();
    public ICollection<LeaveRequest>   LeaveRequests   { get; set; } = new List<LeaveRequest>();
    public ICollection<OvertimeEntry>  OvertimeEntries { get; set; } = new List<OvertimeEntry>();
    public ICollection<Payroll>        Payrolls        { get; set; } = new List<Payroll>();
    public ICollection<PerformanceReview> Reviews      { get; set; } = new List<PerformanceReview>();
    public ICollection<Notification>   Notifications   { get; set; } = new List<Notification>();
    public ICollection<EmailMessage>   SentEmails      { get; set; } = new List<EmailMessage>();
    public ICollection<EmailMessage>   ReceivedEmails  { get; set; } = new List<EmailMessage>();
    public ICollection<ChatMessage>    SentMessages    { get; set; } = new List<ChatMessage>();
}

// ── Attendance ────────────────────────────────────────────────────────────────

public class Attendance
{
    public int              Id           { get; set; }
    public int              EmployeeId   { get; set; }
    public Employee?        Employee     { get; set; }
    public DateOnly         Date         { get; set; }
    public TimeOnly?        CheckIn      { get; set; }
    public TimeOnly?        CheckOut     { get; set; }
    public TimeOnly?        LunchStart   { get; set; }
    public TimeOnly?        LunchEnd     { get; set; }
    public AttendanceStatus Status       { get; set; }
    public string?          Notes        { get; set; }

    [NotMapped]
    public double? WorkedHours
    {
        get
        {
            if (!CheckIn.HasValue || !CheckOut.HasValue) return null;
            var raw    = (CheckOut.Value.ToTimeSpan() - CheckIn.Value.ToTimeSpan()).TotalHours;
            var lunch  = (LunchStart.HasValue && LunchEnd.HasValue)
                       ? (LunchEnd.Value.ToTimeSpan() - LunchStart.Value.ToTimeSpan()).TotalHours
                       : 0;
            return Math.Round(raw - lunch, 2);
        }
    }
}

// ── Leave / Vacation requests ─────────────────────────────────────────────────

public class LeaveRequest
{
    public int           Id           { get; set; }
    public int           EmployeeId   { get; set; }
    public Employee?     Employee     { get; set; }
    public LeaveType     Type         { get; set; }
    public DateOnly      StartDate    { get; set; }
    public DateOnly      EndDate      { get; set; }
    public int           TotalDays    { get; set; }
    public string?       Reason       { get; set; }
    public string?       Attachment   { get; set; } // filename
    public RequestStatus Status       { get; set; } = RequestStatus.Pendiente;
    public int?          ReviewedById { get; set; }
    public string?       ReviewNotes  { get; set; }
    public DateTime?     ReviewedAt   { get; set; }
    public DateTime      CreatedAt    { get; set; } = DateTime.UtcNow;
}

// ── Overtime ──────────────────────────────────────────────────────────────────

public class OvertimeEntry
{
    public int       Id         { get; set; }
    public int       EmployeeId { get; set; }
    public Employee? Employee   { get; set; }
    public DateOnly  Date       { get; set; }
    public decimal   Hours      { get; set; }
    public string?   Reason     { get; set; }
    public bool      Approved   { get; set; }
    public int?      ApprovedById { get; set; }
    public DateTime  CreatedAt  { get; set; } = DateTime.UtcNow;
}

// ── Payroll ───────────────────────────────────────────────────────────────────

public class Payroll
{
    public int           Id            { get; set; }
    public int           EmployeeId    { get; set; }
    public Employee?     Employee      { get; set; }
    public int           Month         { get; set; }
    public int           Year          { get; set; }
    public decimal       GrossBase     { get; set; }
    public decimal       OvertimePay   { get; set; }
    public decimal       Bonus         { get; set; }
    public decimal       SocialSecurity { get; set; }  // IRPF + SS employee
    public decimal       Deductions    { get; set; }   // absences, etc.
    public decimal       NetSalary     { get; set; }
    public PayrollStatus Status        { get; set; } = PayrollStatus.Borrador;
    public DateTime?     PaidAt        { get; set; }
    public string?       Notes         { get; set; }
    public DateTime      CreatedAt     { get; set; } = DateTime.UtcNow;
}

// ── Performance ───────────────────────────────────────────────────────────────

public class PerformanceReview
{
    public int       Id           { get; set; }
    public int       EmployeeId   { get; set; }
    public Employee? Employee     { get; set; }
    public int       ReviewerId   { get; set; }
    public int       Quarter      { get; set; }  // 1-4
    public int       Year         { get; set; }
    public decimal   QualityScore { get; set; }  // 0-10
    public decimal   EfficiencyScore { get; set; }
    public decimal   TeamworkScore   { get; set; }
    public decimal   InitiativeScore { get; set; }
    public decimal   OverallScore    { get; set; }
    public string?   Strengths       { get; set; }
    public string?   AreasToImprove  { get; set; }
    public string?   Goals           { get; set; }
    public DateTime  CreatedAt       { get; set; } = DateTime.UtcNow;
}

// ── Notifications ─────────────────────────────────────────────────────────────

public class Notification
{
    public int              Id         { get; set; }
    public int              EmployeeId { get; set; }
    public Employee?        Employee   { get; set; }
    public string           Title      { get; set; } = string.Empty;
    public string           Body       { get; set; } = string.Empty;
    public NotificationType Type       { get; set; }
    public bool             IsRead     { get; set; }
    public string?          Link       { get; set; }
    public DateTime         CreatedAt  { get; set; } = DateTime.UtcNow;
}

// ── Corporate Email ───────────────────────────────────────────────────────────

public class EmailMessage
{
    public int       Id          { get; set; }
    public int       SenderId    { get; set; }
    public Employee? Sender      { get; set; }
    public int       RecipientId { get; set; }
    public Employee? Recipient   { get; set; }
    public string    Subject     { get; set; } = string.Empty;
    public string    Body        { get; set; } = string.Empty;
    public bool      IsRead      { get; set; }
    public bool      IsStarred   { get; set; }
    public string?   Folder      { get; set; } = "inbox";  // inbox, sent, drafts, trash
    public string?   AttachmentName { get; set; }
    public DateTime  SentAt      { get; set; } = DateTime.UtcNow;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

public class ChatMessage
{
    public int       Id         { get; set; }
    public int       SenderId   { get; set; }
    public Employee? Sender     { get; set; }
    public int       RecipientId { get; set; }
    public string    Body       { get; set; } = string.Empty;
    public bool      IsRead     { get; set; }
    public DateTime  SentAt     { get; set; } = DateTime.UtcNow;
}
