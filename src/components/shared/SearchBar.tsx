"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

export function SearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const debouncedQuery = useDebounce(query, 500);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            setIsFocused(false);
            router.push(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div className="relative w-full max-w-md z-50" ref={searchRef}>
            <form onSubmit={handleSubmit} className="relative group">
                <div
                    className={`
                        relative flex items-center h-10 rounded-full px-4
                        bg-white/[0.08]
                        transition-all duration-200 ease-out
                        ${isFocused
                            ? 'bg-muted shadow-[0_0_0_1px_rgba(255,255,255,0.2)] w-full max-w-[400px]'
                            : 'hover:bg-white/[0.1] w-full max-w-[320px]'
                        }
                    `}
                >
                    <Search className={`h-4 w-4 shrink-0 transition-colors duration-200 ${isFocused ? 'text-foreground' : 'text-muted-foreground'}`} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        placeholder="Search songs, artists, albums..."
                        className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 ml-2.5 font-medium tracking-tight [border:none] [outline:none] [box-shadow:none] focus:[outline:none] focus:[box-shadow:none] focus-visible:[outline:none]"
                        style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="text-white/20 hover:text-white/50 transition-colors p-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    )}
                    {!query && (
                        <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 text-[10px] font-medium text-white/15 rounded bg-white/[0.04]">
                            ↵
                        </kbd>
                    )}
                </div>
            </form>
        </div>
    );
}
