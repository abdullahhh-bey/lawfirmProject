using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using lawfirm.backend.Models;
using lawfirm.backend.Services;

namespace lawfirm.backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) 
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<CaseTypeCounter> CaseTypeCounters => Set<CaseTypeCounter>();
    public DbSet<CaseRecord> Cases => Set<CaseRecord>();
    public DbSet<CaseTask> Tasks => Set<CaseTask>();
    public DbSet<FinanceEntry> FinanceEntries => Set<FinanceEntry>();
    public DbSet<DirectOrBroadcastMessage> Messages => Set<DirectOrBroadcastMessage>();
    public DbSet<MessageRecipient> MessageRecipients => Set<MessageRecipient>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => new { u.Role, u.IsActive });
            entity.Property(u => u.FullName).HasMaxLength(150).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(150).IsRequired();
            entity.Property(u => u.PasswordHash).HasMaxLength(255).IsRequired();
            entity.Property(u => u.Phone).HasMaxLength(255).HasDefaultValue("");
            entity.Property(u => u.Role).HasMaxLength(20).IsRequired();
            entity.Property(u => u.IsActive).HasDefaultValue(true);
        });

        // Client Configuration
        modelBuilder.Entity<Client>(entity =>
        {
            entity.ToTable("Clients");
            entity.HasKey(c => c.Id);
            entity.HasIndex(c => c.Name);
            entity.Property(c => c.Name).HasMaxLength(150).IsRequired();
            entity.Property(c => c.Phone).HasMaxLength(500).HasDefaultValue("");
            entity.Property(c => c.Email).HasMaxLength(500).HasDefaultValue("");
            entity.Property(c => c.Address).HasMaxLength(1000).HasDefaultValue("");
            entity.Property(c => c.Notes);
        });

        // CaseTypeCounter Configuration
        modelBuilder.Entity<CaseTypeCounter>(entity =>
        {
            entity.ToTable("CaseTypeCounters");
            entity.HasKey(c => c.CaseTypeCode);
            entity.Property(c => c.CaseTypeCode).HasMaxLength(10);
            entity.Property(c => c.NextNumber).IsRequired();

            // Seed standard nomenclature codes
            entity.HasData(
                new CaseTypeCounter { CaseTypeCode = "FAM", NextNumber = 1 },
                new CaseTypeCounter { CaseTypeCode = "ANC", NextNumber = 1 },
                new CaseTypeCounter { CaseTypeCode = "LIT", NextNumber = 1 },
                new CaseTypeCounter { CaseTypeCode = "IMM", NextNumber = 1 },
                new CaseTypeCounter { CaseTypeCode = "PI", NextNumber = 1 },
                new CaseTypeCounter { CaseTypeCode = "EVIC", NextNumber = 1 },
                new CaseTypeCounter { CaseTypeCode = "COMM", NextNumber = 1 }
            );
        });

        // CaseRecord Configuration
        modelBuilder.Entity<CaseRecord>(entity =>
        {
            entity.ToTable("Cases");
            entity.HasKey(c => c.Id);
            entity.HasIndex(c => c.CaseId).IsUnique();
            entity.HasIndex(c => c.ClientId);
            entity.HasIndex(c => c.CaseTypeCode);
            entity.HasIndex(c => c.Status);
            entity.HasIndex(c => c.CreatedAt);
            entity.HasIndex(c => new { c.Status, c.CreatedAt });
            entity.HasIndex(c => new { c.ClientId, c.Status });

            entity.Property(c => c.CaseId).HasMaxLength(20).IsRequired();
            entity.Property(c => c.CaseTypeCode).HasMaxLength(10).IsRequired();
            entity.Property(c => c.OurRef).HasMaxLength(50).HasDefaultValue("");
            entity.Property(c => c.Matter).HasMaxLength(255).HasDefaultValue("");
            entity.Property(c => c.FeeAgreed).HasPrecision(18, 2);
            entity.Property(c => c.Status).HasMaxLength(30).HasDefaultValue("Unassigned");
            entity.Property(c => c.PiFieldsJson);
            entity.Property(c => c.Notes);

            entity.HasOne(c => c.Client)
                .WithMany(cl => cl.Cases)
                .HasForeignKey(c => c.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            // Multi-lawyer many-to-many relationship
            entity.HasMany(c => c.AssignedLawyers)
                .WithMany()
                .UsingEntity("CaseLawyers");
        });

        // CaseTask Configuration
        modelBuilder.Entity<CaseTask>(entity =>
        {
            entity.ToTable("Tasks");
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => t.CaseId);
            entity.HasIndex(t => t.Status);
            entity.HasIndex(t => t.Date);
            entity.HasIndex(t => t.CreatedAt);
            entity.HasIndex(t => new { t.CaseId, t.Status });
            entity.HasIndex(t => new { t.Date, t.Status, t.ReminderSent });

            entity.Property(t => t.Name).HasMaxLength(255).IsRequired();
            entity.Property(t => t.Status).HasMaxLength(30).HasDefaultValue("Pending");
            entity.Property(t => t.Notes);

            entity.HasOne(t => t.Case)
                .WithMany(c => c.Tasks)
                .HasForeignKey(t => t.CaseId)
                .OnDelete(DeleteBehavior.Cascade);

            // Multi-lawyer task assignment many-to-many relationship
            entity.HasMany(t => t.AssignedLawyers)
                .WithMany()
                .UsingEntity("TaskLawyers");
        });

        // FinanceEntry Configuration
        modelBuilder.Entity<FinanceEntry>(entity =>
        {
            entity.ToTable("FinanceEntries");
            entity.HasKey(f => f.Id);
            entity.HasIndex(f => f.ClientId);
            entity.HasIndex(f => f.CaseId);
            entity.HasIndex(f => f.Date);
            entity.HasIndex(f => new { f.ClientId, f.Date });

            entity.Property(f => f.Account).HasMaxLength(20).HasDefaultValue("office");
            entity.Property(f => f.Reference).HasMaxLength(50).HasDefaultValue("");
            entity.Property(f => f.Particulars).HasMaxLength(255).HasDefaultValue("");
            entity.Property(f => f.Type).HasMaxLength(10).HasDefaultValue("IN");
            entity.Property(f => f.Amount).HasPrecision(18, 2);

            entity.HasOne(f => f.Client)
                .WithMany(cl => cl.FinanceEntries)
                .HasForeignKey(f => f.ClientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(f => f.Case)
                .WithMany(c => c.FinanceEntries)
                .HasForeignKey(f => f.CaseId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // DirectOrBroadcastMessage Configuration
        modelBuilder.Entity<DirectOrBroadcastMessage>(entity =>
        {
            entity.ToTable("Messages");
            entity.HasKey(m => m.Id);
            entity.HasIndex(m => m.SenderId);
            entity.HasIndex(m => m.CreatedAt);

            entity.Property(m => m.Type).HasMaxLength(20).HasDefaultValue("individual");

            entity.HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // MessageRecipient Configuration
        modelBuilder.Entity<MessageRecipient>(entity =>
        {
            entity.ToTable("MessageRecipients");
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.MessageId);
            entity.HasIndex(r => r.RecipientId);
            entity.HasIndex(r => new { r.RecipientId, r.Status });

            entity.Property(r => r.Status).HasMaxLength(20).HasDefaultValue("Pending");

            entity.HasOne(r => r.Message)
                .WithMany(m => m.Recipients)
                .HasForeignKey(r => r.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.Recipient)
                .WithMany()
                .HasForeignKey(r => r.RecipientId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Notification Configuration
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notifications");
            entity.HasKey(n => n.Id);
            entity.HasIndex(n => n.LawyerId);
            entity.HasIndex(n => n.CaseId);
            entity.HasIndex(n => n.TaskId);
            entity.HasIndex(n => n.CreatedAt);

            entity.Property(n => n.Status).HasMaxLength(20).HasDefaultValue("Pending");

            entity.HasOne(n => n.Lawyer)
                .WithMany()
                .HasForeignKey(n => n.LawyerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(n => n.Case)
                .WithMany()
                .HasForeignKey(n => n.CaseId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(n => n.Task)
                .WithMany()
                .HasForeignKey(n => n.TaskId)
                .OnDelete(DeleteBehavior.NoAction);
        });
    }
}
