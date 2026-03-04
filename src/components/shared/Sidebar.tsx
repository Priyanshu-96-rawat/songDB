"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, LayoutGrid, Compass, TrendingUp, Users, Newspaper, Music, Trophy, Heart } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/genres", label: "Genres", icon: LayoutGrid },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/top-artists", label: "Top Artists", icon: Users },
  { href: "/top-rated", label: "Top Rated", icon: Trophy },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/profile", label: "Profile", icon: Heart },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-16 md:w-60 flex-col bg-black border-r border-white/[0.04]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 justify-center md:justify-start">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
          <Music className="h-4 w-4 text-white" />
        </div>
        <span className="hidden md:inline font-extrabold text-lg tracking-tight text-white">
          SongDB
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 mt-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`
                flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-white/10 text-white"
                  : "text-[#B3B3B3] hover:text-white hover:bg-white/[0.06]"
                }
              `}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
              <span className="hidden md:inline">{label}</span>
              {isActive && (
                <span className="hidden md:block ml-auto w-1 h-4 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom branding */}
      <div className="hidden md:block px-4 py-4 border-t border-white/[0.04]">
        <p className="text-[10px] text-white/20 font-medium">© 2026 SongDB</p>
      </div>
    </aside>
  );
}
