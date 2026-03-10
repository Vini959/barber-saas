"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { validateAddress, validatePhone } from "@/lib/validation";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Building2, Plus } from "lucide-react";

interface Barbershop {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export default function AdminShopsPage() {
  const { profile } = useAuth();
  const [shops, setShops] = useState<Barbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const isPlatformAdmin = profile?.role === "platform_admin";

  useEffect(() => {
    async function load() {
      if (isPlatformAdmin) {
        const snap = await getDocs(collection(db, "barbershops"));
        setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Barbershop)));
      } else if (profile?.shopId) {
        const { doc, getDoc } = await import("firebase/firestore");
        const shopSnap = await getDoc(doc(db, "barbershops", profile.shopId));
        if (shopSnap.exists()) {
          setShops([{ id: shopSnap.id, ...shopSnap.data() } as Barbershop]);
        }
      }
      setLoading(false);
    }
    if (profile) load();
  }, [profile, isPlatformAdmin]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    getDocs(query(collection(db, "requests"), where("status", "==", "pending")))
      .then((snap) => setPendingRequestsCount(snap.docs.length))
      .catch(() => setPendingRequestsCount(0));
  }, [isPlatformAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isPlatformAdmin) return;
    setFormError("");
    const addrCheck = validateAddress(address);
    if (!addrCheck.valid) {
      setFormError(addrCheck.message ?? "Endereco invalido");
      return;
    }
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      setFormError(phoneCheck.message ?? "Telefone invalido");
      return;
    }
    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, "barbershops"), {
        name,
        address,
        phone,
        createdAt: new Date().toISOString(),
      });
      setName("");
      setAddress("");
      setPhone("");
      setShops((prev) => [...prev, { id: ref.id, name, address, phone }]);
    } catch (err) {
      console.error("Create shop error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["platform_admin", "shop_admin"]}>
      <PageContainer>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          {isPlatformAdmin && (
            <Link
              href="/admin/requests"
              className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Solicitacoes
              {pendingRequestsCount > 0 && (
                <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-medium text-white">
                  {pendingRequestsCount}
                </span>
              )}
            </Link>
          )}
        </div>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Barbearias</h1>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shops.map((s) => (
              <Link
                key={s.id}
                href={`/admin/shops/${s.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100">
                    <Building2 className="size-6 text-slate-600" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">{s.name}</h2>
                    <p className="text-sm text-slate-600">{s.address}</p>
                  </div>
                  <span className="ml-auto text-slate-400">-&gt;</span>
                </div>
              </Link>
            ))}

            {isPlatformAdmin && (
              <form
                onSubmit={handleCreate}
                className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6"
              >
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                  <Plus className="size-5" />
                  Criar barbearia
                </h3>
                <div className="space-y-4">
                  <Input
                    placeholder="Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Endereco (min. 10 caracteres)"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setFormError("");
                    }}
                    required
                    minLength={10}
                  />
                  <Input
                    type="tel"
                    placeholder="Telefone (10 ou 11 digitos)"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setFormError("");
                    }}
                  />
                  {formError && (
                    <p className="text-sm text-red-600">{formError}</p>
                  )}
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
