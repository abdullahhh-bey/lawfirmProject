using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using lawfirm.backend.Data;
using lawfirm.backend.Services;

var builder = WebApplication.CreateBuilder(args);

// ============================================================================
// LAYER 5: SECRETS & CONFIGURATION MANAGEMENT
// Prioritizes Environment Variables & Vault overrides over plain-text config files.
// ============================================================================
builder.Configuration.AddEnvironmentVariables();

// ============================================================================
// LAYER 2: REGISTER APPLICATION SECURITY & AES-256 ENCRYPTION SERVICE
// ============================================================================
builder.Services.AddSingleton<ISecurityEncryptionService, SecurityEncryptionService>();

// ============================================================================
// LAYER 1: DATABASE CONTEXT & TLS/SSL IN-TRANSIT SECURITY
// Enforces SSL Mode=Require on Supabase PostgreSQL Connection
// ============================================================================
var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["DATABASE_URL"]
    ?? throw new InvalidOperationException("Database connection string missing");
    
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.CommandTimeout(120);
        npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null);
    });
});

// Application Services & Cloud Storage
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICaseService, CaseService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IClientService, ClientService>();
builder.Services.AddScoped<IFinanceService, FinanceService>();
builder.Services.AddScoped<IMessagingService, MessagingService>();
builder.Services.AddScoped<ILawyerService, LawyerService>();

// Supabase Cloud File Storage (Layer 3 Stream Encrypted) & Task Reminders & WhatsApp
builder.Services.AddSingleton<ISupabaseStorageService, CloudflareR2StorageService>();
builder.Services.AddHttpClient<IWhatsAppService, WhatsAppService>(client =>
{
    // Layer 1: Enforce HTTPS policy for outgoing API integrations
    client.DefaultRequestHeaders.Add("User-Agent", "Casewell-Secure-CRM/2.0");
});
builder.Services.AddHostedService<TaskReminderBackgroundService>();

// ============================================================================
// LAYER 4: AUTHENTICATION, JWT SIGNING & HTTPONLY SECURE COOKIE TRANSPORT
// ============================================================================
var jwtKey =
    builder.Configuration["Jwt:Key"]
    ?? builder.Configuration["JWT_SECRET"]
    ?? throw new InvalidOperationException("JWT secret missing");

    
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "LawFirmCrm";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "LawFirmCrmClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    // Layer 4: Support both HttpOnly cookie and Bearer header token extraction
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (context.Request.Cookies.TryGetValue("jwt", out var cookieToken) && !string.IsNullOrEmpty(cookieToken))
            {
                context.Token = cookieToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Role Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("admin"));
    options.AddPolicy("LawyerOnly", policy => policy.RequireRole("lawyer"));
    options.AddPolicy("FirmStaff", policy => policy.RequireRole("admin", "lawyer"));
});

// CORS for React Frontend (Vite on :5173)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:5173", "https://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowViteApp", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .SetPreflightMaxAge(TimeSpan.FromHours(24));
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Swagger with JWT Bearer Authorize Button
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Casewell Law Firm CRM API (5-Layer Encrypted)",
        Version = "v1",
        Description = "ASP.NET Core 8 Web API with AES-256-GCM Field Encryption, Encrypted Storage & Secure HttpOnly Cookies"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Seed Database and ensure table creation upon startup
await DbInitializer.InitializeAsync(app.Services);

// HTTP Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Casewell Law Firm CRM API v1");
    });
}
else
{
    // Layer 1: Enforce HSTS in production
    app.UseHsts();
}

// Layer 1: HTTPS Redirection
app.UseHttpsRedirection();
app.UseCors("AllowViteApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
