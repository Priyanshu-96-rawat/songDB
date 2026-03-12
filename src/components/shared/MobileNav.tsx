"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Home, Search } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/library", label: "Library", icon: Heart },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-white/5 bg-black/80 px-4 pb-safe backdrop-blur-xl sm:hidden">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive ? "text-primary" : "text-white/40 hover:text-white/60"
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
              isActive ? "bg-primary/10" : ""
            }`}>
              <Icon className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-[0.1em]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
