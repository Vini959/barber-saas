"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";

interface UserDoc {
  id: string;
  email: string;
  name: string;
  role: string;
  shopId?: string;
}

const roleLabels: Record<string, string> = {
  client: "Cliente",
  barber: "Barbeiro",
  shop_admin: "Admin da barbearia",
  platform_admin: "Admin",
};

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "users"));
      setUsers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserDoc))
      );
      setLoading(false);
    }
    load();
  }, []);

  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
          <header className="mb-8 flex items-center justify-between">
            <Link href="/" className="text-zinc-800 hover:text-zinc-900">
              ← Voltar
            </Link>
            <SignOutButton />
          </header>

          <h1 className="mb-6 text-2xl font-bold text-zinc-900">
            Gerenciar usuários
          </h1>

          {loading ? (
            <p className="text-zinc-600">Carregando...</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}/edit`}
                  className="flex items-center justify-between rounded-lg border border-zinc-300 bg-white p-4 hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{u.name || u.email}</p>
                    <p className="text-sm text-zinc-800">{u.email}</p>
                  </div>
                  <span className="rounded bg-zinc-200 px-2 py-1 text-sm text-zinc-800">
                    {roleLabels[u.role] ?? u.role}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
