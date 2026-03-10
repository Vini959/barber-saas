"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { deleteField } from "@firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, CalendarOff, ChevronLeft, StickyNote } from "lucide-react";

type DayConfig = { start: string; end: string; duration: number } | null;

interface Appointment {
  id: string;
  clientId: string;
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

export default function BarberScheduleDatePage() {
  const params = useParams();
  const dateStr = params.date as string;
  const { user } = useAuth();
  const [barberId, setBarberId] = useState<string | null>(null);
  const [barberData, setBarberData] = useState<{ schedule?: Record<string, DayConfig>; dateOverrides?: Record<string, DayConfig> } | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [clientNotes, setClientNotes] = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [dateOverride, setDateOverride] = useState<"default" | "closed" | "custom">("default");
  const [customHours, setCustomHours] = useState({ start: "08:00", end: "18:00" });
  const [savingOverride, setSavingOverride] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !dateStr || !isValidDate(dateStr)) {
      setLoading(false);
      return;
    }
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
      const bData = b.data() as { schedule?: Record<string, DayConfig>; dateOverrides?: Record<string, DayConfig> };
      setBarberData(bData);

      const override = bData.dateOverrides?.[dateStr];
      if (override === null) setDateOverride("closed");
      else if (override && typeof override === "object") {
        setDateOverride("custom");
        setCustomHours({ start: override.start, end: override.end });
      } else setDateOverride("default");

