using Microsoft.EntityFrameworkCore;
using lawfirm.backend.Models;
using lawfirm.backend.Services;

namespace lawfirm.backend.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbInitializer");

        try
        {
            if (!await context.Users.AnyAsync())
            {
                logger.LogInformation("Seeding initial Admin and Lawyer accounts into Supabase database...");

                var admin = new User
                {
                    Id = Guid.NewGuid(),
                    FullName = "Admin",
                    Email = "admin@firm.com",
                    PasswordHash = authService.HashPassword("admin"),
                    Phone = "+923000000000",
                    Role = "admin",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var lawyer1 = new User
                {
                    Id = Guid.NewGuid(),
                    FullName = "Sarah Jennings",
                    Email = "s.jennings@firm.com",
                    PasswordHash = authService.HashPassword("password"),
                    Phone = "923001234567",
                    Role = "lawyer",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var lawyer2 = new User
                {
                    Id = Guid.NewGuid(),
                    FullName = "David Okafor",
                    Email = "d.okafor@firm.com",
                    PasswordHash = authService.HashPassword("password"),
                    Phone = "923007654321",
                    Role = "lawyer",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await context.Users.AddRangeAsync(admin, lawyer1, lawyer2);
                await context.SaveChangesAsync();

                logger.LogInformation("Database seeded successfully with default Admin (admin@firm.com / admin) and Lawyers.");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding default accounts.");
        }
    }
}
