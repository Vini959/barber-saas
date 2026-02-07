"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";

interface Appointment {
  id: string;
  clientId: string;
  date: string;
  time: string;
  status: string;
}

interface BarberDoc {
  id: string;
  shopId: string;
}

export default function BarberSchedulePage() {
  const { user, profile } = useAuth();
  const [barberId, setBarberId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    async function load() {
      const barbersSnap = await getDocs(
        query(collection(db, "barbers"), where("userId", "==", uid))
      );
      const b = barbersSnap.docs[0];
      if (!b) {
        setLoading(false);
        return;
      }
      setBarberId(b.id);
      const barberData = b.data() as { shopId?: string };
      if (barberData.shopId) {
        const shopSnap = await getDoc(doc(db, "barbershops", barberData.shopId));
        if (shopSnap.exists()) {
          setShopName((shopSnap.data() as { name?: string }).name ?? null);
        }
      }

      const appsSnap = await getDocs(
        query(
          collection(db, "appointments"),
          where("barberId", "==", b.id)
        )
      );
      const apps = appsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Appointment))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      setAppointments(apps);

      const clientIds = [...new Set(apps.map((a) => a.clientId))];
      const names: Record<string, string> = {};
      for (const cid of clientIds) {
        const u = await getDoc(doc(db, "users", cid));
        if (u.exists()) {
          const d = u.data() as { name?: string; email?: string };
          names[cid] = d.name ?? d.email ?? cid;
        } else {
          names[cid] = cid;
        }
      }
      setClientNames(names);
      setLoading(false);
    }
    load();
  }, [user, profile]);

  useEffect(() => {
    if (shopName) document.title = `The Barber - ${shopName}`;
  }, [shopName]);

  const updateStatus = async (appointmentId: string, status: string) => {
    try {
      await updateDoc(doc(db, "appointments", appointmentId), { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status } : a))
      );
    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["client", "barber", "shop_admin", "platform_admin"]}>
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-800 hover:text-zinc-900">
              ← Voltar
            </Link>
            <h1 className="text-xl font-bold text-zinc-900">
              The Barber{shopName ? ` - ${shopName}` : ""}
            </h1>
          </div>
          <div className="flex gap-4">
            <Link href="/barber/settings" className="text-zinc-800 hover:text-zinc-900">
              Meus horários
            </Link>
            <SignOutButton />
          </div>
        </header>

        <h1 className="mb-6 text-2xl font-bold text-zinc-900">Minha agenda</h1>

        {loading ? (
          <p className="text-zinc-600">Carregando...</p>
        ) : !barberId ? (
          <p className="text-zinc-600">Perfil de barbeiro não encontrado.</p>
        ) : (
          <div className="space-y-4">
            {appointments.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-zinc-300 bg-white p-4"
              >
                <p className="font-medium">
                  {a.date} às {a.time}
                </p>
                <p className="text-sm text-zinc-600">{clientNames[a.clientId] ?? a.clientId}</p>
                <span
                  className={`mt-2 inline-block rounded px-2 py-1 text-xs ${
                    a.status === "confirmed"
                      ? "bg-green-100 text-green-800"
                      : a.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  {a.status === "pending" && "Pendente"}
                  {a.status === "confirmed" && "Confirmado"}
                  {a.status === "cancelled" && "Cancelado"}
                  {a.status === "done" && "Concluído"}
                  {!["pending", "confirmed", "cancelled", "done"].includes(a.status) && a.status}
                </span>
                {a.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateStatus(a.id, "confirmed")}
                      className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(a.id, "cancelled")}
                      className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
