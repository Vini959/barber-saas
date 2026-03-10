"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ScheduleCalendar } from "@/components/ui/ScheduleCalendar";
import { todayYMD } from "@/lib/date";
import { getSlots15Min, slotsNeededForDuration } from "@/lib/slots";
import { ArrowLeft } from "lucide-react";

interface BarberService {
  id: string;
  name: string;
  duration: number;
}

interface Barbershop {
  id: string;
  name: string;
  address: string;
}

interface Barber {
  id: string;
  displayName: string;
  shopId: string;
  slotStart?: string;
  slotEnd?: string;
  slotDuration?: number;
  schedule?: Record<string, { start: string; end: string; duration: number } | null>;
  dateOverrides?: Record<string, { start: string; end: string; duration: number } | null>;
  services?: BarberService[];
}

export default function BookPage() {
  const { user } = useAuth();
  const [shops, setShops] = useState<Barbershop[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<BarberService | null>(null);
  const [time, setTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [selectedBarberData, setSelectedBarberData] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const services = useMemo(() => {
    const s = selectedBarberData?.services?.filter((x) => x.name?.trim());
    return s && s.length > 0 ? s : [{ id: "default", name: "Cabelo", duration: 40 }];
  }, [selectedBarberData]);

  useEffect(() => {
    getDocs(collection(db, "barbershops")).then((snap) => {
      setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Barbershop)));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedShop) {
      setBarbers([]);
      setSelectedBarber(null);
      return;
    }
    getDocs(query(collection(db, "barbers"), where("shopId", "==", selectedShop))).then((snap) => {
      setBarbers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Barber)));
      setSelectedBarber(null);
      setSelectedBarberData(null);
    });
  }, [selectedShop]);

  useEffect(() => {
    if (!selectedBarber || !barbers.length) {
      setSelectedBarberData(null);
      return;
    }
    const b = barbers.find((x) => x.id === selectedBarber);
    setSelectedBarberData(b ?? null);
  }, [selectedBarber, barbers]);

  useEffect(() => {
    setSelectedDate(null);
    setTime("");
  }, [selectedBarber]);

  useEffect(() => {
    setSelectedService(services[0] ?? null);
  }, [services]);

  useEffect(() => {
    setTime("");
  }, [selectedDate, selectedService]);

  useEffect(() => {
    if (!selectedBarber || !selectedDate || !selectedBarberData) {
      setBookedSlots(new Set());
      return;
    }
    const slots = getSlots15Min(selectedBarberData, selectedDate);
    getDocs(
      query(
        collection(db, "appointments"),
        where("barberId", "==", selectedBarber),
        where("date", "==", selectedDate)
      )
    )
      .then((snap) => {
        const taken = new Set<string>();
        for (const docSnap of snap.docs) {
          const d = docSnap.data() as {
            time: string;
            status?: string;
            serviceType?: string;
            serviceDuration?: number;
          };
          if (d.status !== "pending" && d.status !== "confirmed") continue;
          const idx = slots.indexOf(d.time);
          if (idx < 0) continue;
          const n =
            d.serviceDuration != null
              ? slotsNeededForDuration(d.serviceDuration)
              : d.serviceType === "cabelo_barba"
                ? 4
                : 3;
          for (let i = 0; i < n && idx + i < slots.length; i++) {
            taken.add(slots[idx + i]);
          }
        }
        setBookedSlots(taken);
      })
      .catch(() => setBookedSlots(new Set()));
  }, [selectedBarber, selectedDate, selectedBarberData]);

  const dayInfo = useMemo(() => {
    if (!selectedBarberData) return undefined;
    return (dateStr: string) => {
      const slots = getSlots15Min(selectedBarberData, dateStr);
      const d = new Date(dateStr + "T12:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      const isPast = d < today;
      return {
        dateStr,
        hasSlots: slots.length > 0 && !isPast,
        isClosed: slots.length === 0,
      };
    };
  }, [selectedBarberData]);

  const handleViewChange = (month: number, year: number) => {
    setViewMonth(month);
    setViewYear(year);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedShop || !selectedBarber || !selectedDate || !time || !selectedService) return;
    setSubmitting(true);
    try {
      const { addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, "appointments"), {
        shopId: selectedShop,
        barberId: selectedBarber,
        clientId: user.uid,
        date: selectedDate,
        time,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceDuration: selectedService.duration,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setDone(true);
    } catch (err) {
      console.error("Book error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const allSlots = selectedBarberData && selectedDate
    ? getSlots15Min(selectedBarberData, selectedDate)
    : [];
  const slotsNeeded = selectedService ? slotsNeededForDuration(selectedService.duration) : 1;
  const availableSlots = allSlots.filter(
    (_, i) =>
      i + slotsNeeded <= allSlots.length &&
      Array.from({ length: slotsNeeded }, (_, j) => allSlots[i + j]).every((s) => !bookedSlots.has(s))
  );
  const minDate = todayYMD();

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

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Agendar</h1>

        {done ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
            <p className="font-medium">Agendamento realizado!</p>
            <Link href="/my-appointments" className="mt-2 inline-block font-semibold underline hover:no-underline">
              Ver meus agendamentos -&gt;
            </Link>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
              <div className="flex-1">
                <Select
                  label="Barbearia"
                  value={selectedShop ?? ""}
                  onChange={(v) => setSelectedShop(v || null)}
                  options={shops.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Selecione"
                  required
                />
              </div>
              <div className="flex-1">
                <Select
                  label="Barbeiro"
                  value={selectedBarber ?? ""}
                  onChange={(v) => setSelectedBarber(v || null)}
                  options={barbers.map((b) => ({ value: b.id, label: b.displayName }))}
                  placeholder="Selecione"
                  required
                  disabled={!selectedShop}
                />
              </div>
            </div>

            {selectedBarber && selectedBarberData && (
              <>
                <Select
                  label="Servico"
                  value={selectedService?.id ?? ""}
                  onChange={(v) => {
                    const s = services.find((x) => x.id === v);
                    setSelectedService(s ?? null);
                  }}
                  options={services.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.duration} min)`,
                  }))}
                />
                <div>
                  <p className="mb-3 text-sm font-medium text-slate-700">Escolha o dia e horario no calendario</p>
                  <ScheduleCalendar
                    viewMonth={viewMonth}
                    viewYear={viewYear}
                    onViewChange={handleViewChange}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    minDate={minDate}
                    dayInfo={dayInfo}
                  />
                </div>

                {selectedDate && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Horario (a cada 15 min)</label>
                    {selectedService && (
                      <p className="mb-2 text-xs text-slate-500">
                        {selectedService.name} - {selectedService.duration} min
                      </p>
                    )}
                    {allSlots.length === 0 ? (
                      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-amber-700">
                        Barbeiro nao atende neste dia
                      </p>
                    ) : (
                      <>
                        <div className="mb-2 flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded bg-emerald-200" /> Disponivel
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded bg-slate-200" /> Ocupado
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                          {allSlots.map((slot) => {
                            const isOccupied = bookedSlots.has(slot);
                            const isAvailable = availableSlots.includes(slot);
                            const isSelected = time === slot;
                            const isUnavailable = !isAvailable; // ocupado ou bloqueado por sobreposicao
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => isAvailable && setTime(slot)}
                                disabled={isUnavailable}
                                className={`
                                  rounded-xl border px-3 py-2.5 text-sm font-medium transition
                                  ${isUnavailable
                                    ? isOccupied
                                      ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400 line-through"
                                      : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                                    : isSelected
                                      ? "cursor-pointer border-slate-900 bg-slate-900 text-white"
                                      : "cursor-pointer border-emerald-200 bg-emerald-50 text-slate-800 hover:border-emerald-300 hover:bg-emerald-100"}
                                `}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    <input type="hidden" name="time" value={time} />
                  </div>
                )}

                <Button type="submit" fullWidth size="lg" variant="primary" disabled={submitting || !time}>
                  {submitting ? "Agendando..." : "Agendar"}
                </Button>
              </>
            )}
          </form>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
