"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
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
  const [shop, setShop] = useState<{ name: string; address: string; phone?: string } | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

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
            <h1 className="mb-2 text-2xl font-bold text-zinc-900">
              {shop?.name ?? "Barbearia"}
            </h1>
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

            {canManageBarbers && (
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
