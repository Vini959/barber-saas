"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";
import { getSlotsForDate } from "@/lib/slots";

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
}

export default function BookPage() {
  const { user } = useAuth();
  const [shops, setShops] = useState<Barbershop[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [selectedBarberData, setSelectedBarberData] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
    getDocs(
      query(collection(db, "barbers"), where("shopId", "==", selectedShop))
    ).then((snap) => {
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

  // Clear time when barber or date changes
  useEffect(() => {
    setTime("");
  }, [selectedBarber, date]);

  // Fetch booked slots when barber + date are selected
  useEffect(() => {
    if (!selectedBarber || !date) {
      setBookedSlots(new Set());
      return;
    }
    getDocs(
      query(
        collection(db, "appointments"),
        where("barberId", "==", selectedBarber),
        where("date", "==", date)
      )
    ).then((snap) => {
      const taken = new Set<string>(
        snap.docs
          .filter((d) => {
            const s = (d.data() as { status?: string }).status;
            return s === "pending" || s === "confirmed";
          })
          .map((d) => (d.data() as { time: string }).time)
      );
      setBookedSlots(taken);
    }).catch((err) => {
      console.error("Failed to load booked slots:", err);
      setBookedSlots(new Set());
    });
  }, [selectedBarber, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedShop || !selectedBarber || !date || !time) return;
    setSubmitting(true);
    try {
      const { addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, "appointments"), {
        shopId: selectedShop,
        barberId: selectedBarber,
        clientId: user.uid,
        date,
        time,
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

        <h1 className="mb-6 text-2xl font-bold text-zinc-900">Agendar</h1>

        {done ? (
          <div className="rounded-lg bg-green-100 p-4 text-green-800">
            Agendamento realizado. <Link href="/my-appointments" className="underline">Ver meus agendamentos</Link>
          </div>
        ) : loading ? (
          <p className="text-zinc-600">Carregando...</p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Barbearia</label>
              <select
                value={selectedShop ?? ""}
                onChange={(e) => setSelectedShop(e.target.value || null)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
                required
              >
                <option value="">Selecione</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Barbeiro</label>
              <select
                value={selectedBarber ?? ""}
                onChange={(e) => setSelectedBarber(e.target.value || null)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
                required
                disabled={!selectedShop}
              >
                <option value="">Selecione</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800">Horário</label>
              <p className="mb-3 text-xs text-zinc-500">Escolha um horário (slots conforme duração do barbeiro)</p>
              {(() => {
                const slots = getSlotsForDate(selectedBarberData, date);
                return (
              <>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {slots.map((slot) => {
                  const isBooked = bookedSlots.has(slot);
                  const isSelected = time === slot;
                  const isDisabled = !selectedBarber || !date || isBooked;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setTime(slot)}
                      className={`
                        rounded-lg border px-3 py-2.5 text-sm font-medium transition
                        ${isSelected
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : isBooked
                            ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 line-through"
                            : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 hover:bg-zinc-50"
                        }
                      `}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
              {!selectedBarber || !date ? (
                <p className="mt-2 text-xs text-zinc-500">Selecione barbeiro e data para ver horários</p>
              ) : slots.length === 0 ? (
                <p className="mt-2 text-sm text-amber-700">Barbeiro não atende neste dia</p>
              ) : null}
              <input type="hidden" name="time" value={time} />
              </>
                );
              })()}
            </div>

            <button
              type="submit"
              disabled={submitting || !time}
              className="w-full rounded-lg bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "Agendando..." : "Agendar"}
            </button>
          </form>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
