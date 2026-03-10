"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { validateAddress, validatePhone } from "@/lib/validation";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft } from "lucide-react";

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
      await updateDoc(doc(db, "barbershops", id), {
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
      <PageContainer>
        <Link
          href={`/admin/shops/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Editar barbearia</h1>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : !canEdit ? (
          <p className="text-slate-600">Você não tem permissão para editar esta barbearia.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-5">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input
              label="Endereço"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              minLength={10}
            />
            <Input label="Telefone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                Barbearia atualizada com sucesso.
              </div>
            )}
            <Button type="submit" fullWidth size="lg" variant="primary" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
