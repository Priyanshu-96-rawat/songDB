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
    console.log("AuthProvider: Initializing...");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Auth State Changed:", firebaseUser ? `User: ${firebaseUser.email}` : "No user");
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
      console.error("Logout error:", error);
      setError(error instanceof Error ? error.message : "Failed to logout");
    }
  };

  const signInWithGoogle = async () => {
    console.log("signInWithGoogle: Starting flow...");
    setError(null);
    try {
      console.log("signInWithGoogle: Creating provider...");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      
      console.log("signInWithGoogle: Calling signInWithPopup...");
      const result = await signInWithPopup(auth, provider);
      console.log("signInWithGoogle: Response received:", result.user ? `User: ${result.user.email}` : "No user in result");
      
      if (result.user) {
        console.log("Google Sign-in Successful:", result.user.email);
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

      console.error("Sign-in error:", errorCode, err.message);
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