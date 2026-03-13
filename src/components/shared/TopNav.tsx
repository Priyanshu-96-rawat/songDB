"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "./SearchBar";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

const routeCopy: Record<string, { kicker: string; title: string }> = {
  "/": { kicker: "Browse", title: "Home" },
  "/search": { kicker: "Find", title: "Search" },
  "/explore": { kicker: "Discover", title: "Explore" },
  "/library": { kicker: "Collection", title: "Library" },
  "/profile": { kicker: "Identity", title: "Profile" },
};

export function TopNav() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  
  console.log("TopNav Render State:", { 
    loading, 
    user: user ? `${user.email} (${user.uid})` : "Null" 
  });

  const current = routeCopy[pathname] ?? { kicker: "Listen", title: "SongDB" };

  return (
    <nav className="sticky top-0 z-[40] px-3 pt-3 md:px-5 md:pt-4">
      <div className="shell-panel-soft relative overflow-hidden rounded-[30px] px-4 py-4 md:px-6">
        <div className="absolute inset-y-0 right-0 w-48 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_68%)] pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="hidden min-w-[10rem] xl:block">
            <p className="section-kicker">{current.kicker}</p>
            <h1 className="font-display text-[2rem] leading-none text-white">{current.title}</h1>
          </div>

          <div className="flex-1">
            {pathname !== "/search" && <SearchBar />}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {loading ? (
              <div className="h-10 w-24 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={logout}
                  className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/64 transition hover:border-white/16 hover:bg-white/[0.08] hover:text-white sm:block"
                >
                  Sign out
                </button>
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "Avatar"}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-white/10 transition-all hover:ring-primary/40"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
                    {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/60 transition hover:text-white sm:block"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-white/92"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
