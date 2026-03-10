"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { ScheduleCalendar } from "@/components/ui/ScheduleCalendar";
import { ArrowLeft, Calendar, Settings } from "lucide-react";

interface Appointment {
  id: string;
  clientId: string;
  date: string;
  time: string;
  status: string;
}

export default function BarberSchedulePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [barberId, setBarberId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    async function load() {
      let barbersSnap = await getDocs(
        query(collection(db, "barbers"), where("userId", "==", uid))
      );
      let b = barbersSnap.docs[0];

      if (!b && profile?.role === "barber" && profile?.shopId) {
        try {
          await addDoc(collection(db, "barbers"), {
            userId: uid,
            shopId: profile.shopId,
            displayName: profile.name ?? "Barbeiro",
            email: profile.email ?? "",
            createdAt: new Date().toISOString(),
          });
          barbersSnap = await getDocs(
            query(collection(db, "barbers"), where("userId", "==", uid))
          );
          b = barbersSnap.docs[0];
        } catch (err) {
          console.error("Erro ao criar perfil de barbeiro:", err);
        }
      }

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
        query(collection(db, "appointments"), where("barberId", "==", b.id))
      );
      const apps = appsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Appointment))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      setAppointments(apps);
      setLoading(false);
    }
    load();
  }, [user, profile]);

  useEffect(() => {
    if (shopName) document.title = `The Barber - ${shopName}`;
  }, [shopName]);

  const dayInfo = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const a of appointments) {
      if (a.status !== "cancelled") {
        byDate[a.date] = (byDate[a.date] ?? 0) + 1;
      }
    }
    return (dateStr: string) => {
      const count = byDate[dateStr];
      if (!count) return null;
      return { dateStr, hasAppointments: true, appointmentCount: count };
    };
  }, [appointments]);

  const handleViewChange = (month: number, year: number) => {
    setViewMonth(month);
    setViewYear(year);
  };

  const handleSelectDate = (dateStr: string) => {
    router.push(`/barber/schedule/${dateStr}`);
  };

  return (
    <ProtectedRoute allowedRoles={["client", "barber", "shop_admin", "platform_admin"]}>
      <PageContainer>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          <Link
            href="/barber/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Settings className="size-4" />
            Meus horários
          </Link>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Minha agenda</h1>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : !barberId ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-slate-600">Você não tem perfil de barbeiro vinculado.</p>
            <p className="mt-1 text-sm text-slate-500">
              Se você solicitou ser barbeiro, aguarde a aprovação do administrador.
            </p>
            <Link href="/" className="mt-4 inline-block">
              <Button variant="outline">Voltar ao início</Button>
            </Link>
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100">
              <Calendar className="size-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-900">Nenhum agendamento</p>
            <p className="mt-2 text-sm text-slate-600">
              Sua agenda está vazia. Os clientes podem agendar quando você definir seus horários.
            </p>
            <Link href="/barber/settings" className="mt-6 inline-block">
              <Button variant="outline">Configurar horários</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">Clique em um dia para ver os agendamentos</p>
              <ScheduleCalendar
                viewMonth={viewMonth}
                viewYear={viewYear}
                onViewChange={handleViewChange}
                selectedDate={null}
                onSelectDate={handleSelectDate}
                dayInfo={dayInfo}
              />
            </div>
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
