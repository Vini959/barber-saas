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
  /** Override para datas específicas (YYYY-MM-DD). null = fechado, objeto = horário customizado. */
  dateOverrides?: Record<string, DaySchedule | null>;
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

  // Override para esta data específica (ex: barbeiro fechou este dia)
  if (barber?.dateOverrides && dateStr in barber.dateOverrides) {
    const override = barber.dateOverrides[dateStr];
    if (override === null) return [];
    return generateSlotsFromDayConfig(override);
  }

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

const SLOT_INTERVAL = 15; // minutos

/**
 * Gera slots a cada 15 min dentro da janela (start, end).
 * Usado para agendamento com serviços de duração variável.
 */
function generateSlots15Min(start: string, end: string): string[] {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const slots: string[] = [];
  for (let m = startMinutes; m < endMinutes; m += SLOT_INTERVAL) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
  }
  return slots;
}

/**
 * Retorna slots de 15 em 15 min para uma data, com base na agenda do barbeiro.
 */
export function getSlots15Min(barber: BarberSchedule | null | undefined, dateStr: string): string[] {
  if (!dateStr) return [];

  let config: DaySchedule;
  if (barber?.dateOverrides && dateStr in barber.dateOverrides) {
    const override = barber.dateOverrides[dateStr];
    if (override === null) return [];
    config = override;
  } else {
    const d = new Date(dateStr + "T12:00:00");
    const dayKey = String(d.getDay());
    if (barber?.schedule && dayKey in barber.schedule) {
      const dayEntry = barber.schedule[dayKey];
      if (dayEntry === null) return [];
      config = dayEntry;
    } else {
      config = {
        start: barber?.slotStart ?? DEFAULT.start,
        end: barber?.slotEnd ?? DEFAULT.end,
        duration: barber?.slotDuration ?? DEFAULT.duration,
      };
    }
  }
  return generateSlots15Min(config.start, config.end);
}

/**
 * Quantos slots de 15 min um serviço com duration minutos ocupa.
 */
export function slotsNeededForDuration(durationMinutes: number): number {
  return Math.ceil(durationMinutes / SLOT_INTERVAL);
}
