"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha no login");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 py-8 sm:px-8">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-zinc-900">The Barber</h1>
        <h2 className="mb-4 text-center text-lg text-zinc-800">Entrar</h2>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
            required
          />
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-800">
          Não tem conta?{" "}
          <Link href="/register" className="font-medium text-zinc-900 underline">
            Cadastrar
          </Link>
        </p>
      </div>
    </div>
  );
}
