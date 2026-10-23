using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HRPortal.Data;
using HRPortal.DTOs;
using HRPortal.Models;
using HRPortal.Services;

namespace HRPortal.Controllers;

// ── Notifications ──────────────────────────────────────────────────────────────

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotificationsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Cada usuario solo ve sus propias notificaciones (se ignora cualquier employeeId recibido)
        var employeeId = User.EmployeeId();
        var list = await _db.Notifications
            .Where(n => n.EmployeeId == employeeId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return Ok(list.Select(n => new NotificationDto(
            n.Id, n.Title, n.Body, n.Type.ToString(), n.IsRead, n.Link, n.CreatedAt)));
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var n = await _db.Notifications.FindAsync(id);
        if (n == null || n.EmployeeId != User.EmployeeId()) return NotFound();
        n.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("broadcast")]
    [Authorize(Roles = "HR,Admin")]
    public async Task<IActionResult> Broadcast([FromBody] BroadcastRequest req)
    {
        var employees = await _db.Employees.Select(e => e.Id).ToListAsync();
        var now       = DateTime.UtcNow;
        var notifs    = employees.Select(eId => new Notification
        {
            EmployeeId = eId,
            Title      = req.Title,
            Body       = req.Body,
            Type       = Enum.Parse<NotificationType>(req.Type),
            IsRead     = false,
            CreatedAt  = now
        }).ToList();
        _db.Notifications.AddRange(notifs);
        await _db.SaveChangesAsync();
        return Ok(new { sent = notifs.Count });
    }
}

public record BroadcastRequest(string Title, string Body, string Type);

