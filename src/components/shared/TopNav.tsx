"use client";

import Link from "next/link";
import { SearchBar } from "./SearchBar";
import { useAuth } from "@/context/AuthContext";

export function TopNav() {
  const { user, loading, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-20 flex h-16 items-center gap-4 bg-background/80 backdrop-blur-xl px-6 border-b border-white/[0.04]">
      <div className="flex flex-1 items-center gap-4">
        <div className="w-full max-w-md">
          <SearchBar />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {loading ? (
          <div className="h-8 w-20 rounded-full bg-muted animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-white transition-colors"
            >
              Sign out
            </button>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "Avatar"}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/30"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
              </div>
            )}
          </div>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="rounded-full px-5 py-2 text-sm font-semibold text-muted-foreground hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 transition-all"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
