"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Download, Heart, Home, Search } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/library", label: "Library", icon: Heart },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-[24px] bg-gradient-to-br from-primary via-secondary to-accent shadow-lg shadow-primary/25 ${
        compact ? "h-11 w-11" : "h-14 w-14"
      }`}
    >
      <svg width={compact ? 18 : 22} height={compact ? 18 : 22} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="16" width="4" height="8" rx="2" fill="white" />
        <rect x="11" y="10" width="4" height="20" rx="2" fill="white" />
        <rect x="18" y="6" width="4" height="28" rx="2" fill="white" />
        <rect x="25" y="12" width="4" height="16" rx="2" fill="white" />
        <rect x="32" y="14" width="4" height="12" rx="2" fill="white" />
      </svg>
      <div className="absolute inset-0 -z-10 rounded-[24px] bg-primary/20 blur-lg" />
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [isInstalled] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches
  );

  return (
    <>
      <aside className="fixed bottom-28 left-3 top-3 z-30 flex w-[4.5rem] flex-col rounded-[28px] shell-panel p-2.5 md:hidden">
        <div className="flex justify-center pb-3">
          <BrandMark compact />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-2 pt-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
                  isActive
                    ? "border-primary/30 bg-primary/12 text-primary shadow-lg shadow-primary/20"
                    : "border-transparent bg-white/[0.03] text-white/52 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </Link>
            );
          })}
        </nav>
        {!isInstalled && (
          <Link
            href="/download"
            title="Download App"
            className="flex h-12 w-12 items-center justify-center self-center rounded-2xl border border-transparent bg-white/[0.03] text-white/52 transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
          >
            <Download className="h-[18px] w-[18px]" />
          </Link>
        )}
      </aside>

      <aside className="fixed bottom-24 left-4 top-4 z-30 hidden w-[17.75rem] flex-col rounded-[34px] shell-panel-soft px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-3 px-3">
          <BrandMark />
          <div>
            <p className="font-display text-[2rem] leading-none text-white">SongDB</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-white/35">Streaming Studio</p>
          </div>
        </div>

        <div className="px-3">
          <p className="section-kicker">Menu</p>
        </div>
        <nav className="mt-3 flex flex-1 flex-col gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-[24px] px-4 py-3.5 transition ${
                  isActive
                    ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_34px_rgba(0,0,0,0.22)]"
                    : "text-white/58 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-[18px] border transition ${
                    isActive
                      ? "border-primary/25 bg-primary/12 text-primary"
                      : "border-white/8 bg-white/[0.03] text-white/52 group-hover:border-white/12 group-hover:text-white"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold tracking-tight">{label}</p>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/28">
                    {href === "/" ? "Start here" : href === "/search" ? "Find anything" : href === "/explore" ? "Editorial lanes" : "Saved collection"}
                  </p>
                </div>
                {isActive && <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-lg shadow-primary/50" />}
              </Link>
            );
          })}
        </nav>

        {!isInstalled && (
          <Link
            href="/download"
            className="mt-3 flex items-center gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 text-white/64 transition hover:border-white/12 hover:bg-white/[0.06] hover:text-white"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-white/[0.04]">
              <Download className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold">Download App</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/30">Installable build</p>
            </div>
          </Link>
        )}
      </aside>
    </>
  );
}
