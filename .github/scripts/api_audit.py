"""Auditoría de la API contra el contenedor en marcha.

Inicia sesión con cada rol de demo, recorre todos los endpoints de lectura y comprueba:
  - que ninguno responde con error 5xx,
  - que el panel devuelve datos reales (no ceros),
  - que los permisos por rol se respetan (un empleado no ve datos de otros).
Sale con código 1 si algo falla y lo anota en el resumen del job.
"""
import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("BASE_URL", "http://localhost:8080")
USERS = {
    "Admin": ("ceo", "Admin2025!"),
    "HR": ("rrhh.dir", "RRHH2025!"),
    "Coordinator": ("tech.coord", "Coord2025!"),
    "Employee": ("carlos.r", "Emp2025!"),
}
failures: list[str] = []
lines: list[str] = []


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=20) as r:
            raw = r.read()
            ctype = r.headers.get("Content-Type", "")
            return r.status, (json.loads(raw) if "json" in ctype and raw else raw)
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:300]


def check(cond, msg):
    lines.append(("OK   " if cond else "FAIL ") + msg)
    if not cond:
        failures.append(msg)


tokens, me = {}, {}
for role, (user, pwd) in USERS.items():
    status, body = call("POST", "/api/auth/login", body={"username": user, "password": pwd})
    check(status == 200 and "token" in body, f"login {role} ({user}) -> {status}")
    tokens[role], me[role] = body["token"], body["employeeId"]

GETS = [
    "/api/auth/me", "/api/dashboard", "/api/employees", "/api/attendance", "/api/leaves",
    "/api/overtime", "/api/payroll", "/api/performance", "/api/notifications",
    "/api/email?folder=inbox", "/api/email?folder=sent", "/api/email?folder=starred",
    "/api/email?folder=trash", "/api/chat/contacts", "/api/chat/3",
]
HR_ONLY = ["/api/payroll/summary", "/api/payroll/report/excel"]

for role, token in tokens.items():
    for path in GETS + HR_ONLY:
        status, _ = call("GET", path, token)
        expected_forbidden = path in HR_ONLY and role not in ("HR", "Admin")
        ok = status == 403 if expected_forbidden else status == 200
        check(ok, f"{role:<11} GET {path} -> {status}")

# El panel debe tener datos reales
_, dash = call("GET", "/api/dashboard", tokens["Admin"])
check(dash.get("scope") == "company", f"panel Admin con alcance empresa ({dash.get('scope')})")
check(dash.get("totalEmployees", 0) == 20, f"panel Admin: plantilla = {dash.get('totalEmployees')}")
check((dash.get("attendanceRate") or 0) > 0, f"panel Admin: asistencia = {dash.get('attendanceRate')}%")
check((dash.get("payroll") or 0) > 0, f"panel Admin: masa salarial = {dash.get('payroll')}")
check(len(dash.get("byDepartment") or []) > 3, "panel Admin: distribución por departamento")
_, dash = call("GET", "/api/dashboard", tokens["Employee"])
check(dash.get("scope") == "self" and dash.get("totalEmployees") == 1, "panel Empleado: solo datos propios")
check(len(dash.get("recentAttendance") or []) > 0, "panel Empleado: asistencia reciente")

# Permisos: un empleado solo ve lo suyo
emp, emp_id = tokens["Employee"], me["Employee"]
for path in ["/api/attendance", "/api/leaves", "/api/overtime", "/api/payroll", "/api/performance"]:
    _, rows = call("GET", path, emp)
    others = {r["employeeId"] for r in rows} - {emp_id}
    check(not others, f"Empleado GET {path}: sin datos de otros empleados ({len(rows)} filas)")
_, staff = call("GET", "/api/employees", emp)
check(all(e["grossSalary"] is None for e in staff), "Empleado: el directorio no muestra salarios")
status, _ = call("GET", "/api/employees/1", emp)
check(status == 403, f"Empleado: ficha de otro empleado bloqueada ({status})")
_, admin_pay = call("GET", "/api/payroll", tokens["Admin"])
foreign = next(p for p in admin_pay if p["employeeId"] != emp_id)
status, _ = call("GET", f"/api/payroll/{foreign['id']}/download", emp)
check(status == 403, f"Empleado: descarga de nómina ajena bloqueada ({status})")
status, _ = call("POST", "/api/attendance/checkin", emp, {"employeeId": 1, "time": "09:00"})
check(status == 403, f"Empleado: fichar por otro bloqueado ({status})")

# Coordinador: su equipo sí, otros departamentos no
coord = tokens["Coordinator"]
_, rows = call("GET", "/api/attendance", coord)
ids = {r["employeeId"] for r in rows}
check(ids and 12 not in ids, f"Coordinador: ve su equipo y no a Ventas ({sorted(ids)})")

# Correo: lo enviado aparece en Enviados
status, sent = call("POST", "/api/email", emp, {"recipientId": 3, "subject": "Prueba auditoría", "body": "Hola"})
check(status == 200, f"Empleado: enviar correo ({status})")
_, folder = call("GET", "/api/email?folder=sent", emp)
check(any(m["subject"] == "Prueba auditoría" for m in folder), "Correo enviado visible en Enviados")
_, inbox = call("GET", "/api/email?folder=inbox", coord)
check(any(m["subject"] == "Prueba auditoría" for m in inbox), "Correo recibido en la bandeja del destinatario")

report = "\n".join(lines)
print(report)
summary = os.environ.get("GITHUB_STEP_SUMMARY")
if summary:
    with open(summary, "a", encoding="utf-8") as f:
        f.write("## Auditoría de la API\n\n```\n" + report + "\n```\n")
for msg in failures:
    print(f"::error title=Auditoría API::{msg}")
sys.exit(1 if failures else 0)
