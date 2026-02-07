/**
 * Per-day schedule: start, end, duration.
 * Day keys: 0=Sun, 1=Mon, ..., 6=Sat.
 */
export interface DaySchedule {
  start: string;
  end: string;
  duration: number;
}

export interface BarberSchedule {
  slotStart?: string;
  slotEnd?: string;
  slotDuration?: number;
  schedule?: Record<string, DaySchedule | null>;
}

const DEFAULT: DaySchedule = { start: "08:00", end: "18:00", duration: 40 };

function generateSlotsFromDayConfig(config: DaySchedule): string[] {
  const [startH, startM] = config.start.split(":").map(Number);
  const [endH, endM] = config.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const slots: string[] = [];
  for (let m = startMinutes; m < endMinutes; m += config.duration) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
  }
  return slots;
}

/**
 * Get slots for a specific date based on barber's per-day schedule.
 * dateStr: YYYY-MM-DD
 */
export function getSlotsForDate(barber: BarberSchedule | null | undefined, dateStr: string): string[] {
  if (!dateStr) return [];

  const d = new Date(dateStr + "T12:00:00");
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  const dayKey = String(dayOfWeek);
  if (barber?.schedule && dayKey in barber.schedule) {
    const dayEntry = barber.schedule[dayKey];
    if (dayEntry === null) return []; // closed
    return generateSlotsFromDayConfig(dayEntry);
  }

  // Fallback to legacy slotStart/slotEnd/slotDuration or default
  const dayConfig: DaySchedule = barber?.slotStart || barber?.slotEnd || barber?.slotDuration !== undefined
    ? {
        start: barber.slotStart ?? DEFAULT.start,
        end: barber.slotEnd ?? DEFAULT.end,
        duration: barber.slotDuration ?? DEFAULT.duration,
      }
    : DEFAULT;
  return generateSlotsFromDayConfig(dayConfig);
}

/**
 * @deprecated Use getSlotsForDate instead. Kept for backward compat.
 */
export function generateSlotsFromConfig(config?: {
  slotStart?: string;
  slotEnd?: string;
  slotDuration?: number;
}): string[] {
  const start = config?.slotStart ?? "08:00";
  const end = config?.slotEnd ?? "18:00";
  const duration = config?.slotDuration ?? 40;
  return generateSlotsFromDayConfig({ start, end, duration });
}

export const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
