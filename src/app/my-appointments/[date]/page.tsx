"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ArrowLeft, ChevronLeft } from "lucide-react";

interface Appointment {
  id: string;
  shopId: string;
  barberId: string;
  date: string;
  time: string;
  status: string;
  serviceType?: string;
  serviceName?: string;
}

function isValidDate(str: string): boolean {
  const d = new Date(str + "T12:00:00");
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

export default function MyAppointmentsDatePage() {
  const params = useParams();
  const dateStr = params.date as string;
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [shops, setShops] = useState<Record<string, string>>({});
  const [barbers, setBarbers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !dateStr || !isValidDate(dateStr)) {
      setLoading(false);
      return;
    }
    async function load() {
      const snap = await getDocs(
        query(
          collection(db, "appointments"),
          where("clientId", "==", uid),
          where("date", "==", dateStr)
        )
      );
      const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
      setAppointments(apps);

      const shopIds = [...new Set(apps.map((a) => a.shopId))];
      const barberIds = [...new Set(apps.map((a) => a.barberId))];

      const { doc: docRef, getDoc } = await import("firebase/firestore");
      const shopMap: Record<string, string> = {};
      const barberMap: Record<string, string> = {};
      for (const id of shopIds) {
        const s = await getDoc(docRef(db, "barbershops", id));
        if (s.exists()) shopMap[id] = (s.data() as { name?: string })?.name ?? id;
      }
      for (const id of barberIds) {
        const b = await getDoc(docRef(db, "barbers", id));
        if (b.exists()) barberMap[id] = (b.data() as { displayName?: string })?.displayName ?? id;
      }
      setShops(shopMap);
      setBarbers(barberMap);
      setLoading(false);
    }
    load();
  }, [user, dateStr]);

  const handleCancelClick = (appointmentId: string) => {
    setConfirmCancelId(appointmentId);
  };

  const handleCancelConfirm = async () => {
    const appointmentId = confirmCancelId;
    if (!appointmentId) return;
    setCancellingId(appointmentId);
    try {
      await updateDoc(doc(db, "appointments", appointmentId), { status: "cancelled" });
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: "cancelled" } : a))
      );
      setConfirmCancelId(null);
    } catch (err) {
      console.error("Cancel error:", err);
    } finally {
      setCancellingId(null);
    }
  };

  const statusStyles: Record<string, string> = {
    pending: "bg-slate-100 text-slate-700",
    confirmed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
    done: "bg-slate-100 text-slate-600",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    cancelled: "Cancelado",
    done: "Concluído",
  };

  const formattedDate = dateStr ? dateStr.split("-").reverse().join("/") : "";
  const activeAppointments = appointments.filter((a) => a.status !== "cancelled");

  if (!dateStr || !isValidDate(dateStr)) {
    return (
      <ProtectedRoute allowedRoles={["client"]}>
        <PageContainer>
          <Link href="/my-appointments" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          <p className="text-slate-600">Data inválida.</p>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["client"]}>
      <PageContainer>
        <Link
          href="/my-appointments"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="size-4" />
          Voltar ao calendário
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">
          Agendamentos de {formattedDate}
        </h1>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : activeAppointments.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Nenhum agendamento neste dia
          </p>
        ) : (
          <div className="space-y-3">
            {activeAppointments.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{shops[a.shopId] ?? a.shopId}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {barbers[a.barberId] ?? a.barberId} · às {a.time}
                      {(a.serviceName || a.serviceType) && ` · ${a.serviceName ?? (a.serviceType === "cabelo_barba" ? "Cabelo e barba" : "Cabelo")}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${statusStyles[a.status] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {statusLabels[a.status] ?? a.status}
                  </span>
                </div>
                {(a.status === "pending" || a.status === "confirmed") && (
                  <div className="mt-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelClick(a.id)}
                      disabled={cancellingId === a.id}
                    >
                      {cancellingId === a.id ? "Cancelando..." : "Cancelar"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Modal
          open={!!confirmCancelId}
          onClose={() => setConfirmCancelId(null)}
          title="Cancelar agendamento?"
        >
          <p className="text-sm text-slate-600">
            Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setConfirmCancelId(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              fullWidth
              onClick={handleCancelConfirm}
              disabled={cancellingId === confirmCancelId}
            >
              {cancellingId === confirmCancelId ? "Cancelando..." : "Sim, cancelar"}
            </Button>
          </div>
        </Modal>
      </PageContainer>
    </ProtectedRoute>
  );
}
