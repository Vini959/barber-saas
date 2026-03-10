"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow",
  secondary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow",
  outline: "border-2 border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2.5 text-sm font-medium gap-2",
  lg: "px-6 py-3 text-base font-medium gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  leftIcon,
  rightIcon,
  fullWidth,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`
        inline-flex cursor-pointer items-center justify-center rounded-xl font-medium
        transition-all duration-150
        disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {leftIcon && <span className="[&_svg]:size-4 shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="[&_svg]:size-4 shrink-0">{rightIcon}</span>}
    </button>
  );
}
