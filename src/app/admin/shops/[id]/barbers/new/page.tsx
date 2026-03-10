"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DAY_NAMES } from "@/lib/slots";
import { ArrowLeft } from "lucide-react";

type DayConfig = { start: string; end: string; duration: number } | null;

const DEFAULT_DAY = { start: "08:00", end: "18:00", duration: 40 };

const defaultSchedule: Record<string, DayConfig> = {
  "0": { ...DEFAULT_DAY },
  "1": { ...DEFAULT_DAY },
  "2": { ...DEFAULT_DAY },
  "3": { ...DEFAULT_DAY },
  "4": { ...DEFAULT_DAY },
  "5": { ...DEFAULT_DAY },
  "6": { ...DEFAULT_DAY },
};

export default function NewBarberPage() {
  const params = useParams();
  const shopId = params.id as string;
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [schedule, setSchedule] = useState<Record<string, DayConfig>>(defaultSchedule);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setDay = (dayKey: string, value: DayConfig) => {
    setSchedule((prev) => ({ ...prev, [dayKey]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = user ? await user.getIdToken() : null;
      const res = await fetch("/api/barbers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email,
          password,
          displayName,
          shopId,
          pixKey: pixKey.trim() || undefined,
          schedule,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create barber");
      window.location.href = `/admin/shops/${shopId}`;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao criar");
      console.error("Create barber error:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

  return (
    <ProtectedRoute allowedRoles={["platform_admin", "shop_admin"]}>
      <PageContainer>
        <Link
          href={`/admin/shops/${shopId}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Adicionar barbeiro</h1>

        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5">
          <Input
            label="Nome"
            placeholder="Nome do barbeiro"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <Input
            label="Chave Pix (opcional)"
            placeholder="CPF, e-mail ou chave aleatória"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
            <p className="mb-3 text-sm font-medium text-slate-700">Horários por dia</p>
            <p className="mb-4 text-xs text-slate-500">
              Marque &quot;Fechado&quot; para dias sem atendimento.
            </p>
            <div className="space-y-3">
              {DAY_NAMES.map((name, i) => {
                const k = String(i);
                const dayConfig = schedule[k];
                const isClosed = dayConfig === null;
                return (
                  <div
                    key={k}
                    className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="w-10 text-sm font-medium text-slate-800">{name}</div>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={isClosed}
                        onChange={(e) => setDay(k, e.target.checked ? null : { ...DEFAULT_DAY })}
                        className="rounded border-slate-300"
                      />
                      Fechado
                    </label>
                    {!isClosed && (
                      <>
                        <input
                          type="time"
                          value={(dayConfig ?? DEFAULT_DAY).start}
                          onChange={(e) =>
                            setDay(k, { ...(dayConfig ?? DEFAULT_DAY), start: e.target.value } as DayConfig)
                          }
                          className={inputClass}
                        />
                        <span className="text-slate-400">–</span>
                        <input
                          type="time"
                          value={(dayConfig ?? DEFAULT_DAY).end}
                          onChange={(e) =>
                            setDay(k, { ...(dayConfig ?? DEFAULT_DAY), end: e.target.value } as DayConfig)
                          }
                          className={inputClass}
                        />
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
                          className={`w-14 ${inputClass}`}
                          title="Duração (min)"
                        />
                        <span className="text-xs text-slate-500">min</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          <Button type="submit" fullWidth size="lg" variant="primary" disabled={loading}>
            {loading ? "Criando..." : "Criar barbeiro"}
          </Button>
        </form>
      </PageContainer>
    </ProtectedRoute>
  );
}