// ── Email ──────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/email")]
[Authorize]
public class EmailController : ControllerBase
{
    private readonly AppDbContext _db;
    public EmailController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string folder = "inbox")
    {
        var me = User.EmployeeId();
        var q  = _db.Emails.Include(e => e.Sender).Include(e => e.Recipient).AsQueryable();

        // Un mensaje se guarda una sola vez: "Enviados" se deduce del remitente
        q = folder switch
        {
            "sent"    => q.Where(e => e.SenderId == me && e.Folder != "trash"),
            "starred" => q.Where(e => (e.RecipientId == me || e.SenderId == me) && e.IsStarred && e.Folder != "trash"),
            "trash"   => q.Where(e => (e.RecipientId == me || e.SenderId == me) && e.Folder == "trash"),
            _         => q.Where(e => e.RecipientId == me && e.Folder == "inbox"),
        };

        var list = await q.OrderByDescending(e => e.SentAt).ToListAsync();

        return Ok(list.Select(ToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Send(SendEmailRequest req)
    {
        var senderId = User.EmployeeId();
        if (string.IsNullOrWhiteSpace(req.Subject) || !await _db.Employees.AnyAsync(e => e.Id == req.RecipientId))
            return BadRequest(new { message = "Destinatario o asunto no válidos" });
        var msg = new EmailMessage
        {
            SenderId        = senderId,
            RecipientId     = req.RecipientId,
            Subject         = req.Subject,
            Body            = req.Body,
            AttachmentName  = req.AttachmentName,
            IsRead          = false,
            IsStarred       = false,
            Folder          = "inbox",
            SentAt          = DateTime.UtcNow
        };
        _db.Emails.Add(msg);
        await _db.SaveChangesAsync();
        await _db.Entry(msg).Reference(e => e.Sender).LoadAsync();
        await _db.Entry(msg).Reference(e => e.Recipient).LoadAsync();
        return Ok(ToDto(msg));
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var msg = await _db.Emails.FindAsync(id);
        if (msg == null || !IsMine(msg)) return NotFound();
        msg.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id}/star")]
    public async Task<IActionResult> ToggleStar(int id)
    {
        var msg = await _db.Emails.FindAsync(id);
        if (msg == null || !IsMine(msg)) return NotFound();
        msg.IsStarred = !msg.IsStarred;
        await _db.SaveChangesAsync();
        return Ok(new { isStarred = msg.IsStarred });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var msg = await _db.Emails.FindAsync(id);
        if (msg == null || !IsMine(msg)) return NotFound();
        msg.Folder = "trash";
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private bool IsMine(EmailMessage e)
    {
        var me = User.EmployeeId();
        return e.SenderId == me || e.RecipientId == me;
    }

    private static EmailDto ToDto(EmailMessage e) => new(
        e.Id, e.SenderId,
        e.Sender   != null ? $"{e.Sender.FirstName} {e.Sender.LastName}"     : "",
        e.Sender?.Email ?? "",
        e.RecipientId,
        e.Recipient != null ? $"{e.Recipient.FirstName} {e.Recipient.LastName}" : "",
        e.Recipient?.Email ?? "",
        e.Subject, e.Body, e.IsRead, e.IsStarred, e.Folder ?? "inbox",
        e.AttachmentName, e.SentAt);
}

// ── Chat ───────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _db;
    public ChatController(AppDbContext db) => _db = db;

    [HttpGet("{contactId}")]
    public async Task<IActionResult> GetConversation(int contactId)
    {
        var meId = int.Parse(User.FindFirst("employee_id")!.Value);
        var msgs = await _db.ChatMessages
            .Include(c => c.Sender)
            .Where(c => (c.SenderId == meId && c.RecipientId == contactId)
                     || (c.SenderId == contactId && c.RecipientId == meId))
            .OrderBy(c => c.SentAt)
            .ToListAsync();

        // Mark received as read
        var unread = msgs.Where(c => c.RecipientId == meId && !c.IsRead).ToList();
        unread.ForEach(c => c.IsRead = true);
        if (unread.Any()) await _db.SaveChangesAsync();

        return Ok(msgs.Select(c => new ChatMessageDto(
            c.Id, c.SenderId,
            c.Sender != null ? $"{c.Sender.FirstName} {c.Sender.LastName}" : "",
            c.Sender != null ? $"{c.Sender.FirstName[0]}{c.Sender.LastName[0]}".ToUpper() : "??",
            c.RecipientId, c.Body, c.IsRead, c.SentAt)));
    }

    [HttpPost]
    public async Task<IActionResult> Send(SendChatRequest req)
    {
        var meId = User.EmployeeId();
        if (string.IsNullOrWhiteSpace(req.Body) || req.RecipientId == meId
            || !await _db.Employees.AnyAsync(e => e.Id == req.RecipientId))
            return BadRequest(new { message = "Mensaje o destinatario no válidos" });
        var msg  = new ChatMessage
        {
            SenderId    = meId,
            RecipientId = req.RecipientId,
            Body        = req.Body,
            IsRead      = false,
            SentAt      = DateTime.UtcNow
        };
        _db.ChatMessages.Add(msg);
        await _db.SaveChangesAsync();
        await _db.Entry(msg).Reference(c => c.Sender).LoadAsync();

        return Ok(new ChatMessageDto(
            msg.Id, msg.SenderId,
            msg.Sender != null ? $"{msg.Sender.FirstName} {msg.Sender.LastName}" : "",
            msg.Sender != null ? $"{msg.Sender.FirstName[0]}{msg.Sender.LastName[0]}".ToUpper() : "??",
            msg.RecipientId, msg.Body, msg.IsRead, msg.SentAt));
    }

    [HttpGet("contacts")]
    public async Task<IActionResult> GetContacts()
    {
        var meId = int.Parse(User.FindFirst("employee_id")!.Value);
        var contacts = await _db.Employees
            .Where(e => e.Id != meId && e.User!.IsActive)
            .Select(e => new { e.Id, e.FirstName, e.LastName, e.Email, e.Position, e.Department })
            .OrderBy(e => e.FirstName)
            .ToListAsync();
        return Ok(contacts);
    }
}
