"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type RequestedRole = "client" | "barber" | "shop_admin";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [requestedRole, setRequestedRole] = useState<RequestedRole>("client");
  const [shopId, setShopId] = useState("");
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (requestedRole !== "client") {
      getDocs(collection(db, "barbershops")).then((snap) => {
        setShops(snap.docs.map((d) => ({ id: d.id, name: (d.data() as { name?: string }).name ?? d.id })));
      });
    } else {
      setShopId("");
    }
  }, [requestedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(email, password, name);
      if (requestedRole === "barber" || requestedRole === "shop_admin") {
        if (!shopId) {
          setError("Selecione a barbearia");
          setLoading(false);
          return;
        }
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("Erro ao obter usuário");
        await addDoc(collection(db, "requests"), {
          userId: uid,
          requestedRole,
          shopId,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
        setRequestSent(true);
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha no cadastro");
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (requestSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 py-8 sm:px-8">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-center text-2xl font-bold text-zinc-900">The Barber</h1>
          <div className="rounded-lg bg-green-50 p-4 text-green-800">
            <p className="font-medium">Conta criada com sucesso!</p>
            <p className="mt-2 text-sm">
              Sua solicitação para ser {requestedRole === "barber" ? "barbeiro" : "admin da barbearia"} foi enviada ao administrador.
              Você permanece como cliente até a aprovação.
            </p>
          </div>
          <Link
            href="/"
            className="mt-6 block w-full rounded-lg bg-zinc-900 py-2 text-center font-medium text-white hover:bg-zinc-800"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 py-8 sm:px-8">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-zinc-900">The Barber</h1>
        <h2 className="mb-4 text-center text-lg text-zinc-800">Criar conta</h2>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Eu sou</label>
            <select
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value as RequestedRole)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900"
            >
              <option value="client">Cliente</option>
              <option value="barber">Barbeiro</option>
              <option value="shop_admin">Admin da barbearia</option>
            </select>
          </div>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
            required
          />
          <input
            id="register-email"
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
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-800"
            required
            minLength={6}
          />
          {(requestedRole === "barber" || requestedRole === "shop_admin") && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Barbearia</label>
              <select
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900"
                required
              >
                <option value="">Selecione</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Aguardará aprovação do administrador. Enquanto isso, você usa o app como cliente.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Criando conta..." : "Cadastrar"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-800">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
