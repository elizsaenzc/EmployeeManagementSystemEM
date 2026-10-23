using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using HRPortal.Models;

namespace HRPortal.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> o) : base(o) { }

    public DbSet<AppUser>          Users          => Set<AppUser>();
    public DbSet<Employee>         Employees      => Set<Employee>();
    public DbSet<Attendance>       Attendances    => Set<Attendance>();
    public DbSet<LeaveRequest>     LeaveRequests  => Set<LeaveRequest>();
    public DbSet<OvertimeEntry>    OvertimeEntries => Set<OvertimeEntry>();
    public DbSet<Payroll>          Payrolls       => Set<Payroll>();
    public DbSet<PerformanceReview> PerformanceReviews => Set<PerformanceReview>();
    public DbSet<Notification>     Notifications  => Set<Notification>();
    public DbSet<EmailMessage>     Emails         => Set<EmailMessage>();
    public DbSet<ChatMessage>      ChatMessages   => Set<ChatMessage>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        // Decimal precision
        m.Entity<Employee>().Property(e => e.GrossSalary).HasColumnType("decimal(12,2)");
        m.Entity<Payroll>().Property(p => p.GrossBase).HasColumnType("decimal(12,2)");
        m.Entity<Payroll>().Property(p => p.OvertimePay).HasColumnType("decimal(12,2)");
        m.Entity<Payroll>().Property(p => p.Bonus).HasColumnType("decimal(12,2)");
        m.Entity<Payroll>().Property(p => p.SocialSecurity).HasColumnType("decimal(12,2)");
        m.Entity<Payroll>().Property(p => p.Deductions).HasColumnType("decimal(12,2)");
        m.Entity<Payroll>().Property(p => p.NetSalary).HasColumnType("decimal(12,2)");
        m.Entity<OvertimeEntry>().Property(o => o.Hours).HasColumnType("decimal(5,2)");
        m.Entity<PerformanceReview>().Property(r => r.QualityScore).HasColumnType("decimal(4,2)");
        m.Entity<PerformanceReview>().Property(r => r.EfficiencyScore).HasColumnType("decimal(4,2)");
        m.Entity<PerformanceReview>().Property(r => r.TeamworkScore).HasColumnType("decimal(4,2)");
        m.Entity<PerformanceReview>().Property(r => r.InitiativeScore).HasColumnType("decimal(4,2)");
        m.Entity<PerformanceReview>().Property(r => r.OverallScore).HasColumnType("decimal(4,2)");

        // Self-reference manager
        m.Entity<Employee>()
            .HasOne(e => e.Manager)
            .WithMany(e => e.DirectReports)
            .HasForeignKey(e => e.ManagerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Ignore computed
        m.Entity<Employee>().Ignore(e => e.FullName);
        m.Entity<Employee>().Ignore(e => e.Initials);
        m.Entity<Employee>().Ignore(e => e.MonthlySalary);
        m.Entity<Attendance>().Ignore(a => a.WorkedHours);

        // Email sender / recipient
        m.Entity<EmailMessage>()
            .HasOne(e => e.Sender).WithMany(e => e.SentEmails)
            .HasForeignKey(e => e.SenderId).OnDelete(DeleteBehavior.Restrict);
        m.Entity<EmailMessage>()
            .HasOne(e => e.Recipient).WithMany(e => e.ReceivedEmails)
            .HasForeignKey(e => e.RecipientId).OnDelete(DeleteBehavior.Restrict);

        SeedData(m);

        // SQLite no guarda la zona horaria: las marcas de tiempo se leen como UTC para que
        // la API las serialice con "Z" y el navegador las muestre en hora local.
        // Las fechas de calendario (nacimiento, alta, fin de contrato) se dejan como están.
        var calendarDates = new HashSet<string> { "BirthDate", "HireDate", "ContractEndDate" };
        var utc  = new ValueConverter<DateTime, DateTime>(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var utcN = new ValueConverter<DateTime?, DateTime?>(v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);
        foreach (var entity in m.Model.GetEntityTypes())
            foreach (var prop in entity.GetProperties())
            {
                if (calendarDates.Contains(prop.Name)) continue;
                if (prop.ClrType == typeof(DateTime))  prop.SetValueConverter(utc);
                if (prop.ClrType == typeof(DateTime?)) prop.SetValueConverter(utcN);
            }
    }

    private static void SeedData(ModelBuilder m)
    {
        var baseDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // Los datos de actividad se generan relativos a la fecha de arranque para que la demo
        // siempre muestre asistencia, nóminas y solicitudes recientes (la base se crea al iniciar).
        var es    = new System.Globalization.CultureInfo("es-ES");
        var today = DateOnly.FromDateTime(DateTime.Now);
        var workDays = new List<DateOnly>();
        for (var day = today; workDays.Count < 10; day = day.AddDays(-1))
            if (day.DayOfWeek != DayOfWeek.Saturday && day.DayOfWeek != DayOfWeek.Sunday)
                workDays.Insert(0, day);
        DateOnly Wd(int i) => workDays[i];                         // 0 = más antiguo, 9 = el más reciente
        DateTime At(DateOnly day, int h, int min = 0) => day.ToDateTime(new TimeOnly(h, min), DateTimeKind.Utc);
        DateOnly NextMonday(DateOnly from) { var x = from; while (x.DayOfWeek != DayOfWeek.Monday) x = x.AddDays(1); return x; }
        string Long(DateOnly x) => x.ToString("d 'de' MMMM", es);
        var vacStart  = NextMonday(today.AddDays(28));
        var vac2Start = NextMonday(today.AddDays(56));
        var personal  = NextMonday(today.AddDays(7)).AddDays(2);
        var monthName = es.DateTimeFormat.GetMonthName(today.Month);
        var quarter   = (today.Month - 1) / 3 + 1;
        var prevQ     = quarter == 1 ? 4 : quarter - 1;
        var prevQYear = quarter == 1 ? today.Year - 1 : today.Year;
        var lastPay   = today.AddMonths(-1);

        // ── Users ────────────────────────────────────────────────────────────
        var users = new[]
        {
            new AppUser { Id=1,  Username="ceo",        PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin2025!"),  Role=UserRole.Admin,       CreatedAt=baseDate },
            new AppUser { Id=2,  Username="rrhh.dir",   PasswordHash=BCrypt.Net.BCrypt.HashPassword("RRHH2025!"),   Role=UserRole.HR,          CreatedAt=baseDate },
            new AppUser { Id=3,  Username="tech.coord", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Coord2025!"),  Role=UserRole.Coordinator, CreatedAt=baseDate },
            new AppUser { Id=4,  Username="mkt.coord",  PasswordHash=BCrypt.Net.BCrypt.HashPassword("Coord2025!"),  Role=UserRole.Coordinator, CreatedAt=baseDate },
            new AppUser { Id=5,  Username="ventas.coord",PasswordHash=BCrypt.Net.BCrypt.HashPassword("Coord2025!"), Role=UserRole.Coordinator, CreatedAt=baseDate },
            new AppUser { Id=6,  Username="carlos.r",   PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=7,  Username="ana.m",      PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=8,  Username="jorge.p",    PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=9,  Username="lucia.f",    PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=10, Username="pedro.s",    PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=11, Username="elena.g",    PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=12, Username="mario.t",    PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=13, Username="sofia.v",    PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=14, Username="raul.n",     PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=15, Username="isabel.c",   PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=16, Username="alberto.d",  PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=17, Username="marta.l",    PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=18, Username="javier.o",   PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=19, Username="nuria.b",    PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
            new AppUser { Id=20, Username="david.e",    PasswordHash=BCrypt.Net.BCrypt.HashPassword("Emp2025!"),    Role=UserRole.Employee,    CreatedAt=baseDate },
        };
        m.Entity<AppUser>().HasData(users);

        // ── Employees ─────────────────────────────────────────────────────────
        var emp = new[]
        {
            // Directors & management
            new Employee { Id=1,  UserId=1,  FirstName="Roberto",  LastName="Vidal",     Email="roberto.vidal@escmedia.es",    Phone="+34 600 001 001", NationalId="12345678A", BirthDate=new DateTime(1975,3,12), Position="CEO",                       Department=Department.Direccion,         RoleInCompany=UserRole.Admin,       ContractType=ContractType.Indefinido, HireDate=new DateTime(2018,1,15), GrossSalary=95000, WorkSchedule="08:00-17:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=2,  UserId=2,  FirstName="Patricia", LastName="Morales",   Email="patricia.morales@escmedia.es", Phone="+34 600 001 002", NationalId="23456789B", BirthDate=new DateTime(1980,7,22), Position="Directora de RRHH",         Department=Department.RRHH,              RoleInCompany=UserRole.HR,          ContractType=ContractType.Indefinido, HireDate=new DateTime(2019,3,1),  GrossSalary=72000, ManagerId=1, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=3,  UserId=3,  FirstName="Marcos",   LastName="Jiménez",   Email="marcos.jimenez@escmedia.es",   Phone="+34 600 001 003", NationalId="34567890C", BirthDate=new DateTime(1983,11,5), Position="Coordinador de Tecnología",  Department=Department.Tecnologia,        RoleInCompany=UserRole.Coordinator, ContractType=ContractType.Indefinido, HireDate=new DateTime(2019,6,15), GrossSalary=62000, ManagerId=1, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=4,  UserId=4,  FirstName="Claudia",  LastName="Herrera",   Email="claudia.herrera@escmedia.es",  Phone="+34 600 001 004", NationalId="45678901D", BirthDate=new DateTime(1985,4,18), Position="Coordinadora de Marketing",  Department=Department.Marketing,         RoleInCompany=UserRole.Coordinator, ContractType=ContractType.Indefinido, HireDate=new DateTime(2020,1,10), GrossSalary=58000, ManagerId=1, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=5,  UserId=5,  FirstName="Fernando", LastName="Castillo",  Email="fernando.castillo@escmedia.es",Phone="+34 600 001 005", NationalId="56789012E", BirthDate=new DateTime(1979,9,30), Position="Coordinador de Ventas",      Department=Department.Ventas,            RoleInCompany=UserRole.Coordinator, ContractType=ContractType.Indefinido, HireDate=new DateTime(2018,9,1),  GrossSalary=60000, ManagerId=1, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            // Technology team
            new Employee { Id=6,  UserId=6,  FirstName="Carlos",   LastName="Ruiz",      Email="carlos.ruiz@escmedia.es",      Phone="+34 620 100 006", NationalId="67890123F", BirthDate=new DateTime(1992,2,14), Position="Senior Full-Stack Developer", Department=Department.Tecnologia,       RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2021,3,15), GrossSalary=48000, ManagerId=3, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=7,  UserId=7,  FirstName="Ana",      LastName="Martínez",  Email="ana.martinez@escmedia.es",     Phone="+34 620 100 007", NationalId="78901234G", BirthDate=new DateTime(1995,6,25), Position="UX/UI Designer",             Department=Department.Tecnologia,       RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2022,1,10), GrossSalary=42000, ManagerId=3, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=8,  UserId=8,  FirstName="Jorge",    LastName="Pérez",     Email="jorge.perez@escmedia.es",      Phone="+34 620 100 008", NationalId="89012345H", BirthDate=new DateTime(1990,10,3), Position="DevOps Engineer",            Department=Department.Tecnologia,       RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2020,8,1),  GrossSalary=50000, ManagerId=3, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            // Marketing team
            new Employee { Id=9,  UserId=9,  FirstName="Lucía",    LastName="Fernández", Email="lucia.fernandez@escmedia.es",  Phone="+34 620 100 009", NationalId="90123456I", BirthDate=new DateTime(1993,8,17), Position="Content Manager",            Department=Department.Marketing,        RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2021,7,1),  GrossSalary=38000, ManagerId=4, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=10, UserId=10, FirstName="Pedro",    LastName="Sánchez",   Email="pedro.sanchez@escmedia.es",    Phone="+34 620 100 010", NationalId="01234567J", BirthDate=new DateTime(1991,12,1), Position="Social Media Specialist",    Department=Department.Marketing,        RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2022,4,1),  GrossSalary=36000, ManagerId=4, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=11, UserId=11, FirstName="Elena",    LastName="García",    Email="elena.garcia@escmedia.es",     Phone="+34 620 100 011", NationalId="11223344K", BirthDate=new DateTime(1996,5,9),  Position="Graphic Designer",           Department=Department.Marketing,        RoleInCompany=UserRole.Employee,    ContractType=ContractType.Practicas,  HireDate=new DateTime(2023,9,1),  GrossSalary=24000, ManagerId=4, WorkSchedule="09:00-17:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            // Sales team
            new Employee { Id=12, UserId=12, FirstName="Mario",    LastName="Torres",    Email="mario.torres@escmedia.es",     Phone="+34 620 100 012", NationalId="22334455L", BirthDate=new DateTime(1988,1,20), Position="Key Account Manager",        Department=Department.Ventas,           RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2020,2,1),  GrossSalary=44000, ManagerId=5, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=13, UserId=13, FirstName="Sofía",    LastName="Vargas",    Email="sofia.vargas@escmedia.es",     Phone="+34 620 100 013", NationalId="33445566M", BirthDate=new DateTime(1994,3,28), Position="Sales Representative",       Department=Department.Ventas,           RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2021,11,15),GrossSalary=38000, ManagerId=5, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=14, UserId=14, FirstName="Raúl",     LastName="Navarro",   Email="raul.navarro@escmedia.es",     Phone="+34 620 100 014", NationalId="44556677N", BirthDate=new DateTime(1987,7,4),  Position="Business Development",       Department=Department.Ventas,           RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2019,5,1),  GrossSalary=46000, ManagerId=5, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            // Finance & Ops
            new Employee { Id=15, UserId=15, FirstName="Isabel",   LastName="Campos",    Email="isabel.campos@escmedia.es",    Phone="+34 620 100 015", NationalId="55667788O", BirthDate=new DateTime(1982,11,15),Position="Contable Senior",            Department=Department.Finanzas,         RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2018,4,3),  GrossSalary=45000, ManagerId=1, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=16, UserId=16, FirstName="Alberto",  LastName="Díaz",      Email="alberto.diaz@escmedia.es",     Phone="+34 620 100 016", NationalId="66778899P", BirthDate=new DateTime(1990,9,22), Position="Operations Manager",         Department=Department.Operaciones,      RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2020,10,1), GrossSalary=47000, ManagerId=1, WorkSchedule="08:00-17:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            // RRHH team
            new Employee { Id=17, UserId=17, FirstName="Marta",    LastName="López",     Email="marta.lopez@escmedia.es",      Phone="+34 620 100 017", NationalId="77889900Q", BirthDate=new DateTime(1993,4,11), Position="Técnica de RRHH",            Department=Department.RRHH,             RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2022,2,1),  GrossSalary=36000, ManagerId=2, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            // Legal & CS
            new Employee { Id=18, UserId=18, FirstName="Javier",   LastName="Ortega",    Email="javier.ortega@escmedia.es",    Phone="+34 620 100 018", NationalId="88990011R", BirthDate=new DateTime(1984,6,30), Position="Asesor Legal",               Department=Department.Legal,            RoleInCompany=UserRole.Employee,    ContractType=ContractType.Indefinido, HireDate=new DateTime(2019,9,15), GrossSalary=52000, ManagerId=1, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=19, UserId=19, FirstName="Nuria",    LastName="Blanco",    Email="nuria.blanco@escmedia.es",     Phone="+34 620 100 019", NationalId="99001122S", BirthDate=new DateTime(1995,1,8),  Position="Customer Success Manager",   Department=Department.Atencion_al_Cliente, RoleInCompany=UserRole.Employee, ContractType=ContractType.Indefinido, HireDate=new DateTime(2021,5,1),  GrossSalary=37000, ManagerId=5, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
            new Employee { Id=20, UserId=20, FirstName="David",    LastName="Esteve",    Email="david.esteve@escmedia.es",     Phone="+34 620 100 020", NationalId="00112233T", BirthDate=new DateTime(1997,10,14),Position="Junior Developer",           Department=Department.Tecnologia,       RoleInCompany=UserRole.Employee,    ContractType=ContractType.Temporal,   HireDate=new DateTime(2023,6,1),  GrossSalary=30000, ManagerId=3, WorkSchedule="09:00-18:00", CreatedAt=baseDate, UpdatedAt=baseDate },
        };
        m.Entity<Employee>().HasData(emp);

        // ── Attendance (last 10 working days, all employees) ──────────────────
        var attendances = new List<Attendance>();
        int attId = 1;
        foreach (var day in workDays)
        {
            for (int eId = 1; eId <= 20; eId++)
            {
                var seed  = (day.Day * 17 + eId * 31) % 100;
                AttendanceStatus st;
                TimeOnly? cin = null, cout = null, ls = null, le = null;

                if (seed < 3)      { st = AttendanceStatus.Ausente; }
                else if (seed < 8) { st = AttendanceStatus.Tarde;   cin = new TimeOnly(9, 45); cout = new TimeOnly(18, 30); ls = new TimeOnly(14,0); le = new TimeOnly(15,0); }
                else if (seed < 15){ st = AttendanceStatus.Teletrabajo; cin = new TimeOnly(9,0); cout = new TimeOnly(18,0); ls = new TimeOnly(14,0); le = new TimeOnly(15,0); }
                else               { st = AttendanceStatus.Presente; cin = new TimeOnly(8, 55); cout = new TimeOnly(18, 5); ls = new TimeOnly(14,0); le = new TimeOnly(15,0); }

                attendances.Add(new Attendance
                {
                    Id=attId++, EmployeeId=eId, Date=day,
                    CheckIn=cin, CheckOut=cout, LunchStart=ls, LunchEnd=le, Status=st
                });
            }
        }
        m.Entity<Attendance>().HasData(attendances);

        // ── Leave requests ────────────────────────────────────────────────────
        m.Entity<LeaveRequest>().HasData(
            new LeaveRequest { Id=1,  EmployeeId=6,  Type=LeaveType.Vacaciones,          StartDate=vacStart,  EndDate=vacStart.AddDays(14),  TotalDays=11, Reason="Vacaciones",                  Status=RequestStatus.Pendiente, CreatedAt=At(Wd(7), 9) },
            new LeaveRequest { Id=2,  EmployeeId=9,  Type=LeaveType.Permiso_Medico,      StartDate=Wd(5),     EndDate=Wd(6),                TotalDays=2,  Reason="Consulta especialista",       Status=RequestStatus.Aprobada,  ReviewedById=2, ReviewedAt=At(Wd(3), 11), CreatedAt=At(Wd(2), 10) },
            new LeaveRequest { Id=3,  EmployeeId=13, Type=LeaveType.Asunto_Personal,     StartDate=personal,  EndDate=personal,             TotalDays=1,  Reason="Gestión personal",            Status=RequestStatus.Pendiente, CreatedAt=At(Wd(8), 12) },
            new LeaveRequest { Id=4,  EmployeeId=7,  Type=LeaveType.Calamidad_Domestica, StartDate=Wd(1),     EndDate=Wd(2),                TotalDays=2,  Reason="Urgencia familiar",           Status=RequestStatus.Aprobada,  ReviewedById=2, ReviewedAt=At(Wd(1), 8), CreatedAt=At(Wd(0), 18) },
            new LeaveRequest { Id=5,  EmployeeId=12, Type=LeaveType.Vacaciones,          StartDate=vac2Start, EndDate=vac2Start.AddDays(18), TotalDays=15, Reason="Vacaciones anuales",          Status=RequestStatus.Pendiente, CreatedAt=At(Wd(4), 16) }
        );

        // ── Overtime ──────────────────────────────────────────────────────────
        m.Entity<OvertimeEntry>().HasData(
            new OvertimeEntry { Id=1, EmployeeId=6,  Date=Wd(3), Hours=2.5m, Reason="Despliegue a producción",       Approved=true,  ApprovedById=3, CreatedAt=At(Wd(3), 20) },
            new OvertimeEntry { Id=2, EmployeeId=8,  Date=Wd(4), Hours=3.0m, Reason="Resolución incidencia crítica", Approved=true,  ApprovedById=3, CreatedAt=At(Wd(4), 21) },
            new OvertimeEntry { Id=3, EmployeeId=12, Date=Wd(7), Hours=1.5m, Reason="Cierre contrato cliente",       Approved=false, CreatedAt=At(Wd(7), 19) },
            new OvertimeEntry { Id=4, EmployeeId=20, Date=Wd(8), Hours=2.0m, Reason="Sprint final release",          Approved=false, CreatedAt=At(Wd(8), 20) }
        );

        // ── Payrolls (last 3 months, all employees) ───────────────────────────
        var payrolls = new List<Payroll>();
        int pId = 1;
        var months = new[] { -3, -2, -1 }
            .Select(o => today.AddMonths(o))
            .Select(x => (x.Year, x.Month))
            .ToArray();
        var empData = new Dictionary<int, decimal>
        {
            {1,95000},{2,72000},{3,62000},{4,58000},{5,60000},{6,48000},{7,42000},
            {8,50000},{9,38000},{10,36000},{11,24000},{12,44000},{13,38000},{14,46000},
            {15,45000},{16,47000},{17,36000},{18,52000},{19,37000},{20,30000}
        };

        foreach (var (year, month) in months)
        {
            foreach (var (empId, gross) in empData)
            {
                var monthly = Math.Round(gross / 12, 2);
                var ss      = Math.Round(monthly * 0.0635m, 2);
                var irpf    = Math.Round(monthly * 0.14m, 2);
                var ded     = ss + irpf;
                payrolls.Add(new Payroll
                {
                    Id=pId++, EmployeeId=empId, Month=month, Year=year,
                    GrossBase=monthly, OvertimePay=0, Bonus=0,
                    SocialSecurity=ss, Deductions=ded,
                    NetSalary=Math.Round(monthly - ded, 2),
                    Status=PayrollStatus.Pagada,
                    PaidAt=new DateTime(year, month, 28, 0,0,0, DateTimeKind.Utc),
                    CreatedAt=new DateTime(year, month, 1, 0,0,0, DateTimeKind.Utc)
                });
            }
        }
        m.Entity<Payroll>().HasData(payrolls);

        // ── Performance reviews (trimestre anterior) ──────────────────────────────────────────────────────────────
        var reviews = new List<PerformanceReview>();
        int rId = 1;
        var scores = new[] {
            (6,  8.5m,8.2m,9.0m,8.0m), (7,  9.0m,8.8m,9.2m,8.5m),
            (8,  7.8m,8.0m,7.5m,7.0m), (9,  8.0m,7.8m,8.5m,7.5m),
            (10, 7.5m,7.0m,8.0m,7.0m), (12, 9.2m,9.0m,8.8m,9.0m),
            (13, 8.0m,7.5m,8.2m,7.8m), (14, 8.8m,9.0m,8.5m,8.5m),
        };
        foreach (var (eId, q, ef, tw, ini) in scores)
        {
            var overall = Math.Round((q+ef+tw+ini)/4, 2);
            reviews.Add(new PerformanceReview
            {
                Id=rId++, EmployeeId=eId, ReviewerId=2, Quarter=prevQ, Year=prevQYear,
                QualityScore=q, EfficiencyScore=ef, TeamworkScore=tw, InitiativeScore=ini,
                OverallScore=overall,
                Strengths="Destaca en comunicación y resolución de problemas.",
                AreasToImprove="Mejorar gestión del tiempo en picos de trabajo.",
                Goals=$"Certificación técnica antes de cerrar {today.Year}.",
                CreatedAt=At(Wd(0), 10)
            });
        }
        m.Entity<PerformanceReview>().HasData(reviews);

        // ── Notifications ─────────────────────────────────────────────────────
        m.Entity<Notification>().HasData(
            new Notification { Id=1,  EmployeeId=6,  Title="Solicitud de vacaciones recibida",     Body=$"Tu solicitud de vacaciones del {Long(vacStart)} al {Long(vacStart.AddDays(14))} está pendiente de aprobación.", Type=NotificationType.Info,    IsRead=false, CreatedAt=At(Wd(7), 9) },
            new Notification { Id=2,  EmployeeId=9,  Title="Permiso médico aprobado",              Body=$"Tu permiso médico del {Long(Wd(5))} ha sido aprobado por RRHH.",                                          Type=NotificationType.Info,    IsRead=true,  CreatedAt=At(Wd(3), 11) },
            new Notification { Id=3,  EmployeeId=6,  Title=$"Nómina de {es.DateTimeFormat.GetMonthName(lastPay.Month)} disponible", Body=$"Ya puedes consultar y descargar tu nómina de {es.DateTimeFormat.GetMonthName(lastPay.Month)} de {lastPay.Year}.", Type=NotificationType.Info, IsRead=false, CreatedAt=At(Wd(2), 8) },
            new Notification { Id=4,  EmployeeId=20, Title="Evaluación trimestral disponible",     Body=$"Tu evaluación del T{prevQ} {prevQYear} está disponible para revisión.",                                     Type=NotificationType.Aviso,   IsRead=false, CreatedAt=At(Wd(0), 9) },
            new Notification { Id=5,  EmployeeId=7,  Title="Formación obligatoria PRL",            Body=$"Recuerda completar el módulo de PRL antes del {Long(today.AddDays(21))}.",                                 Type=NotificationType.Urgente, IsRead=false, CreatedAt=At(Wd(6), 8) },
            new Notification { Id=6,  EmployeeId=12, Title="Horas extra pendientes de aprobación", Body=$"Tienes 1,5 horas extra del {Long(Wd(7))} pendientes de aprobación.",                                      Type=NotificationType.Aviso,   IsRead=true,  CreatedAt=At(Wd(8), 9) }
        );

        // ── Emails ────────────────────────────────────────────────────────────
        m.Entity<EmailMessage>().HasData(
            new EmailMessage { Id=1, SenderId=2,  RecipientId=6,  Subject="Bienvenida al equipo", Body="Hola Carlos, bienvenido a ESC Media & Tech. Encontrarás toda la documentación en el drive corporativo.", IsRead=true,  Folder="inbox", SentAt=new DateTime(2021,3,15,9,0,0,DateTimeKind.Utc) },
            new EmailMessage { Id=2, SenderId=3,  RecipientId=6,  Subject=$"Sprint planning {monthName}",  Body="Recordad que el sprint planning es el próximo lunes a las 10h. Por favor revisad el backlog antes.", IsRead=false, Folder="inbox", SentAt=At(Wd(7), 8, 30) },
            new EmailMessage { Id=3, SenderId=6,  RecipientId=3,  Subject=$"Re: Sprint planning {monthName}", Body="Confirmado, estaré ahí. Ya he revisado el backlog y tengo algunas propuestas.", IsRead=true, Folder="inbox", SentAt=At(Wd(7), 9) },
            new EmailMessage { Id=4, SenderId=2,  RecipientId=17, Subject=$"Actualización política vacacional {today.Year}", Body="Adjuntamos la nueva política de vacaciones para este ejercicio. Por favor distribuid a todo el equipo.", IsRead=false, Folder="inbox", SentAt=At(Wd(1), 10) },
            new EmailMessage { Id=5, SenderId=1,  RecipientId=2,  Subject=$"Revisión presupuesto RRHH T{quarter}", Body=$"Patricia, necesito que me prepares un resumen del presupuesto de RRHH para el T{quarter} antes del viernes.", IsRead=true, Folder="inbox", SentAt=At(Wd(5), 11) },
            new EmailMessage { Id=6, SenderId=2,  RecipientId=1,  Subject=$"Re: Revisión presupuesto RRHH T{quarter}", Body="Roberto, te adjunto el resumen. El mayor incremento viene de formación y de las dos incorporaciones previstas en Tecnología.", AttachmentName=$"presupuesto_rrhh_T{quarter}.xlsx", IsRead=false, Folder="inbox", SentAt=At(Wd(8), 9, 15) },
            new EmailMessage { Id=7, SenderId=5,  RecipientId=1,  Subject="Cierre comercial del mes", Body="Hola Roberto, cerramos el mes por encima del objetivo. Te paso el detalle por cliente en la reunión del lunes.", IsRead=true, Folder="inbox", SentAt=At(Wd(6), 17, 40) },
            new EmailMessage { Id=8, SenderId=3,  RecipientId=1,  Subject="Propuesta de contratación", Body="Te comparto la propuesta para cubrir la vacante de backend. Si te encaja, RRHH puede publicar la oferta esta semana.", IsRead=false, Folder="inbox", SentAt=At(Wd(9), 8, 50) }
        );

        // ── Chat messages ─────────────────────────────────────────────────────
        m.Entity<ChatMessage>().HasData(
            new ChatMessage { Id=1, SenderId=3, RecipientId=6,  Body="Carlos, ¿puedes revisar el PR que abrí ayer?",           IsRead=true,  SentAt=At(Wd(9), 10, 0) },
            new ChatMessage { Id=2, SenderId=6, RecipientId=3,  Body="Claro, lo miro ahora mismo y te comento.",               IsRead=true,  SentAt=At(Wd(9), 10, 5) },
            new ChatMessage { Id=3, SenderId=3, RecipientId=20, Body="David, ¿cómo vas con el módulo de autenticación?",       IsRead=false, SentAt=At(Wd(9), 11, 0) },
            new ChatMessage { Id=4, SenderId=2, RecipientId=17, Body="Marta, ¿ya enviaste los contratos al despacho legal?",   IsRead=true,  SentAt=At(Wd(9), 9, 30) },
            new ChatMessage { Id=5, SenderId=4, RecipientId=9,  Body=$"Lucía, necesito el calendario editorial de {es.DateTimeFormat.GetMonthName(today.AddMonths(1).Month)}.",    IsRead=false, SentAt=At(Wd(9), 12, 0) },
            new ChatMessage { Id=6, SenderId=2, RecipientId=1,  Body="Roberto, ¿te viene bien revisar las evaluaciones del trimestre el jueves?", IsRead=false, SentAt=At(Wd(9), 9, 10) },
            new ChatMessage { Id=7, SenderId=1, RecipientId=2,  Body="Sí, el jueves a las 12 me va bien.",                                     IsRead=true,  SentAt=At(Wd(9), 9, 25) }
        );
    }
}
