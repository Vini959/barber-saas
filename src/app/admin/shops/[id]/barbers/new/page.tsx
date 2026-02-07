"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";
import { DAY_NAMES } from "@/lib/slots";

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
      setError(err instanceof Error ? err.message : "Failed");
      console.error("Create barber error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["platform_admin", "shop_admin"]}>
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
        <header className="mb-8 flex items-center justify-between">
          <Link
            href={`/admin/shops/${shopId}`}
            className="text-zinc-800 hover:text-zinc-900"
          >
            ← Voltar
          </Link>
          <SignOutButton />
        </header>

        <h1 className="mb-6 text-2xl font-bold">Adicionar barbeiro</h1>

        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4">
          <input
            type="text"
            placeholder="Nome"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
            required
          />
          <input
            type="email"
            autoComplete="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
            required
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
            required
            minLength={6}
          />
          <input
            type="text"
            placeholder="Chave Pix (opcional)"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
          />
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-2 text-sm font-medium text-zinc-700">Horários por dia</p>
            <p className="mb-3 text-xs text-zinc-500">De que hora até que hora pode agendar. Marque &quot;Fechado&quot; para dias sem atendimento.</p>
            <div className="space-y-2">
              {DAY_NAMES.map((name, i) => {
                const k = String(i);
                const dayConfig = schedule[k];
                const isClosed = dayConfig === null;
                return (
                  <div key={k} className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 bg-white p-2">
                    <div className="w-10 text-sm font-medium text-zinc-800">{name}</div>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={isClosed}
                        onChange={(e) =>
                          setDay(k, e.target.checked ? null : { ...DEFAULT_DAY })
                        }
                        className="rounded"
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
                          className="rounded border border-zinc-300 px-2 py-1 text-sm"
                        />
                        <span className="text-zinc-400">–</span>
                        <input
                          type="time"
                          value={(dayConfig ?? DEFAULT_DAY).end}
                          onChange={(e) =>
                            setDay(k, { ...(dayConfig ?? DEFAULT_DAY), end: e.target.value } as DayConfig)
                          }
                          className="rounded border border-zinc-300 px-2 py-1 text-sm"
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
                          className="w-14 rounded border border-zinc-300 px-2 py-1 text-sm"
                          title="Duração (min)"
                        />
                        <span className="text-xs text-zinc-500">min</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar barbeiro"}
          </button>
        </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
