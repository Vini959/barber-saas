"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-errors";
import { User, Mail, Lock } from "lucide-react";

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
      await signUp(email.trim(), password, name.trim());
      if (requestedRole === "barber" || requestedRole === "shop_admin") {
        if (!shopId) {
          setError("Selecione a barbearia");
          setLoading(false);
          return;
        }
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("Erro ao obter usuario");
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
      setError(getFirebaseAuthErrorMessage(err, "Falha no cadastro."));
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (requestSent) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex justify-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                OK
              </div>
            </div>
            <h1 className="text-center text-xl font-bold text-slate-900">Conta criada!</h1>
            <p className="mt-3 text-center text-slate-600">
              Sua solicitacao para ser {requestedRole === "barber" ? "barbeiro" : "admin da barbearia"} foi enviada.
              Voce permanece como cliente ate a aprovacao.
            </p>
            <Link href="/" className="mt-6 block">
              <Button fullWidth size="lg" variant="primary">
                Ir para o inicio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
          <p className="mt-2 text-slate-600">Preencha os dados para comecar</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            <Select
              label="Eu sou"
              value={requestedRole}
              onChange={(v) => setRequestedRole(v as RequestedRole)}
              options={[
                { value: "client", label: "Cliente" },
                { value: "barber", label: "Barbeiro" },
                { value: "shop_admin", label: "Admin da barbearia" },
              ]}
              placeholder="Selecione"
            />

            <Input
              label="Nome"
              type="text"
              autoComplete="name"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User className="size-5" />}
              required
            />
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="size-5" />}
              required
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="new-password"
              placeholder="Minimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="size-5" />}
              required
              minLength={6}
            />

            {(requestedRole === "barber" || requestedRole === "shop_admin") && (
              <Select
                label="Barbearia"
                value={shopId}
                onChange={setShopId}
                options={shops.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Selecione"
                required
                hint="Aguardara aprovacao do administrador."
              />
            )}

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" fullWidth size="lg" variant="primary" disabled={loading}>
              {loading ? "Criando conta..." : "Cadastrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Ja tem conta? {" "}
            <Link href="/login" className="font-semibold text-slate-900 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}