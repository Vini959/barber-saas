"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, deleteDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ArrowLeft } from "lucide-react";

interface Shop {
  id: string;
  name: string;
}

export default function EditUserPage() {
  const params = useParams();
  const id = params.id as string;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");
  const [shopId, setShopId] = useState("");
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [barberIds, setBarberIds] = useState<string[]>([]);
  const [removingBarber, setRemovingBarber] = useState(false);
  const [creatingBarber, setCreatingBarber] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    async function load() {
      const userRef = doc(db, "users", id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const d = userSnap.data() as { name?: string; email?: string; role?: string; shopId?: string };
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setRole(d.role ?? "client");
        setShopId(d.shopId ?? "");
      }
      const shopsSnap = await getDocs(collection(db, "barbershops"));
      setShops(shopsSnap.docs.map((d) => ({ id: d.id, name: (d.data() as { name?: string }).name ?? d.id })));
      const barbersSnap = await getDocs(query(collection(db, "barbers"), where("userId", "==", id)));
      setBarberIds(barbersSnap.docs.map((d) => d.id));
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  const handleRemoveBarber = async () => {
    setShowConfirmModal(false);
    if (barberIds.length === 0) return;
    setRemovingBarber(true);
    setError("");
    try {
      for (const bid of barberIds) {
        await deleteDoc(doc(db, "barbers", bid));
      }
      setBarberIds([]);
      if (role === "barber") {
        await updateDoc(doc(db, "users", id), {
          role: "client",
          shopId: null,
          updatedAt: new Date().toISOString(),
        });
        setRole("client");
        setShopId("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover");
      console.error("Remove barber error:", err);
    } finally {
      setRemovingBarber(false);
    }
  };

  const handleCreateBarber = async () => {
    if (!shopId) {
      setError("Selecione uma barbearia para o barbeiro.");
      return;
    }
    setCreatingBarber(true);
    setError("");
    try {
      await addDoc(collection(db, "barbers"), {
        userId: id,
        shopId,
        displayName: name || "Barbeiro",
        email: email || "",
        createdAt: new Date().toISOString(),
      });
      const barbersSnap = await getDocs(query(collection(db, "barbers"), where("userId", "==", id)));
      setBarberIds(barbersSnap.docs.map((d) => d.id));
      await updateDoc(doc(db, "users", id), {
        role: "barber",
        shopId,
        updatedAt: new Date().toISOString(),
      });
      setRole("barber");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar documento de barbeiro");
      console.error("Create barber error:", err);
    } finally {
      setCreatingBarber(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if ((role === "shop_admin" || role === "barber") && !shopId) {
      setError("Selecione uma barbearia para essa funcao.");
      return;
    }
    setSubmitting(true);
    try {
      const userRef = doc(db, "users", id);
      const data: Record<string, unknown> = {
        name,
        role,
        updatedAt: new Date().toISOString(),
      };
      if (role === "shop_admin" || role === "barber") {
        data.shopId = shopId;
      } else {
        data.shopId = null;
      }
      await updateDoc(userRef, data);
      if (role === "barber") {
        if (barberIds.length === 0) {
          const barberRef = await addDoc(collection(db, "barbers"), {
            userId: id,
            shopId,
            displayName: name || "Barbeiro",
            email: email || "",
            createdAt: new Date().toISOString(),
          });
          setBarberIds([barberRef.id]);
        } else {
          await Promise.all(
            barberIds.map((barberId) =>
              updateDoc(doc(db, "barbers", barberId), {
                shopId,
                displayName: name || "Barbeiro",
                email: email || "",
                updatedAt: new Date().toISOString(),
              })
            )
          );
        }
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
      console.error("Edit user error:", err);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <PageContainer>
        <Link
          href="/admin/users"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Editar usuario</h1>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-5">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
            <div>
              <Input label="E-mail" type="email" value={email} disabled />
              <p className="mt-1 text-xs text-slate-500">E-mail nao pode ser alterado.</p>
            </div>
            <Select
              label="Funcao"
              value={role}
              onChange={setRole}
              options={[
                { value: "client", label: "Cliente" },
                { value: "barber", label: "Barbeiro" },
                { value: "shop_admin", label: "Admin da barbearia" },
                { value: "platform_admin", label: "Admin" },
              ]}
              placeholder="Selecione"
            />
            {barberIds.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="font-medium text-slate-800">Tambem e barbeiro</p>
                <p className="mt-1 text-xs text-slate-600">
                  Remover para que deixe de aparecer na lista de barbeiros.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={removingBarber}
                >
                  {removingBarber ? "Removendo..." : "Remover cargo de barbeiro"}
                </Button>
              </div>
            )}
            {(role === "shop_admin" || role === "barber") && (
              <Select
                label="Barbearia"
                value={shopId}
                onChange={setShopId}
                options={shops.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Selecione"
              />
            )}
            {role === "barber" && barberIds.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-emerald-50/50 p-4">
                <p className="font-medium text-slate-800">Documento de barbeiro ausente</p>
                <p className="mt-1 text-xs text-slate-600">
                  O usuario tem funcao de barbeiro mas nao possui documento na colecao barbers. Crie para que apareca na lista e tenha acesso a agenda.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={handleCreateBarber}
                  disabled={creatingBarber || !shopId}
                >
                  {creatingBarber ? "Criando..." : "Criar documento de barbeiro"}
                </Button>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                Usuario atualizado com sucesso.
              </div>
            )}
            <Button type="submit" fullWidth size="lg" variant="primary" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        )}
      </PageContainer>

      <Modal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Remover cargo de barbeiro?"
      >
        <p className="text-sm text-slate-600">
          O usuario deixara de aparecer na lista de barbeiros e perdera acesso a agenda.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setShowConfirmModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            fullWidth
            onClick={handleRemoveBarber}
            disabled={removingBarber}
          >
            {removingBarber ? "Removendo..." : "Remover"}
          </Button>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
