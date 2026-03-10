"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { ArrowLeft, User } from "lucide-react";

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
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserDoc)));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <PageContainer>
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Gerenciar usuarios</h1>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}/edit`}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100">
                  <User className="size-6 text-slate-600" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{u.name || u.email}</p>
                  <p className="text-sm text-slate-600">{u.email}</p>
                </div>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">
                  {roleLabels[u.role] ?? u.role}
                </span>
                <span className="text-slate-400">-&gt;</span>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}