      const appsSnap = await getDocs(
        query(
          collection(db, "appointments"),
          where("barberId", "==", b.id),
          where("date", "==", dateStr)
        )
      );
      const apps = appsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Appointment))
        .sort((a, b) => a.time.localeCompare(b.time));
      setAppointments(apps);

      const clientIds = [...new Set(apps.map((a) => a.clientId))];
      const names: Record<string, string> = {};
      const notes: Record<string, string> = {};
      for (const cid of clientIds) {
        const u = await getDoc(doc(db, "users", cid));
        if (u.exists()) {
          const d = u.data() as { name?: string; email?: string };
          names[cid] = d.name ?? d.email ?? cid;
        } else {
          names[cid] = cid;
        }
        const noteSnap = await getDoc(doc(db, "barbers", b.id, "clientNotes", cid));
        if (noteSnap.exists()) {
          notes[cid] = (noteSnap.data() as { notes?: string }).notes ?? "";
        }
      }
      setClientNames(names);
      setClientNotes(notes);
      setEditingNotes(notes);
      setLoading(false);
    }
    load();
  }, [user, dateStr]);

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

  const saveDateOverride = async () => {
    if (!barberId) return;
    setSavingOverride(true);
    try {
      if (dateOverride === "default") {
        await updateDoc(doc(db, "barbers", barberId), {
          [`dateOverrides.${dateStr}`]: deleteField(),
        });
      } else if (dateOverride === "closed") {
        await updateDoc(doc(db, "barbers", barberId), {
          [`dateOverrides.${dateStr}`]: null,
        });
      } else {
        await updateDoc(doc(db, "barbers", barberId), {
          [`dateOverrides.${dateStr}`]: { ...customHours, duration: 40 },
        });
      }
      const newOverrides = { ...(barberData?.dateOverrides ?? {}) };
      if (dateOverride === "default") delete newOverrides[dateStr];
      else newOverrides[dateStr] = dateOverride === "closed" ? null : { ...customHours, duration: 40 };
      setBarberData((prev) => ({ ...prev, dateOverrides: newOverrides }));
    } catch (err) {
      console.error("Save override error:", err);
    } finally {
      setSavingOverride(false);
    }
  };

  const saveClientNotes = async (clientId: string) => {
    if (!barberId) return;
    setSavingNotes((prev) => ({ ...prev, [clientId]: true }));
    try {
      const notes = editingNotes[clientId]?.trim() ?? "";
      const noteRef = doc(db, "barbers", barberId, "clientNotes", clientId);
      const noteSnap = await getDoc(noteRef);
      const data = { notes, updatedAt: new Date().toISOString() };
      if (noteSnap.exists()) {
        await updateDoc(noteRef, data);
      } else {
        await setDoc(noteRef, data);
      }
      setClientNotes((prev) => ({ ...prev, [clientId]: notes }));
    } catch (err) {
      console.error("Save notes error:", err);
    } finally {
      setSavingNotes((prev) => ({ ...prev, [clientId]: false }));
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

  if (!dateStr || !isValidDate(dateStr)) {
    return (
      <ProtectedRoute allowedRoles={["client", "barber", "shop_admin", "platform_admin"]}>
        <PageContainer>
          <Link href="/barber/schedule" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          <p className="text-slate-600">Data inválida.</p>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["client", "barber", "shop_admin", "platform_admin"]}>
      <PageContainer>
        <Link
          href="/barber/schedule"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="size-4" />
          Voltar ao calendário
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">
          Agendamentos de {formattedDate}
        </h1>

        {!loading && barberId && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CalendarOff className="size-4" />
              Agenda deste dia
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Altere apenas para esta data. O horário padrão da semana permanece nos outros dias.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="dateOverride"
                  checked={dateOverride === "default"}
                  onChange={() => setDateOverride("default")}
                  className="rounded-full border-slate-300"
                />
                <span className="text-sm">Usar horário padrão</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="dateOverride"
                  checked={dateOverride === "closed"}
                  onChange={() => setDateOverride("closed")}
                  className="rounded-full border-slate-300"
                />
                <span className="text-sm">Fechar este dia</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="dateOverride"
                  checked={dateOverride === "custom"}
                  onChange={() => setDateOverride("custom")}
                  className="rounded-full border-slate-300"
                />
                <span className="text-sm">Horário customizado</span>
              </label>
            </div>
            {dateOverride === "custom" && (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">De</label>
                  <input
                    type="time"
                    value={customHours.start}
                    onChange={(e) => setCustomHours((h) => ({ ...h, start: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Até</label>
                  <input
                    type="time"
                    value={customHours.end}
                    onChange={(e) => setCustomHours((h) => ({ ...h, end: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={saveDateOverride}
              disabled={savingOverride}
            >
              {savingOverride ? "Salvando..." : "Aplicar"}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : !barberId ? (
          <p className="text-slate-600">Você não tem perfil de barbeiro vinculado.</p>
        ) : appointments.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Nenhum agendamento neste dia
          </p>
        ) : (
          <div className="space-y-3">
            {appointments.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">às {a.time}</p>
                    <p className="mt-1 text-sm text-slate-600">{clientNames[a.clientId] ?? a.clientId}</p>
                    {(a.serviceName || a.serviceType) && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {a.serviceName ?? (a.serviceType === "cabelo_barba" ? "Cabelo e barba" : "Cabelo")}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${statusStyles[a.status] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {statusLabels[a.status] ?? a.status}
                  </span>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <StickyNote className="size-3.5" />
                    Anotações sobre o cliente
                  </label>
                  <textarea
                    value={editingNotes[a.clientId] ?? ""}
                    onChange={(e) => setEditingNotes((prev) => ({ ...prev, [a.clientId]: e.target.value }))}
                    onBlur={() => {
                      const current = editingNotes[a.clientId] ?? "";
                      const saved = clientNotes[a.clientId] ?? "";
                      if (current !== saved) saveClientNotes(a.clientId);
                    }}
                    placeholder="Ex: não gosta de navalha, prefere cabelo curto..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {(editingNotes[a.clientId] ?? "") !== (clientNotes[a.clientId] ?? "") && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => saveClientNotes(a.clientId)}
                      disabled={savingNotes[a.clientId]}
                    >
                      {savingNotes[a.clientId] ? "Salvando..." : "Salvar anotações"}
                    </Button>
                  )}
                </div>
                {a.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => updateStatus(a.id, "confirmed")}
                    >
                      Confirmar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateStatus(a.id, "cancelled")}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
