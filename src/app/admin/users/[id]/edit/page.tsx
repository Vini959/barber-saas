"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";

interface Shop {
  id: string;
  name: string;
}

export default function EditUserPage() {
  const params = useParams();
  const id = params.id as string;
  const { profile } = useAuth();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover");
      console.error("Remove barber error:", err);
    } finally {
      setRemovingBarber(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const userRef = doc(db, "users", id);
      const data: Record<string, unknown> = {
        name,
        role,
        updatedAt: new Date().toISOString(),
      };
      if (role === "shop_admin") {
        data.shopId = shopId || null;
      } else {
        data.shopId = null;
      }
      await updateDoc(userRef, data);
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
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
          <header className="mb-8 flex items-center justify-between">
            <Link href="/admin/users" className="text-zinc-800 hover:text-zinc-900">
              ← Voltar
            </Link>
            <SignOutButton />
          </header>

          <h1 className="mb-6 text-2xl font-bold text-zinc-900">Editar usuário</h1>

          {loading ? (
            <p className="text-zinc-600">Carregando...</p>
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
                <label className="mb-1 block text-sm font-medium text-zinc-800">E-mail</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-zinc-600"
                />
                <p className="mt-1 text-xs text-zinc-600">E-mail não pode ser alterado aqui.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-800">Função</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900"
                >
                  <option value="client">Cliente</option>
                  <option value="barber">Barbeiro</option>
                  <option value="shop_admin">Admin da barbearia</option>
                  <option value="platform_admin">Admin</option>
                </select>
              </div>
              {barberIds.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-medium text-zinc-800">Também é barbeiro</p>
                  <p className="mt-1 text-xs text-zinc-600">Este usuário tem cargo de barbeiro. Remover para que deixe de aparecer na lista de barbeiros e perca acesso à agenda.</p>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={removingBarber}
                    className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {removingBarber ? "Removendo..." : "Remover cargo de barbeiro"}
                  </button>
                </div>
              )}
              {role === "shop_admin" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-800">Barbearia</label>
                  <select
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900"
                  >
                    <option value="">Selecione a barbearia</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && (
                <p className="text-sm text-green-600">Usuário atualizado com sucesso.</p>
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

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <p className="font-medium text-zinc-900">Remover cargo de barbeiro?</p>
            <p className="mt-2 text-sm text-zinc-600">
              O usuário deixará de aparecer na lista de barbeiros e perderá acesso à agenda.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRemoveBarber}
                disabled={removingBarber}
                className="flex-1 rounded-lg bg-red-600 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {removingBarber ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
