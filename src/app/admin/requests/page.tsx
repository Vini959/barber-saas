"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";

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
  const [requests, setRequests] = useState<(Request & { userName?: string; userEmail?: string; shopName?: string })[]>([]);
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
          const u = userSnap.exists() ? userSnap.data() as { name?: string; email?: string } : {};
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
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
          <header className="mb-8 flex items-center justify-between">
            <Link href="/admin/shops" className="text-zinc-800 hover:text-zinc-900">
              ← Admin
            </Link>
            <SignOutButton />
          </header>

          <h1 className="mb-6 text-2xl font-bold text-zinc-900">Solicitações</h1>

          {loading ? (
            <p className="text-zinc-600">Carregando...</p>
          ) : requests.length === 0 ? (
            <p className="text-zinc-600">Nenhuma solicitação pendente.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-zinc-300 bg-white p-4"
                >
                  <p className="font-medium">{r.userName}</p>
                  {r.userEmail && <p className="text-sm text-zinc-600">{r.userEmail}</p>}
                  <p className="mt-2 text-sm">
                    Solicita: <strong>{r.requestedRole === "barber" ? "Barbeiro" : "Admin da barbearia"}</strong>
                    {" · "}
                    {r.shopName}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => resolve(r.id, "approved")}
                      disabled={actionId === r.id}
                      className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionId === r.id ? "..." : "Aprovar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => resolve(r.id, "declined")}
                      disabled={actionId === r.id}
                      className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
