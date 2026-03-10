"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { ScheduleCalendar } from "@/components/ui/ScheduleCalendar";
import { ArrowLeft } from "lucide-react";

interface Appointment {
  id: string;
  shopId: string;
  barberId: string;
  date: string;
  time: string;
  status: string;
}

export default function MyAppointmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    async function load() {
      const snap = await getDocs(
        query(collection(db, "appointments"), where("clientId", "==", uid))
      );
      const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
      setAppointments(apps);
      setLoading(false);
    }
    load();
  }, [user]);

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
    router.push(`/my-appointments/${dateStr}`);
  };

  return (
    <ProtectedRoute allowedRoles={["client"]}>
      <PageContainer>
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Meus agendamentos</h1>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : appointments.filter((a) => a.status !== "cancelled").length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-600">Nenhum agendamento ainda.</p>
            <Link href="/book" className="mt-4 inline-block">
              <Button variant="primary">Agendar</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">Clique em um dia para ver seus agendamentos</p>
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
