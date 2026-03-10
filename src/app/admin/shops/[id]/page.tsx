"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Scissors, Plus } from "lucide-react";

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
      setBarbers(barbersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Barber)));
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  const canManageBarbers =
    profile?.role === "platform_admin" ||
    (profile?.role === "shop_admin" && profile?.shopId === id);

  return (
    <ProtectedRoute allowedRoles={["platform_admin", "shop_admin"]}>
      <PageContainer>
        <Link
          href="/admin/shops"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">{shop?.name ?? "Barbearia"}</h1>
              <p className="mt-1 text-slate-600">{shop?.address}</p>
              {shop?.phone && <p className="mt-1 text-sm text-slate-600">{shop.phone}</p>}
            </div>

            {canManageBarbers && (
              <Link
                href={`/admin/shops/${id}/edit`}
                className="mb-6 inline-block"
              >
                <Button variant="outline">Editar barbearia</Button>
              </Link>
            )}

            <h2 className="mb-4 text-lg font-semibold text-slate-900">Barbeiros</h2>
            <div className="space-y-4">
              {barbers.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100">
                    <Scissors className="size-6 text-slate-600" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{b.displayName}</p>
                    <p className="text-sm text-slate-600">{b.email}</p>
                    {b.pixKey && (
                      <p className="mt-1 text-xs text-slate-500">Pix: {b.pixKey}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {canManageBarbers && (
              <Link href={`/admin/shops/${id}/barbers/new`} className="mt-6 inline-block">
                <Button variant="primary" leftIcon={<Plus className="size-4" />}>
                  Adicionar barbeiro
                </Button>
              </Link>
            )}
          </>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
