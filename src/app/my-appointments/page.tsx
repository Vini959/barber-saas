"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";

interface Appointment {
  id: string;
  shopId: string;
  barberId: string;
  date: string;
  time: string;
  status: string;
}

interface ShopMap {
  [id: string]: string;
}

interface BarberMap {
  [id: string]: string;
}

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [shops, setShops] = useState<ShopMap>({});
  const [barbers, setBarbers] = useState<BarberMap>({});
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (appointmentId: string) => {
    setCancellingId(appointmentId);
    try {
      await updateDoc(doc(db, "appointments", appointmentId), { status: "cancelled" });
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: "cancelled" } : a))
      );
    } catch (err) {
      console.error("Cancel error:", err);
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    async function load() {
      const snap = await getDocs(
        query(collection(db, "appointments"), where("clientId", "==", uid))
      );
      const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
      setAppointments(apps);

      const shopIds = [...new Set(apps.map((a) => a.shopId))];
      const barberIds = [...new Set(apps.map((a) => a.barberId))];

      const { doc, getDoc } = await import("firebase/firestore");
      const shopMap: ShopMap = {};
      const barberMap: BarberMap = {};
      for (const id of shopIds) {
        const s = await getDoc(doc(db, "barbershops", id));
        if (s.exists()) shopMap[id] = (s.data() as { name?: string })?.name ?? id;
      }
      for (const id of barberIds) {
        const b = await getDoc(doc(db, "barbers", id));
        if (b.exists()) barberMap[id] = (b.data() as { displayName?: string })?.displayName ?? id;
      }
      setShops(shopMap);
      setBarbers(barberMap);
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <ProtectedRoute allowedRoles={["client", "barber", "shop_admin"]}>
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-zinc-800 hover:text-zinc-900">
            ← Voltar
          </Link>
          <SignOutButton />
        </header>

        <h1 className="mb-6 text-2xl font-bold text-zinc-900">Meus agendamentos</h1>

        {loading ? (
          <p className="text-zinc-600">Carregando...</p>
        ) : appointments.length === 0 ? (
          <p className="text-zinc-600">Nenhum agendamento ainda.</p>
        ) : (
          <div className="space-y-4">
            {appointments.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-zinc-300 bg-white p-4"
              >
                <p className="font-medium">{shops[a.shopId] ?? a.shopId}</p>
                <p className="text-sm text-zinc-800">
                  {barbers[a.barberId] ?? a.barberId} • {a.date} {a.time}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block rounded px-2 py-1 text-xs ${
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
                  {(a.status === "pending" || a.status === "confirmed") && (
                    <button
                      type="button"
                      onClick={() => handleCancel(a.id)}
                      disabled={cancellingId === a.id}
                      className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {cancellingId === a.id ? "Cancelando..." : "Cancelar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
