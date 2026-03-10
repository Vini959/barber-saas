"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "client" | "barber" | "shop_admin" | "platform_admin";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  shopId?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeRole = (r: unknown): UserRole => {
    const s = String(r ?? "").toLowerCase();
    if (["client", "barber", "shop_admin", "platform_admin"].includes(s)) {
      return s as UserRole;
    }
    return "client";
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const docRef = doc(db, "users", firebaseUser.uid);
      unsubProfile = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const d = snap.data() as { email?: string; name?: string; role?: unknown; shopId?: string };
            setProfile({
              uid: firebaseUser.uid,
              email: d.email ?? firebaseUser.email ?? "",
              name: d.name ?? firebaseUser.displayName ?? "",
              role: normalizeRole(d.role),
              shopId: d.shopId,
            });
          } else {
            setProfile(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error("Profile fetch error:", err);
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(newUser);
    await setDoc(doc(db, "users", newUser.uid), {
      email,
      name,
      role: "client",
      createdAt: new Date().toISOString(),
    });
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const updateProfileName = async (name: string) => {
    if (!auth.currentUser) return;
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      name: name.trim(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, sendVerificationEmail, updateProfileName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
