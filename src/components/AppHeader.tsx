"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { SignOutButton } from "@/components/SignOutButton";
import { User } from "lucide-react";

export function AppHeader() {
  const { user, profile } = useAuth();

  const roleLabels: Record<string, string> = {
    client: "Cliente",
    barber: "Barbeiro",
    shop_admin: "Admin",
    platform_admin: "Admin",
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          The Barber
        </Link>

        <div className="flex items-center gap-3">
          {user && profile ? (
            <>
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 sm:flex hover:bg-slate-200/80 transition"
              >
                <User className="size-4 text-slate-500" />
                <span className="text-sm text-slate-700">
                  {profile.name}
                  <span className="ml-1 text-slate-500">
                    · {roleLabels[profile.role] ?? profile.role}
                  </span>
                </span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
