"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const { profile, updateProfileName } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed === profile?.name) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateProfileName(trimmed);
      setMessage({ type: "success", text: "Nome atualizado com sucesso." });
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage({ type: "error", text: "Erro ao atualizar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <PageContainer>
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Meu perfil</h1>

        <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-5">
          <Input
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            required
          />
          {profile?.email && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500">E-mail nao pode ser alterado.</p>
            </div>
          )}
          {message && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}
          <Button type="submit" fullWidth size="lg" variant="primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </PageContainer>
    </ProtectedRoute>
  );
}
