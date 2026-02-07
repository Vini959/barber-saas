"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";

interface Barber {
  id: string;
  displayName: string;
  email: string;
  shopId: string;
  pixKey?: string;
}

export default function ShopDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { profile } = useAuth();
  const [shop, setShop] = useState<{ name: string; address: string; phone?: string; status?: string } | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function load() {
      const shopRef = doc(db, "barbershops", id);
      const shopSnap = await getDoc(shopRef);
      if (shopSnap.exists()) {
        setShop(shopSnap.data() as { name: string; address: string; phone?: string });
      }
      const barbersSnap = await getDocs(
        query(collection(db, "barbers"), where("shopId", "==", id))
      );
      setBarbers(
        barbersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Barber))
      );
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  const canManageBarbers =
    profile?.role === "platform_admin" ||
    (profile?.role === "shop_admin" && profile?.shopId === id);
  const isPlatformAdmin = profile?.role === "platform_admin";
  const isSuspended = shop?.status === "suspended";

  const setStatus = async (status: string) => {
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "barbershops", id), { status });
      setShop((prev) => (prev ? { ...prev, status } : null));
    } catch (err) {
      console.error("Update status error:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["platform_admin", "shop_admin"]}>
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/admin/shops" className="text-zinc-800 hover:text-zinc-900">
            ← Voltar
          </Link>
          <SignOutButton />
        </header>

        {loading ? (
          <p className="text-zinc-600">Carregando...</p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-zinc-900">
                {shop?.name ?? "Barbearia"}
              </h1>
              {isPlatformAdmin && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600">Status:</span>
                  <select
                    value={shop?.status ?? "active"}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={updatingStatus}
                    className="rounded border border-zinc-300 px-2 py-1 text-sm disabled:opacity-50"
                  >
                    <option value="active">Ativa</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspensa</option>
                  </select>
                </div>
              )}
            </div>
            {isSuspended && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Barbearia suspensa. Agendamentos bloqueados e não é possível adicionar barbeiros.
              </div>
            )}
            <p className="mb-2 text-zinc-800">{shop?.address}</p>
            {shop?.phone && (
              <p className="mb-6 text-sm text-zinc-800">{shop.phone}</p>
            )}
            {!shop?.phone && <div className="mb-6" />}

            {canManageBarbers && (
              <Link
                href={`/admin/shops/${id}/edit`}
                className="mb-6 inline-block rounded-lg border border-zinc-300 bg-white px-4 py-2 hover:bg-zinc-50"
              >
                Editar barbearia
              </Link>
            )}

            <h2 className="mb-4 text-lg font-medium">Barbeiros</h2>
            <div className="space-y-3">
              {barbers.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-zinc-300 bg-white p-4"
                >
                  <p className="font-medium">{b.displayName}</p>
                  <p className="text-sm text-zinc-800">{b.email}</p>
                  {b.pixKey && (
                    <p className="mt-1 text-xs text-zinc-600">Pix: {b.pixKey}</p>
                  )}
                </div>
              ))}
            </div>

            {canManageBarbers && !isSuspended && (
              <Link
                href={`/admin/shops/${id}/barbers/new`}
                className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800"
              >
                Adicionar barbeiro
              </Link>
            )}
          </>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
