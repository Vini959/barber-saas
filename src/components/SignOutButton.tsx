"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signOut();
    router.push("/login");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-zinc-800 underline hover:text-zinc-900"
    >
      Sair
    </button>
  );
}
