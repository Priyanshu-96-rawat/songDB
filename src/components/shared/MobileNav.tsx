"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Download, Heart, Home, Search } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/library", label: "Library", icon: Heart },
];

export function MobileNav() {
  const pathname = usePathname();
  const [isInstalled, setIsInstalled] = useState(true); // Default to true to prevent hydration shift

  useEffect(() => {
    setTimeout(() => {
      setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);
    }, 0);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] flex h-[72px] items-center justify-around border-t border-white/5 bg-[#08080d]/95 backdrop-blur-xl px-2 sm:px-6 pb-2 sm:hidden safe-area-bottom">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${
              isActive ? "text-primary" : "text-white/40 hover:text-white/70"
            }`}
          >
            <div className={`flex h-10 w-12 items-center justify-center rounded-2xl transition-all ${
              isActive ? "bg-primary/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]" : ""
            }`}>
              <Icon className={`h-6 w-6 transition-all ${isActive ? "scale-110" : ""}`} />
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-[0.15em] transition-all ${isActive ? "opacity-100" : "opacity-60"}`}>{label}</span>
          </Link>
        );
      })}
      
      {!isInstalled && (
        <Link
          href="/download"
          className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${
            pathname === "/download" ? "text-primary" : "text-white/40 hover:text-white/70"
          }`}
        >
          <div className={`flex h-10 w-12 items-center justify-center rounded-2xl transition-all ${
            pathname === "/download" ? "bg-primary/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]" : ""
          }`}>
            <Download className={`h-6 w-6 transition-all ${pathname === "/download" ? "scale-110" : ""}`} />
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-[0.15em] transition-all ${pathname === "/download" ? "opacity-100" : "opacity-60"}`}>App</span>
        </Link>
      )}
    </nav>
  );
}
