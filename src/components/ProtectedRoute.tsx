"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
      router.replace("/");
      return;
    }
  }, [user, profile, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600">Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
