namespace HRPortal.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────
public record LoginRequest(string Username, string Password);
public record LoginResponse(string Token, string Username, string Role, int EmployeeId, string FullName, string Department, string Position, string Email);

// ── Employee ──────────────────────────────────────────────────────────────────
public record EmployeeListDto(
    int Id, string FullName, string Email, string Position,
    string Department, string Role, string ContractType,
    decimal? GrossSalary, decimal? MonthlySalary, string Initials,
    DateTime HireDate, bool IsActive, int? ManagerId, string? WorkSchedule);

public record EmployeeDetailDto(
    int Id, string FirstName, string LastName, string FullName, string Email,
    string? Phone, string? NationalId, DateTime? BirthDate, string? Address,
    string Position, string Department, string Role, string ContractType,
    decimal? GrossSalary, decimal? MonthlySalary, DateTime HireDate,
    DateTime? ContractEndDate, int? ManagerId, string? ManagerName,
    string Initials, string? WorkSchedule, bool IsActive);

public record CreateEmployeeRequest(
    string FirstName, string LastName, string Email, string? Phone,
    string? NationalId, DateTime? BirthDate, string? Address,
    string Position, string Department, string Role, string ContractType,
    decimal GrossSalary, DateTime HireDate, int? ManagerId, string? WorkSchedule);

public record UpdateEmployeeRequest(
    string FirstName, string LastName, string Email, string? Phone,
    string? NationalId, string? Address, string Position,
    string Department, string Role, string ContractType,
    decimal GrossSalary, int? ManagerId, string? WorkSchedule, bool IsActive);

// ── Attendance ────────────────────────────────────────────────────────────────
public record AttendanceDto(
    int Id, int EmployeeId, string EmployeeName, string Initials,
    string Date, string? CheckIn, string? CheckOut,
    string? LunchStart, string? LunchEnd,
    string Status, string? Notes, double? WorkedHours);

public record CheckInRequest(int EmployeeId, string Time);
public record CheckOutRequest(int EmployeeId, string Time, string? LunchStart, string? LunchEnd);
public record UpsertAttendanceRequest(
    int EmployeeId, string Date, string? CheckIn, string? CheckOut,
    string? LunchStart, string? LunchEnd, string Status, string? Notes);

public record AttendanceSummary(string Date, int Present, int Absent, int Remote, int Late, int Total);

// ── Leave ─────────────────────────────────────────────────────────────────────
public record LeaveRequestDto(
    int Id, int EmployeeId, string EmployeeName, string Type,
    string StartDate, string EndDate, int TotalDays, string? Reason,
    string Status, int? ReviewedById, string? ReviewerName,
    string? ReviewNotes, DateTime? ReviewedAt, DateTime CreatedAt);

public record CreateLeaveRequest(
    int EmployeeId, string Type, string StartDate, string EndDate,
    int TotalDays, string? Reason);

public record ReviewLeaveRequest(string Status, string? ReviewNotes);

// ── Overtime ──────────────────────────────────────────────────────────────────
public record OvertimeDto(
    int Id, int EmployeeId, string EmployeeName,
    string Date, decimal Hours, string? Reason, bool Approved, int? ApprovedById);

public record CreateOvertimeRequest(int EmployeeId, string Date, decimal Hours, string? Reason);

// ── Payroll ───────────────────────────────────────────────────────────────────
public record PayrollDto(
    int Id, int EmployeeId, string EmployeeName, string Department,
    int Month, int Year, decimal GrossBase, decimal OvertimePay,
    decimal Bonus, decimal SocialSecurity, decimal Deductions,
    decimal NetSalary, string Status, DateTime? PaidAt, string? Notes);

public record GeneratePayrollRequest(int Month, int Year);
public record PayrollSummaryDto(int Month, int Year, decimal TotalGross, decimal TotalNet, int Count, int PaidCount);

// ── Performance ───────────────────────────────────────────────────────────────
public record PerformanceDto(
    int Id, int EmployeeId, string EmployeeName, string Department,
    int Quarter, int Year, decimal QualityScore, decimal EfficiencyScore,
    decimal TeamworkScore, decimal InitiativeScore, decimal OverallScore,
    string? Strengths, string? AreasToImprove, string? Goals, DateTime CreatedAt);

public record CreatePerformanceRequest(
    int EmployeeId, int Quarter, int Year,
    decimal QualityScore, decimal EfficiencyScore,
    decimal TeamworkScore, decimal InitiativeScore,
    string? Strengths, string? AreasToImprove, string? Goals);

// ── Notifications ─────────────────────────────────────────────────────────────
public record NotificationDto(
    int Id, string Title, string Body, string Type, bool IsRead, string? Link, DateTime CreatedAt);

// ── Email ─────────────────────────────────────────────────────────────────────
public record EmailDto(
    int Id, int SenderId, string SenderName, string SenderEmail,
    int RecipientId, string RecipientName, string RecipientEmail,
    string Subject, string Body, bool IsRead, bool IsStarred,
    string Folder, string? AttachmentName, DateTime SentAt);

public record SendEmailRequest(
    int RecipientId, string Subject, string Body, string? AttachmentName);

// ── Chat ──────────────────────────────────────────────────────────────────────
public record ChatMessageDto(
    int Id, int SenderId, string SenderName, string SenderInitials,
    int RecipientId, string Body, bool IsRead, DateTime SentAt);

public record SendChatRequest(int RecipientId, string Body);

// ── Dashboard ─────────────────────────────────────────────────────────────────
public record DashboardStats(
    string Scope,                       // company | team | self
    int TotalEmployees, int Active, int Inactive,
    double AttendanceRate, string? AttendanceDate,
    decimal? Payroll, int? PayrollMonth, int? PayrollYear,
    int PendingRequests, int UnreadNotifications,
    List<DeptStat> ByDepartment,
    List<AttendanceDayDto> RecentAttendance);

public record AttendanceDayDto(string Date, string Status, string? CheckIn, string? CheckOut, double? Hours);

public record DeptStat(string Department, int Count);
