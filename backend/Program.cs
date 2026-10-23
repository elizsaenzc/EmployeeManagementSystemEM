using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using HRPortal.Data;
using HRPortal.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(o =>
    o.JsonSerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter()));

// Ruta de la base SQLite configurable (Database__Path en contenedor)
var dbPath = builder.Configuration["Database:Path"] ?? "hrportal.db";
var dbDir = Path.GetDirectoryName(Path.GetFullPath(dbPath));
if (!string.IsNullOrEmpty(dbDir)) Directory.CreateDirectory(dbDir);
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite($"Data Source={dbPath}"));

builder.Services.AddScoped<JwtService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "ESC_Media_Tech_HR_S3cr3t_2025!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"] ?? "hrportal-api",
            ValidAudience            = builder.Configuration["Jwt:Audience"] ?? "hrportal-client",
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "HR Portal API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new()
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header
    });
    c.AddSecurityRequirement(new()
    {
        [new Microsoft.OpenApi.Models.OpenApiSecurityScheme
        {
            Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" }
        }] = Array.Empty<string>()
    });
});

var corsOrigins = (builder.Configuration["Cors:Origins"] ?? "http://localhost:5173,http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o =>
    o.AddDefaultPolicy(p =>
        p.WithOrigins(corsOrigins)
         .AllowAnyHeader()
         .AllowAnyMethod()));

var app = builder.Build();

// Ensure DB is created with all seed data on first run
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// Errores no controlados: 400 si los datos de entrada no son válidos, 500 genérico en el resto
app.UseExceptionHandler(handler => handler.Run(async ctx =>
{
    var ex  = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    var bad = ex is ArgumentException or FormatException or System.Text.Json.JsonException;
    ctx.Response.StatusCode = bad ? StatusCodes.Status400BadRequest : StatusCodes.Status500InternalServerError;
    await ctx.Response.WriteAsJsonAsync(new { message = bad ? "Datos no válidos" : "Error interno del servidor" });
}));

app.UseSwagger();
app.UseSwaggerUI(c => c.DocumentTitle = "HR Portal API");

// El frontend React compilado se sirve desde wwwroot (misma URL que la API)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

// Rutas del SPA (React Router) que no son API ni ficheros
app.MapFallbackToFile("index.html");

app.Run();
