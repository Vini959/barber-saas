"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";
import { DAY_NAMES } from "@/lib/slots";

type DayConfig = { start: string; end: string; duration: number } | null;

const DEFAULT_DAY: { start: string; end: string; duration: number } = {
  start: "08:00",
  end: "18:00",
  duration: 40,
};

export default function BarberSettingsPage() {
  const { user } = useAuth();
  const [barberId, setBarberId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Record<string, DayConfig>>({
    "0": { ...DEFAULT_DAY },
    "1": { ...DEFAULT_DAY },
    "2": { ...DEFAULT_DAY },
    "3": { ...DEFAULT_DAY },
    "4": { ...DEFAULT_DAY },
    "5": { ...DEFAULT_DAY },
    "6": { ...DEFAULT_DAY },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDocs(
        query(collection(db, "barbers"), where("userId", "==", user.uid))
      );
      const b = snap.docs[0];
      if (b) {
        setBarberId(b.id);
        const d = b.data() as { schedule?: Record<string, DayConfig>; slotStart?: string; slotEnd?: string; slotDuration?: number; shopId?: string };
        if (d.shopId) {
          const shopSnap = await getDoc(doc(db, "barbershops", d.shopId));
          if (shopSnap.exists()) setShopName((shopSnap.data() as { name?: string }).name ?? null);
        }
        if (d.schedule) {
          const merged: Record<string, DayConfig> = {};
          for (let i = 0; i < 7; i++) {
            const k = String(i);
            const v = d.schedule![k];
            merged[k] = v !== undefined ? v : { ...DEFAULT_DAY };
          }
          setSchedule(merged);
        } else if (d.slotStart || d.slotEnd || d.slotDuration !== undefined) {
          const day: DayConfig = {
            start: d.slotStart ?? DEFAULT_DAY.start,
            end: d.slotEnd ?? DEFAULT_DAY.end,
            duration: d.slotDuration ?? DEFAULT_DAY.duration,
          };
          const merged: Record<string, DayConfig> = {};
          for (let i = 0; i < 7; i++) {
            merged[String(i)] = { ...day };
          }
          setSchedule(merged);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (shopName) document.title = `The Barber - ${shopName}`;
  }, [shopName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "barbers", barberId), { schedule });
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const setDay = (dayKey: string, value: DayConfig) => {
    setSchedule((prev) => ({ ...prev, [dayKey]: value }));
  };

  return (
    <ProtectedRoute allowedRoles={["client", "barber", "shop_admin", "platform_admin"]}>
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
          <header className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/barber/schedule" className="text-zinc-800 hover:text-zinc-900">
                ← Voltar
              </Link>
              <h1 className="text-xl font-bold text-zinc-900">
                The Barber{shopName ? ` - ${shopName}` : ""}
              </h1>
            </div>
            <SignOutButton />
          </header>

          <h2 className="mb-6 text-2xl font-bold text-zinc-900">Meus horários</h2>

          {loading ? (
            <p className="text-zinc-600">Carregando...</p>
          ) : !barberId ? (
            <p className="text-zinc-600">Barbeiro não encontrado.</p>
          ) : (
            <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-4">
              <p className="text-sm text-zinc-600">Configure por dia da semana. Marque &quot;Fechado&quot; para dias sem atendimento.</p>
              <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
                {DAY_NAMES.map((name, i) => {
                  const k = String(i);
                  const dayConfig = schedule[k];
                  const isClosed = dayConfig === null;
                  return (
                    <div key={k} className="flex flex-wrap items-end gap-3 rounded border border-zinc-100 p-3">
                      <div className="w-12 font-medium text-zinc-800">{name}</div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isClosed}
                          onChange={(e) =>
                            setDay(k, e.target.checked ? null : { ...DEFAULT_DAY })
                          }
                          className="rounded"
                        />
                        <span className="text-sm text-zinc-600">Fechado</span>
                      </label>
                      {!isClosed && (
                        <>
                          <div>
                            <label className="text-xs text-zinc-500">De</label>
                            <input
                              type="time"
                              value={(dayConfig ?? DEFAULT_DAY).start}
                              onChange={(e) =>
                                setDay(k, { ...(dayConfig ?? DEFAULT_DAY), start: e.target.value } as DayConfig)
                              }
                              className="ml-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500">Até</label>
                            <input
                              type="time"
                              value={(dayConfig ?? DEFAULT_DAY).end}
                              onChange={(e) =>
                                setDay(k, { ...(dayConfig ?? DEFAULT_DAY), end: e.target.value } as DayConfig)
                              }
                              className="ml-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500">Duração (min)</label>
                            <input
                              type="number"
                              min={15}
                              max={120}
                              step={5}
                              value={(dayConfig ?? DEFAULT_DAY).duration}
                              onChange={(e) =>
                                setDay(k, {
                                  ...(dayConfig ?? DEFAULT_DAY),
                                  duration: Number(e.target.value) || 40,
                                } as DayConfig)
                              }
                              className="ml-1 w-16 rounded border border-zinc-300 px-2 py-1 text-sm"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </form>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
