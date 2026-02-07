"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { validateAddress, validatePhone } from "@/lib/validation";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";

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
  const isShopAdmin = profile?.role === "shop_admin";

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
      setFormError(addrCheck.message ?? "Endereço inválido");
      return;
    }
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      setFormError(phoneCheck.message ?? "Telefone inválido");
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
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex gap-4">
            <Link href="/" className="text-zinc-800 hover:text-zinc-900">
              ← Voltar
            </Link>
            {isPlatformAdmin && (
              <Link href="/admin/requests" className="relative inline-flex items-center text-zinc-800 hover:text-zinc-900">
                Solicitações
                {pendingRequestsCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                    {pendingRequestsCount}
                  </span>
                )}
              </Link>
            )}
          </div>
          <SignOutButton />
        </header>

        <h1 className="mb-6 text-2xl font-bold text-zinc-900">
          Barbearias
        </h1>

        {loading ? (
          <p className="text-zinc-600">Carregando...</p>
        ) : (
          <div className="space-y-4">
            {shops.map((s) => (
              <Link
                key={s.id}
                href={`/admin/shops/${s.id}`}
                className="block rounded-lg border border-zinc-300 bg-white p-4 hover:bg-zinc-50"
              >
                <h2 className="font-medium">{s.name}</h2>
                <p className="text-sm text-zinc-800">{s.address}</p>
              </Link>
            ))}

            {isPlatformAdmin && (
              <form onSubmit={handleCreate} className="mx-auto max-w-md rounded-lg border border-dashed border-zinc-300 bg-white p-4">
                <h3 className="mb-3 font-medium">Criar barbearia</h3>
                <input
                  type="text"
                  placeholder="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mb-2 w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-800"
                  required
                />
                <input
                  type="text"
                  placeholder="Endereço (obrigatório, min. 10 caracteres)"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setFormError(""); }}
                  className="mb-2 w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-800"
                  required
                  minLength={10}
                />
                <input
                  type="tel"
                  placeholder="Telefone (10 ou 11 dígitos)"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setFormError(""); }}
                  className="mb-2 w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-800"
                />
                {formError && <p className="mb-2 text-sm text-red-600">{formError}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  Criar
                </button>
              </form>
            )}
          </div>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
