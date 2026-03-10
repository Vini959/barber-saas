"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { reload } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { PageContainer } from "@/components/PageContainer";
import { CardLink } from "@/components/ui/Card";
import { Calendar, Scissors, Building2, Users, ClipboardList, Send, User } from "lucide-react";

export default function HomePage() {
  const { user, profile, loading, sendVerificationEmail } = useAuth();
  const [resendMsg, setResendMsg] = useState("");
  const [resending, setResending] = useState(false);
  const [dismissedEmailAlert, setDismissedEmailAlert] = useState(false);
  const [isAlsoBarber, setIsAlsoBarber] = useState(false);
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
          setIsAlsoBarber(true);
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
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
          <p className="text-sm text-slate-600">Carregando...</p>
        </div>
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
    } catch {
      setResendMsg("Falha ao enviar. Tente novamente depois.");
    } finally {
      setResending(false);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {pendingRequest && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-medium">Solicitacao pendente</p>
            <p className="mt-1 text-sm text-amber-800">
              Aguardando aprovacao para ser {pendingRequest.role} em {pendingRequest.shopName}.
            </p>
          </div>
        )}

        {user && !user.emailVerified && !dismissedEmailAlert && (
          <div className="relative rounded-2xl border border-amber-200 bg-amber-50 p-4 pr-10 text-amber-900">
            <button
              type="button"
              onClick={() => setDismissedEmailAlert(true)}
              className="absolute right-3 top-3 cursor-pointer rounded-lg p-1 text-amber-700 hover:bg-amber-100"
              aria-label="Fechar"
            >
              x
            </button>
            <p className="font-medium">Verifique seu e-mail</p>
            <p className="mt-1 text-sm text-amber-800">Enviamos um link de verificacao para {user.email}.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="cursor-pointer text-sm font-medium text-amber-800 underline hover:no-underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resending ? "Enviando..." : "Reenviar"}
              </button>
              <button
                type="button"
                onClick={() => auth.currentUser && reload(auth.currentUser)}
                className="cursor-pointer text-sm font-medium text-amber-800 underline hover:no-underline"
              >
                Ja verifiquei, atualizar
              </button>
            </div>
            {resendMsg && <p className="mt-2 text-sm">{resendMsg}</p>}
          </div>
        )}

        <div className="mb-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Ola{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-slate-600">O que voce gostaria de fazer hoje?</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CardLink href="/profile" variant="secondary">
            <span className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100">
                <User className="size-6 text-slate-600" />
              </span>
              <span className="font-semibold">Meu perfil</span>
            </span>
          </CardLink>
          {profile?.role === "client" && (
            <>
              <CardLink href="/book" variant="primary">
                <span className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-white/20">
                    <Calendar className="size-6" />
                  </span>
                  <span className="font-semibold">Agendar</span>
                </span>
              </CardLink>
              <CardLink href="/my-appointments" variant="secondary">
                <span className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100">
                    <ClipboardList className="size-6 text-slate-600" />
                  </span>
                  <span className="font-semibold">Meus agendamentos</span>
                </span>
              </CardLink>
            </>
          )}

          {(profile?.role === "shop_admin" || profile?.role === "platform_admin") && (
            <CardLink href="/admin/shops" variant="primary">
              <span className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl bg-white/20">
                  <Building2 className="size-6" />
                </span>
                <span className="font-semibold">Gerenciar barbearias</span>
              </span>
            </CardLink>
          )}

          {profile?.role === "platform_admin" && (
            <>
              <CardLink
                href="/admin/requests"
                variant="secondary"
                badge={
                  pendingRequestsCount > 0 ? (
                    <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-medium text-white">
                      {pendingRequestsCount}
                    </span>
                  ) : undefined
                }
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100">
                    <ClipboardList className="size-6 text-slate-600" />
                  </span>
                  <span className="font-semibold">Solicitacoes</span>
                </span>
              </CardLink>
              <CardLink href="/admin/users" variant="secondary">
                <span className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100">
                    <Users className="size-6 text-slate-600" />
                  </span>
                  <span className="font-semibold">Gerenciar usuarios</span>
                </span>
              </CardLink>
            </>
          )}

          {(profile?.role === "barber" || isAlsoBarber) && (
            <CardLink href="/barber/schedule" variant="primary">
              <span className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl bg-white/20">
                  <Scissors className="size-6" />
                </span>
                <span className="font-semibold">Minha agenda</span>
              </span>
            </CardLink>
          )}

          {profile?.role !== "client" && profile?.role !== "shop_admin" && profile?.role !== "platform_admin" && !pendingRequest && profile?.role !== "barber" && !isAlsoBarber && (
            <CardLink href="/solicitar" variant="secondary">
              <span className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100">
                  <Send className="size-6 text-slate-600" />
                </span>
                <span className="font-semibold">Solicitar para ser barbeiro ou admin</span>
              </span>
            </CardLink>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
