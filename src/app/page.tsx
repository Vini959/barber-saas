"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { SignOutButton } from "@/components/SignOutButton";
import { reload } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function HomePage() {
  const { user, profile, loading, sendVerificationEmail } = useAuth();
  const [resendMsg, setResendMsg] = useState("");
  const [resending, setResending] = useState(false);
  const [dismissedEmailAlert, setDismissedEmailAlert] = useState(false);
  const [isAlsoBarber, setIsAlsoBarber] = useState(false);
  const [shopName, setShopName] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<{ role: string; shopName: string } | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "barbers"), where("userId", "==", user.uid)))
      .then(async (snap) => {
        const hasBarber = snap.docs.length > 0;
        setIsAlsoBarber(hasBarber);
        if (hasBarber) {
          const b = snap.docs[0];
          const shopId = (b.data() as { shopId?: string }).shopId;
          if (shopId) {
            const shopSnap = await getDoc(doc(db, "barbershops", shopId));
            if (shopSnap.exists()) setShopName((shopSnap.data() as { name?: string }).name ?? null);
          }
        }
        const reqSnap = await getDocs(
          query(collection(db, "requests"), where("userId", "==", user.uid), where("status", "==", "pending"))
        );
        if (reqSnap.docs.length > 0) {
          const r = reqSnap.docs[0].data() as { requestedRole?: string; shopId?: string };
          const shopSnap = r.shopId ? await getDoc(doc(db, "barbershops", r.shopId)) : null;
          const s = shopSnap?.exists() ? (shopSnap.data() as { name?: string }).name : r.shopId;
          setPendingRequest({
            role: r.requestedRole === "barber" ? "barbeiro" : "admin da barbearia",
            shopName: s ?? "",
          });
        } else {
          setPendingRequest(null);
        }
      })
      .catch(() => setIsAlsoBarber(false));
  }, [user]);

  useEffect(() => {
    if (profile?.role !== "platform_admin") return;
    getDocs(query(collection(db, "requests"), where("status", "==", "pending")))
      .then((snap) => setPendingRequestsCount(snap.docs.length))
      .catch(() => setPendingRequestsCount(0));
  }, [profile?.role]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600">Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  const handleResendVerification = async () => {
    setResending(true);
    setResendMsg("");
    try {
      await sendVerificationEmail();
      setResendMsg("E-mail enviado. Verifique sua caixa de entrada.");
    } catch (err) {
      setResendMsg("Falha ao enviar. Tente novamente depois.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
      {pendingRequest && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">Solicitação pendente</p>
          <p className="mt-1 text-sm">
            Aguardando aprovação para ser {pendingRequest.role} em {pendingRequest.shopName}.
          </p>
        </div>
      )}
      {user && !user.emailVerified && !dismissedEmailAlert && (
        <div className="relative mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 pr-10 text-amber-900">
          <button
            type="button"
            onClick={() => setDismissedEmailAlert(true)}
            className="absolute right-2 top-2 rounded p-1 text-amber-900 hover:bg-amber-100"
            aria-label="Fechar"
          >
            ×
          </button>
          <p className="font-medium">Verifique seu e-mail</p>
          <p className="mt-1 text-sm">
            Enviamos um link de verificação para {user.email}. Clique para verificar.
          </p>
          <div className="mt-2 flex gap-4">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="text-sm font-medium underline hover:no-underline disabled:opacity-50"
            >
              {resending ? "Enviando..." : "Reenviar"}
            </button>
            <button
              type="button"
              onClick={() => auth.currentUser && reload(auth.currentUser)}
              className="text-sm font-medium underline hover:no-underline"
            >
              Já verifiquei, atualizar
            </button>
          </div>
          {resendMsg && (
            <p className="mt-2 text-sm">{resendMsg}</p>
          )}
        </div>
      )}
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">The Barber{shopName ? ` - ${shopName}` : ""}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-800">
            {profile?.name} ({(profile?.role === "client" && "cliente") || (profile?.role === "barber" && "barbeiro") || (profile?.role === "shop_admin" && "admin da barbearia") || (profile?.role === "platform_admin" && "admin") || profile?.role})
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="space-y-4">
        {profile?.role !== "platform_admin" && (
          <>
            <Link
              href="/book"
              className="block rounded-lg bg-zinc-900 p-4 text-white hover:bg-zinc-800"
            >
              Agendar
            </Link>
            <Link
              href="/my-appointments"
              className="block rounded-lg border border-zinc-300 bg-white p-4 hover:bg-zinc-50"
            >
              Meus agendamentos
            </Link>
          </>
        )}

        {(profile?.role === "shop_admin" || profile?.role === "platform_admin") && (
          <Link
            href="/admin/shops"
            className="block rounded-lg bg-zinc-900 p-4 text-white hover:bg-zinc-800"
          >
            Gerenciar barbearias
          </Link>
        )}

        {profile?.role === "platform_admin" && (
          <>
            <Link
              href="/admin/requests"
              className="relative block rounded-lg border border-zinc-300 bg-white p-4 hover:bg-zinc-50"
            >
              Solicitações (barbeiro / admin)
              {pendingRequestsCount > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                  {pendingRequestsCount}
                </span>
              )}
            </Link>
            <Link
              href="/admin/users"
              className="block rounded-lg border border-zinc-300 bg-white p-4 hover:bg-zinc-50"
            >
              Gerenciar usuários
            </Link>
          </>
        )}

        {(profile?.role === "barber" || isAlsoBarber) && (
          <Link
            href="/barber/schedule"
            className="block rounded-lg bg-zinc-900 p-4 text-white hover:bg-zinc-800"
          >
            Minha agenda
          </Link>
        )}
      </div>
      </div>
    </div>
  );
}
