/**
 * Consistent date and time formatting utilities.
 * Time is strictly omitted in general views (showing date only),
 * while exact date + time is provided for advocate assignment & work tracking.
 */

export function formatDateOnly(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      return String(val).slice(0, 10) || "—";
    }
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(val).slice(0, 10) || "—";
  }
}

export function formatDateTime(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(val);
  }
}

export function formatTurnaroundTime(startVal, endVal) {
  if (!startVal || !endVal) return null;
  try {
    const start = new Date(startVal).getTime();
    const end = new Date(endVal).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;

    const diffMinutes = Math.round((end - start) / 60000);
    if (diffMinutes < 1) return "Just now (<1 min)";
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  } catch {
    return null;
  }
}
