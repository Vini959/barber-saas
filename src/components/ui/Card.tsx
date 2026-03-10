"use client";

import { type ReactNode } from "react";
import Link from "next/link";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border border-slate-200 bg-white p-5
        shadow-sm transition-shadow hover:shadow-md
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
  badge?: ReactNode;
}

export function CardLink({
  href,
  children,
  className = "",
  variant = "secondary",
  badge,
}: CardLinkProps) {
  const baseStyles =
    "group flex items-center gap-4 rounded-2xl border p-5 transition-all duration-200";

  const variantStyles = {
    primary:
      "border-slate-200 bg-slate-900 text-white hover:bg-slate-800 hover:border-slate-800 shadow-sm hover:shadow-md",
    secondary:
      "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 shadow-sm hover:shadow",
  };

  return (
    <Link
      href={href}
      className={`relative flex cursor-pointer items-center gap-4 ${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      <span className="flex-1">{children}</span>
      <span className="flex items-center gap-2">
        {badge}
        <span
          className={`opacity-60 transition-opacity group-hover:opacity-100 ${
            variant === "primary" ? "text-white" : "text-slate-500"
          }`}
        >
          →
        </span>
      </span>
    </Link>
  );
}
