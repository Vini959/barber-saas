"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { validateAddress, validatePhone } from "@/lib/validation";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";

export default function EditShopPage() {
  const params = useParams();
  const id = params.id as string;
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canEdit =
    profile?.role === "platform_admin" ||
    (profile?.role === "shop_admin" && profile?.shopId === id);

  useEffect(() => {
    async function load() {
      const shopRef = doc(db, "barbershops", id);
      const shopSnap = await getDoc(shopRef);
      if (shopSnap.exists()) {
        const d = shopSnap.data() as { name?: string; address?: string; phone?: string };
        setName(d.name ?? "");
        setAddress(d.address ?? "");
        setPhone(d.phone ?? "");
      }
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setError("");
    const addrCheck = validateAddress(address);
    if (!addrCheck.valid) {
      setError(addrCheck.message ?? "Endereço inválido");
      return;
    }
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      setError(phoneCheck.message ?? "Telefone inválido");
      return;
    }
    setSubmitting(true);
    try {
      const shopRef = doc(db, "barbershops", id);
      await updateDoc(shopRef, {
        name,
        address,
        phone,
        updatedAt: new Date().toISOString(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
      console.error("Edit shop error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["platform_admin", "shop_admin"]}>
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
        <header className="mb-8 flex items-center justify-between">
          <Link
            href={`/admin/shops/${id}`}
            className="text-zinc-800 hover:text-zinc-900"
          >
            ← Voltar
          </Link>
          <SignOutButton />
        </header>

        <h1 className="mb-6 text-2xl font-bold text-zinc-900">Editar barbearia</h1>

        {loading ? (
          <p className="text-zinc-600">Carregando...</p>
        ) : !canEdit ? (
          <p className="text-zinc-600">Você não tem permissão para editar esta barbearia.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Endereço</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
                required
                minLength={10}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && (
              <p className="text-sm text-green-600">Barbearia atualizada com sucesso.</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Salvar"}
            </button>
          </form>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
