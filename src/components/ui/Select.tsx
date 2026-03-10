"use client";

import { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Selecione",
  disabled = false,
  error,
  hint,
  required,
  className = "",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayValue = selectedOption?.label ?? placeholder;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            ${error ? "ring-2 ring-red-200" : ""}
            ${!selectedOption ? "text-slate-400" : ""}
          `}
        >
          <span>{displayValue}</span>
          <span
            className={`ml-2 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl bg-white py-1 shadow-lg"
            role="listbox"
          >
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors focus:outline-none active:bg-slate-100 hover:bg-slate-50 ${
                !value ? "bg-slate-50 text-slate-900 font-medium" : "text-slate-600"
              }`}
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={value === opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors focus:outline-none active:bg-slate-100 hover:bg-slate-50 ${
                  value === opt.value
                    ? "bg-emerald-50 text-emerald-800 font-medium"
                    : "text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
