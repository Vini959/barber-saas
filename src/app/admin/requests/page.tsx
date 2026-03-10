"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

interface Request {
  id: string;
  userId: string;
  requestedRole: string;
  shopId: string;
  status: string;
  createdAt: string;
}

export default function AdminRequestsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<
    (Request & { userName?: string; userEmail?: string; shopName?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role !== "platform_admin") return;
    (async () => {
      const snap = await getDocs(
        query(collection(db, "requests"), where("status", "==", "pending"))
      );
      const reqs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Request));
      const enriched = await Promise.all(
        reqs.map(async (r) => {
          const [userSnap, shopSnap] = await Promise.all([
            getDoc(doc(db, "users", r.userId)),
            getDoc(doc(db, "barbershops", r.shopId)),
          ]);
          const u = userSnap.exists() ? (userSnap.data() as { name?: string; email?: string }) : {};
          const s = shopSnap.exists() ? (shopSnap.data() as { name?: string }) : {};
          return {
            ...r,
            userName: u.name ?? u.email ?? r.userId,
            userEmail: u.email,
            shopName: s.name ?? r.shopId,
          };
        })
      );
      setRequests(enriched);
      setLoading(false);
    })();
  }, [profile?.role]);

  const resolve = async (requestId: string, status: "approved" | "declined") => {
    setActionId(requestId);
    try {
      const req = requests.find((r) => r.id === requestId);
      if (!req) return;
      if (status === "approved") {
        await updateDoc(doc(db, "users", req.userId), {
          role: req.requestedRole,
          shopId: req.shopId,
        });
        if (req.requestedRole === "barber") {
          const userSnap = await getDoc(doc(db, "users", req.userId));
          const u = userSnap.exists() ? (userSnap.data() as { name?: string; email?: string }) : {};
          await import("firebase/firestore").then(({ addDoc, collection }) =>
            addDoc(collection(db, "barbers"), {
              userId: req.userId,
              shopId: req.shopId,
              displayName: u.name ?? "Barbeiro",
              email: u.email ?? "",
              createdAt: new Date().toISOString(),
            })
          );
        }
      }
      await updateDoc(doc(db, "requests", requestId), {
        status,
        resolvedAt: new Date().toISOString(),
        resolvedBy: profile?.uid,
      });
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Resolve error:", err);
    } finally {
      setActionId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <PageContainer>
        <Link
          href="/admin/shops"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Admin
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Solicitações</h1>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-600">Nenhuma solicitação pendente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="font-semibold text-slate-900">{r.userName}</p>
                {r.userEmail && <p className="text-sm text-slate-600">{r.userEmail}</p>}
                <p className="mt-2 text-sm text-slate-600">
                  Solicita: <strong>{r.requestedRole === "barber" ? "Barbeiro" : "Admin"}</strong> · {r.shopName}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => resolve(r.id, "approved")}
                    disabled={actionId === r.id}
                  >
                    {actionId === r.id ? "..." : "Aprovar"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => resolve(r.id, "declined")}
                    disabled={actionId === r.id}
                  >
                    Recusar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
