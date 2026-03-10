"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { DAY_NAMES } from "@/lib/slots";
import { ArrowLeft } from "lucide-react";

type DayConfig = { start: string; end: string; duration: number } | null;

export interface BarberService {
  id: string;
  name: string;
  duration: number;
}

const DEFAULT_DAY: { start: string; end: string; duration: number } = {
  start: "08:00",
  end: "18:00",
  duration: 15,
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function BarberSettingsPage() {
  const { user, profile } = useAuth();
  const [barberId, setBarberId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [services, setServices] = useState<BarberService[]>([]);
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
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let snap = await getDocs(
        query(collection(db, "barbers"), where("userId", "==", user.uid))
      );
      let b = snap.docs[0];

      if (!b && profile?.role === "barber" && profile?.shopId) {
        try {
          await addDoc(collection(db, "barbers"), {
            userId: user.uid,
            shopId: profile.shopId,
            displayName: profile.name ?? "Barbeiro",
            email: profile.email ?? "",
            createdAt: new Date().toISOString(),
          });
          snap = await getDocs(
            query(collection(db, "barbers"), where("userId", "==", user.uid))
          );
          b = snap.docs[0];
        } catch (err) {
          console.error("Erro ao criar perfil de barbeiro:", err);
        }
      }

      if (b) {
        setBarberId(b.id);
        const d = b.data() as {
          schedule?: Record<string, DayConfig>;
          slotStart?: string;
          slotEnd?: string;
          slotDuration?: number;
          shopId?: string;
          services?: BarberService[];
        };
        if (d.shopId) {
          const shopSnap = await getDoc(doc(db, "barbershops", d.shopId));
          if (shopSnap.exists()) setShopName((shopSnap.data() as { name?: string }).name ?? null);
        }
        if (d.schedule) {
          const merged: Record<string, DayConfig> = {};
          for (let i = 0; i < 7; i++) {
            const k = String(i);
            const val = d.schedule![k];
            merged[k] = val === undefined ? { ...DEFAULT_DAY } : val;
          }
          setSchedule(merged);
        } else if (d.slotStart || d.slotEnd || d.slotDuration !== undefined) {
          const day: DayConfig = {
            start: d.slotStart ?? DEFAULT_DAY.start,
            end: d.slotEnd ?? DEFAULT_DAY.end,
            duration: d.slotDuration ?? DEFAULT_DAY.duration,
          };
          const merged: Record<string, DayConfig> = {};
          for (let i = 0; i < 7; i++) merged[String(i)] = { ...day };
          setSchedule(merged);
        }
        if (d.services && Array.isArray(d.services)) {
          const valid = d.services.filter((s: BarberService) => s.name?.trim());
          setServices(valid.length > 0 ? valid : [
            { id: generateId(), name: "Cabelo", duration: 40 },
            { id: generateId(), name: "Cabelo e barba", duration: 60 },
          ]);
        } else {
          setServices([
            { id: generateId(), name: "Cabelo", duration: 40 },
            { id: generateId(), name: "Cabelo e barba", duration: 60 },
          ]);
        }
      }
      setLoading(false);
    })();
  }, [user, profile]);

  useEffect(() => {
    if (shopName) document.title = `The Barber - ${shopName}`;
  }, [shopName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberId) return;
    setSaveMessage(null);
    setSaving(true);
    try {
      const validServices = services.filter((s) => s.name.trim()).map((s) => ({
        ...s,
        name: s.name.trim(),
        duration: (s.duration >= 15 && s.duration <= 120) ? s.duration : 30,
      }));
      if (validServices.length === 0) {
        setSaveMessage({ type: "error", text: "Adicione pelo menos um serviço com nome." });
        setSaving(false);
        return;
      }
      await updateDoc(doc(db, "barbers", barberId), { schedule, services: validServices });
      setSaveMessage({ type: "success", text: "Horários salvos com sucesso." });
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.error("Save error:", err);
      setSaveMessage({ type: "error", text: "Erro ao salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  const setDay = (dayKey: string, value: DayConfig) => {
    setSchedule((prev) => ({ ...prev, [dayKey]: value }));
  };

  const addService = () => {
    setServices((prev) => [...prev, { id: generateId(), name: "", duration: 30 }]);
  };

  const updateService = (id: string, updates: Partial<BarberService>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const inputClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

  return (
    <ProtectedRoute allowedRoles={["client", "barber", "shop_admin", "platform_admin"]}>
      <PageContainer>
        <Link
          href="/barber/schedule"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Meus horários</h1>

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
        ) : (
          <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-8">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Serviços</h2>
              <p className="mb-4 text-sm text-slate-600">
                Cadastre os procedimentos que você oferece. O cliente escolherá ao agendar.
              </p>
              <div className="space-y-3">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => updateService(s.id, { name: e.target.value })}
                      placeholder="Nome do serviço"
                      className={`flex-1 min-w-[8rem] ${inputClass}`}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={15}
                        max={120}
                        step={5}
                        value={s.duration === 0 ? "" : s.duration}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            updateService(s.id, { duration: 0 });
                          } else {
                            const num = Number(val);
                            updateService(s.id, { duration: Number.isNaN(num) ? 0 : num });
                          }
                        }}
                        onBlur={(e) => {
                          const num = Number(e.target.value);
                          if (e.target.value === "" || Number.isNaN(num) || num < 15 || num > 120) {
                            updateService(s.id, { duration: 30 });
                          }
                        }}
                        className={`w-20 ${inputClass}`}
                      />
                      <span className="text-sm text-slate-500">min</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeService(s.id)}
                      disabled={services.length <= 1}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addService}>
                  + Adicionar serviço
                </Button>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Horários por dia</h2>
              <p className="mb-4 text-sm text-slate-600">
                Configure por dia da semana. Marque &quot;Fechado&quot; para dias sem atendimento. Os horários são em intervalos de 15 min.
              </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[28rem] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Dia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Fechado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">De</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Até</th>
                  </tr>
                </thead>
                <tbody>
                  {DAY_NAMES.map((name, i) => {
                    const k = String(i);
                    const dayConfig = schedule[k];
                    const isClosed = dayConfig === null;
                    return (
                      <tr
                        key={k}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">{name}</td>
                        <td className="px-4 py-3">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isClosed}
                              onChange={(e) => setDay(k, e.target.checked ? null : { ...DEFAULT_DAY })}
                              className="rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-600">Fechado</span>
                          </label>
                        </td>
                        {!isClosed ? (
                          <>
                            <td className="px-4 py-3">
                              <input
                                type="time"
                                value={(dayConfig ?? DEFAULT_DAY).start}
                                onChange={(e) =>
                                  setDay(k, { ...(dayConfig ?? DEFAULT_DAY), start: e.target.value } as DayConfig)
                                }
                                className={inputClass}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="time"
                                value={(dayConfig ?? DEFAULT_DAY).end}
                                onChange={(e) =>
                                  setDay(k, { ...(dayConfig ?? DEFAULT_DAY), end: e.target.value } as DayConfig)
                                }
                                className={inputClass}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-sm text-slate-400">—</td>
                            <td className="px-4 py-3 text-sm text-slate-400">—</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
            {saveMessage && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  saveMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {saveMessage.text}
              </div>
            )}
            <Button type="submit" fullWidth size="lg" variant="primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
