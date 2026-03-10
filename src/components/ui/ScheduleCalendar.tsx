"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatLocalDateYMD } from "@/lib/date";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export interface CalendarDayInfo {
  dateStr: string;
  hasAppointments?: boolean;
  appointmentCount?: number;
  hasSlots?: boolean;
  isClosed?: boolean;
}

interface ScheduleCalendarProps {
  viewMonth: number;
  viewYear: number;
  onViewChange: (month: number, year: number) => void;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
  minDate?: string;
  dayInfo?: (dateStr: string) => CalendarDayInfo | null;
  className?: string;
}

export function ScheduleCalendar({
  viewMonth,
  viewYear,
  onViewChange,
  selectedDate,
  onSelectDate,
  minDate,
  dayInfo,
  className = "",
}: ScheduleCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDateParsed = minDate ? new Date(minDate + "T12:00:00") : null;
  if (minDateParsed) minDateParsed.setHours(0, 0, 0, 0);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startPadding = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startPadding; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const isDisabled = (d: number) => {
    const date = new Date(viewYear, viewMonth, d);
    date.setHours(0, 0, 0, 0);
    if (minDateParsed && date < minDateParsed) return true;
    if (date < today) return true;
    return false;
  };

  const handleSelect = (d: number) => {
    const date = new Date(viewYear, viewMonth, d);
    onSelectDate(formatLocalDateYMD(date));
  };

  const prevMonth = () => {
    if (viewMonth === 0) onViewChange(11, viewYear - 1);
    else onViewChange(viewMonth - 1, viewYear);
  };

  const nextMonth = () => {
    if (viewMonth === 11) onViewChange(0, viewYear + 1);
    else onViewChange(viewMonth + 1, viewYear);
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="font-semibold text-slate-900">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-center text-xs font-medium text-slate-500">
            {w}
          </div>
        ))}
        {days.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} />;
          const date = new Date(viewYear, viewMonth, d);
          const dateStr = formatLocalDateYMD(date);
          const info = dayInfo?.(dateStr);
          const disabled = isDisabled(d);
          const isClosed = info?.isClosed;
          const isSelected = selectedDate === dateStr;
          const hasData = info?.hasAppointments || info?.hasSlots;
          const selectable = !disabled && !isClosed;

          return (
            <button
              key={d}
              type="button"
              onClick={() => selectable && handleSelect(d)}
              disabled={!selectable}
              className={`
                relative flex flex-col items-center justify-center rounded-xl py-2 text-sm font-medium transition
                focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50
                ${!selectable ? "cursor-not-allowed text-slate-300" : "cursor-pointer"}
                ${isSelected
                  ? "bg-slate-900 text-white"
                  : selectable && hasData
                    ? "text-slate-800 hover:bg-slate-100"
                    : selectable
                      ? "text-slate-600 hover:bg-slate-50"
                      : ""}
              `}
            >
              {d}
              {info?.appointmentCount && info.appointmentCount > 0 && (
                <span
                  className={`mt-0.5 flex size-5 items-center justify-center rounded-full text-[10px] font-bold
                    ${isSelected ? "bg-white/30" : "bg-emerald-100 text-emerald-700"}
                  `}
                >
                  {info.appointmentCount}
                </span>
              )}
              {info?.hasSlots && !info?.hasAppointments && !info?.appointmentCount && (
                <span className="mt-0.5 size-1.5 rounded-full bg-emerald-400" title="Horarios disponiveis" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}