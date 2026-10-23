# ESC Media & Tech S.L. — Portal de RRHH -- Proyecto React Master Desarrollo Fullstack y Arquitecturas Cloud - Tajamar por Elizabeth Sáenz Camacho

Sistema de gestión de recursos humanos construido con **React 18 + ASP.NET Core 8 Web API + SQLite**.

**Demo navegable (frontend estático):** https://elizsaenzc.github.io/EmployeeManagementSystemEM/ (el `index.html` de la raíz del repositorio).

[![CI](https://github.com/elizsaenzc/EmployeeManagementSystemEM/actions/workflows/ci.yml/badge.svg)](https://github.com/elizsaenzc/EmployeeManagementSystemEM/actions/workflows/ci.yml)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/elizsaenzc/EmployeeManagementSystemEM)

**Demo completa en vivo (React + API .NET):** https://hr-portal-kzq2.onrender.com · API: https://hr-portal-kzq2.onrender.com/swagger  
_Plan gratuito: la primera carga tras un rato sin uso puede tardar ~1 minuto._

## Despliegue completo (React + API .NET + SQLite)

La aplicación se despliega como **un único contenedor**: la API ASP.NET Core 8 sirve el frontend React compilado, la API REST en `/api` y la documentación Swagger en `/swagger`.

```bash
docker build -t hr-portal .
docker run -p 8080:8080 -e Jwt__Key="una-clave-larga-de-al-menos-32-caracteres" hr-portal
# http://localhost:8080          → portal
# http://localhost:8080/swagger  → API documentada
```

En Render basta con **New → Blueprint** sobre este repositorio (usa `render.yaml`; la clave JWT se genera automáticamente). La base SQLite se crea y se rellena con datos de ejemplo al arrancar.

| Variable | Uso | Por defecto |
|---|---|---|
| `Jwt__Key` | Clave de firma de los tokens JWT | valor de `appsettings.json` |
| `Database__Path` | Ruta del fichero SQLite | `/app/data/hrportal.db` en Docker |
| `Cors__Origins` | Orígenes permitidos (separados por comas) si el frontend se aloja aparte | `localhost:5173,3000` |
| `PORT` | Puerto HTTP | `8080` |

El pipeline de CI compila la API y el frontend, construye la imagen y la prueba de extremo a extremo (salud, SPA, Swagger y login).

---

## Stack técnico

| Capa        | Tecnología                                                  |
|-------------|-------------------------------------------------------------|
| Frontend    | React 18 + Vite + React Router v6 + Recharts               |
| Backend     | ASP.NET Core 8 Web API                                      |
| Base datos  | SQLite via Entity Framework Core 8                          |
| Auth        | JWT Bearer + BCrypt                                         |
| Exportes    | ClosedXML (Excel), texto plano (nóminas)                   |
| Estilos     | CSS puro con design system corporativo (variables CSS)      |

---

## Módulos y roles

### Roles del sistema

| Rol         | Descripción                                                        |
|-------------|--------------------------------------------------------------------|
| Employee    | Asistencia, vacaciones, nóminas, chat, correo, desempeño           |
| Coordinator | Todo lo anterior + aprobación de su equipo, evaluaciones           |
| HR          | Gestión completa de plantilla, nóminas, informes, broadcasting     |
| Admin       | Acceso total: crear, editar, desactivar, todos los datos           |

### Funcionalidades por módulo

- **Asistencia** — Check-in/check-out con timestamp, teletrabajo, horas calculadas automáticas
- **Horario** — Vista de jornada laboral, bloques, descansos, calendario semanal
- **Permisos** — Vacaciones, permiso médico, asunto familiar/personal, calamidad doméstica; flujo de aprobación
- **Horas extra** — Registro diario con aprobación por coordinador
- **Nóminas** — Vista individual desde la contratación; generación automática con descuentos por ausencias; descarga en .txt
- **Informes** — Export Excel mensual, trimestral y anual (RRHH/Admin)
- **Desempeño** — Evaluaciones Q1–Q4 con 4 métricas, acumulativo visual por empleado
- **Notificaciones** — Recepción y broadcasting corporativo
- **Correo corporativo** — Bandeja de entrada, enviados, destacados, papelera; redactar y responder
- **Chat** — Mensajería 1:1 con toda la plantilla
- **Empleados** — CRUD completo (HR/Admin), ficha detallada con datos personales y económicos

---

## Cómo arrancar en local

### Requisitos
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org)

### Terminal 1 — Backend API

```bash
cd backend
dotnet restore
dotnet run
# API en http://localhost:5001
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev
# App en http://localhost:5173
```

---

## Credenciales de acceso demo

| Usuario       | Contraseña  | Rol         | Nombre                            |
|---------------|-------------|-------------|-----------------------------------|
| ceo           | Admin2025!  | Admin       | Roberto Vidal — CEO               |
| rrhh.dir      | RRHH2025!   | HR          | Patricia Morales — Dir. RRHH      |
| tech.coord    | Coord2025!  | Coordinator | Marcos Jiménez — Coord. Tech      |
| mkt.coord     | Coord2025!  | Coordinator | Claudia Herrera — Coord. Mkt      |
| ventas.coord  | Coord2025!  | Coordinator | Fernando Castillo — Coord. Ventas |
| carlos.r      | Emp2025!    | Employee    | Carlos Ruiz — Dev Senior          |
| ana.m         | Emp2025!    | Employee    | Ana Martínez — UX Designer        |
| jorge.p       | Emp2025!    | Employee    | Jorge Pérez — DevOps              |
| lucia.f       | Emp2025!    | Employee    | Lucía Fernández — Content         |
| mario.t       | Emp2025!    | Employee    | Mario Torres — KAM                |

---

## Estructura del proyecto

```
HRPortal/
├── backend/
│   ├── Controllers/
│   │   ├── AttendanceLeaveController.cs   Asistencia, permisos, horas extra
│   │   ├── CommsController.cs             Notificaciones, correo, chat, dashboard
│   │   ├── EmployeesController.cs         CRUD de empleados
│   │   └── PayrollPerformanceController.cs Nóminas (gen + export) + evaluaciones
│   ├── Data/
│   │   └── AppDbContext.cs                EF Core + seed completo 20 empleados
│   ├── DTOs/
│   │   └── Dtos.cs                        Request/Response records
│   ├── Models/
│   │   └── Models.cs                      Entidades del dominio + enums
│   ├── Services/
│   │   └── JwtService.cs                  Generación JWT + AuthController
│   ├── Program.cs
│   └── appsettings.json
│
└── frontend/
    └── src/
        ├── components/
        │   ├── layout/Sidebar.jsx          Navegación lateral por rol
        │   └── ui/index.jsx                Spinner, Modal, Badge, Avatar, Tabs…
        ├── context/AuthContext.jsx          Estado global de sesión
        ├── hooks/useApi.js                  Hook genérico + helpers (fmt, downloadBlob…)
        ├── pages/
        │   ├── auth/Login.jsx
        │   ├── chat/Chat.jsx
        │   ├── dashboard/Dashboard.jsx
        │   ├── email/Email.jsx
        │   ├── employee/
        │   │   ├── Attendance.jsx
        │   │   ├── Leaves.jsx              LeavesPage + OvertimePage
        │   │   ├── Notifications.jsx
        │   │   ├── Performance.jsx
        │   │   └── Schedule.jsx
        │   ├── employees/Employees.jsx     CRUD plantilla (HR/Admin)
        │   └── hr/Payroll.jsx              DocumentsPage + PayrollPage + ReportsPage
        ├── services/api.js                  Todos los calls HTTP agrupados por módulo
        └── App.jsx                          Router + guards por rol
```

---

## API Endpoints

```
POST /api/auth/login
GET  /api/auth/me

GET  /api/dashboard

GET/POST/PUT/DELETE /api/employees

GET       /api/attendance
POST      /api/attendance/checkin
POST      /api/attendance/checkout
POST      /api/attendance          (upsert manager)

GET/POST           /api/leaves
PATCH              /api/leaves/{id}/review

GET/POST           /api/overtime
PATCH              /api/overtime/{id}/approve

GET                /api/payroll
GET                /api/payroll/summary
POST               /api/payroll/generate
PATCH              /api/payroll/{id}/pay
GET                /api/payroll/{id}/download     (.txt)
GET                /api/payroll/report/excel      (?period=monthly|quarterly|annual)

GET/POST           /api/performance

GET                /api/notifications
PATCH              /api/notifications/{id}/read
POST               /api/notifications/broadcast

GET/POST/DELETE    /api/email
PATCH              /api/email/{id}/read
PATCH              /api/email/{id}/star

GET                /api/chat/contacts
GET                /api/chat/{contactId}
POST               /api/chat
```

---

# ESC Media & Tech S.L. — Portal de RRHH -- Proyecto React Master Desarrollo Fullstack y Arquitecturas Cloud - Tajamar por Elizabeth Sáenz Camacho