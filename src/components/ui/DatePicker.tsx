"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatLocalDateYMD } from "@/lib/date";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string;
  required?: boolean;
  className?: string;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Selecione a data",
  disabled = false,
  minDate,
  required,
  className = "",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = parseDate(value);
  const viewDate = parsed ?? new Date();
  const [viewMonth, setViewMonth] = useState(viewDate.getMonth());
  const [viewYear, setViewYear] = useState(viewDate.getFullYear());

  const displayValue = parsed
    ? parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const minDateParsed = minDate ? parseDate(minDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    if (minDateParsed) {
      minDateParsed.setHours(0, 0, 0, 0);
      if (date < minDateParsed) return true;
    }
    if (date < today) return true;
    return false;
  };

  const isSelected = (d: number) => {
    if (!parsed) return false;
    return parsed.getDate() === d && parsed.getMonth() === viewMonth && parsed.getFullYear() === viewYear;
  };

  const handleSelect = (d: number) => {
    const date = new Date(viewYear, viewMonth, d);
    onChange(formatLocalDateYMD(date));
    setIsOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen((o) => !o)}
          disabled={disabled}
          className={`
            flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 text-left text-slate-900 shadow-sm
            cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30
            disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500
            ${!displayValue ? "text-slate-400" : ""}
          `}
        >
          <span className="flex items-center gap-2">
            <Calendar className="size-5 text-slate-400" />
            {displayValue || placeholder}
          </span>
          <span className={`ml-2 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl bg-white p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="cursor-pointer rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none"
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="font-semibold text-slate-900">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="cursor-pointer rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none"
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
              {days.map((d, i) =>
                d === null ? (
                  <div key={`empty-${i}`} />
                ) : (
                  <button
                    key={d}
                    type="button"
                    onClick={() => !isDisabled(d) && handleSelect(d)}
                    disabled={isDisabled(d)}
                    className={`
                      rounded-lg py-2 text-sm font-medium transition
                      focus:outline-none
                      ${isDisabled(d)
                        ? "cursor-not-allowed text-slate-300"
                        : "cursor-pointer " + (isSelected(d)
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "text-slate-700 hover:bg-slate-100")
                      }
                    `}
                  >
                    {d}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}