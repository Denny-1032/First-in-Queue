import { getBookings } from "@/lib/db/operations";
import type { BookingSettings, OperatingHours } from "@/types";

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  open: boolean;
  reason?: "closed" | "past" | "too_soon" | "too_far";
  slots: Array<{ time: string; remaining: number }>; // HH:MM
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Current wall-clock time in the tenant's timezone. Server time (Vercel = UTC)
 * would shift "today" and the min-notice cutoff for most tenants.
 */
export function nowInTimezone(tz?: string): Date {
  if (!tz) return new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
    return new Date(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")) % 24,
      Number(get("minute")),
      Number(get("second"))
    );
  } catch {
    return new Date();
  }
}

/**
 * Open/close for a given date. Supports both schedule shapes in the wild:
 * record { Monday: {open,close}|null } and the settings-page array
 * [{ day, open, close, enabled }] - mirrors isOutsideOperatingHours in handler.ts.
 */
export function resolveDaySchedule(
  opHours: OperatingHours | undefined,
  date: Date
): { open: string; close: string } | null {
  if (!opHours?.schedule) {
    // No configured hours - treat as always open 08:00-17:00 so booking still works
    return { open: "08:00", close: "17:00" };
  }
  const dayName = DAY_NAMES[date.getDay()];
  const schedule = opHours.schedule as Record<string, unknown>;

  if (Array.isArray(schedule)) {
    const entry = schedule.find((d: { day: string; enabled?: boolean }) => d.day === dayName);
    if (!entry || entry.enabled === false || !entry.open || !entry.close) return null;
    return { open: entry.open, close: entry.close };
  }

  const entry = schedule[dayName] as { open: string; close: string } | null | undefined;
  if (!entry?.open || !entry?.close) return null;
  return { open: entry.open, close: entry.close };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function getAvailability(
  tenantId: string,
  date: string, // YYYY-MM-DD
  settings: BookingSettings,
  opHours?: OperatingHours
): Promise<DayAvailability> {
  const now = nowInTimezone(opHours?.timezone);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { date, open: false, reason: "closed", slots: [] };
  }
  if (date < todayStr) {
    return { date, open: false, reason: "past", slots: [] };
  }

  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + (settings.max_days_ahead || 30));
  const maxDateStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, "0")}-${String(maxDate.getDate()).padStart(2, "0")}`;
  if (date > maxDateStr) {
    return { date, open: false, reason: "too_far", slots: [] };
  }

  const target = new Date(`${date}T00:00`);
  const daySchedule = resolveDaySchedule(opHours, target);
  if (!daySchedule) {
    return { date, open: false, reason: "closed", slots: [] };
  }

  const slotMinutes = Math.max(settings.slot_minutes || 30, 5);
  const capacity = Math.max(settings.capacity_per_slot || 1, 1);
  const openMin = toMinutes(daySchedule.open);
  const closeMin = toMinutes(daySchedule.close);

  // Earliest bookable minute-of-day (min notice only bites on today / tomorrow-crossing)
  const noticeCutoff = new Date(now.getTime() + (settings.min_notice_hours || 0) * 60 * 60 * 1000);
  const cutoffDateStr = `${noticeCutoff.getFullYear()}-${String(noticeCutoff.getMonth() + 1).padStart(2, "0")}-${String(noticeCutoff.getDate()).padStart(2, "0")}`;
  let earliestMin = -1;
  if (date < cutoffDateStr) {
    return { date, open: false, reason: "too_soon", slots: [] };
  }
  if (date === cutoffDateStr) {
    earliestMin = noticeCutoff.getHours() * 60 + noticeCutoff.getMinutes();
  }

  // Count existing pending/confirmed bookings per slot time
  const existing = await getBookings(tenantId, { date }, 200);
  const counts = new Map<string, number>();
  for (const b of existing) {
    if (b.status !== "pending" && b.status !== "confirmed") continue;
    const key = (b.scheduled_time || "").slice(0, 5);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const slots: Array<{ time: string; remaining: number }> = [];
  for (let start = openMin; start + slotMinutes <= closeMin; start += slotMinutes) {
    if (start < earliestMin) continue;
    const time = toHHMM(start);
    const remaining = capacity - (counts.get(time) || 0);
    if (remaining > 0) slots.push({ time, remaining });
  }

  return { date, open: true, slots };
}
