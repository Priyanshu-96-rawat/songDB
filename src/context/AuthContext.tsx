"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (error) {
      // Silently handle logout errors
      setError(error instanceof Error ? error.message : "Failed to logout");
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setUser(result.user);
      }
    } catch (err: any) {
      const errorCode = err?.code || "";
      
      // Silently ignore — user just closed the popup
      if (
        errorCode === "auth/popup-closed-by-user" ||
        errorCode === "auth/cancelled-by-user"
      ) {
        return;
      }

      // Catch and store error for UI display only
      setError(err.message || "Sign-in failed.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, signInWithGoogle, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}