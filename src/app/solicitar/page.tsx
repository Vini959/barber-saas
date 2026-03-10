"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ArrowLeft } from "lucide-react";

type RequestedRole = "barber" | "shop_admin";

export default function SolicitarPage() {
  const { user } = useAuth();
  const [requestedRole, setRequestedRole] = useState<RequestedRole>("barber");
  const [shopId, setShopId] = useState("");
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getDocs(collection(db, "barbershops")).then((snap) => {
      setShops(snap.docs.map((d) => ({ id: d.id, name: (d.data() as { name?: string }).name ?? d.id })));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!shopId) {
      setError("Selecione a barbearia");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await addDoc(collection(db, "requests"), {
        userId: user.uid,
        requestedRole,
        shopId,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar solicitação");
      console.error("Request error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["client", "barber", "shop_admin"]}>
      <PageContainer>
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">Solicitar ao administrador</h1>
        <p className="mb-6 text-slate-600">
          Envie uma solicitação para ser barbeiro ou admin de uma barbearia. O administrador da plataforma vai analisar.
        </p>

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="font-medium text-emerald-800">Solicitação enviada!</p>
            <p className="mt-2 text-sm text-emerald-700">
              Sua solicitação para ser {requestedRole === "barber" ? "barbeiro" : "admin da barbearia"} foi enviada.
              Aguarde a aprovação do administrador.
            </p>
            <Link href="/" className="mt-4 inline-block">
              <Button variant="primary">Voltar ao início</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-5">
            <Select
              label="Quero ser"
              value={requestedRole}
              onChange={(v) => setRequestedRole(v as RequestedRole)}
              options={[
                { value: "barber", label: "Barbeiro" },
                { value: "shop_admin", label: "Admin da barbearia" },
              ]}
              placeholder="Selecione"
            />
            <Select
              label="Barbearia"
              value={shopId}
              onChange={setShopId}
              options={shops.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Selecione a barbearia"
              required
              hint="A barbearia onde você pretende atuar"
            />
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            <Button type="submit" fullWidth size="lg" variant="primary" disabled={loading}>
              {loading ? "Enviando..." : "Enviar solicitação"}
            </Button>
          </form>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
