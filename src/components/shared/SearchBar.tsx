"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, Play, X, Clock3, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDebounce } from "@/hooks/use-debounce";
import { useYouTubePlayerStore, type YouTubeTrack } from "@/store/youtubePlayer";
import { motion, AnimatePresence } from "framer-motion";
import { TrackActionMenu } from "@/components/ui/TrackActionMenu";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<YouTubeTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);
  const { playTrack } = useYouTubePlayerStore();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("songdb-recent-searches");
      if (stored) setRecentSearches(JSON.parse(stored).slice(0, 5));
    } catch {}
  }, []);

  const saveRecentSearch = useCallback((term: string) => {
    try {
      const updated = [term, ...recentSearches.filter((entry) => entry !== term)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("songdb-recent-searches", JSON.stringify(updated));
    } catch {}
  }, [recentSearches]);

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    async function fetchSuggestions() {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/youtube-search?q=${encodeURIComponent(debouncedQuery)}&type=songs`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (data.success && data.data?.tracks) {
          setSuggestions(data.data.tracks.slice(0, 8));
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("[SearchBar] Suggestion fetch error:", error);
        }
      } finally {
        setIsSearching(false);
      }
    }

    fetchSuggestions();
    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;

    saveRecentSearch(query.trim());
    setIsFocused(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handlePlaySuggestion = useCallback(
    (track: YouTubeTrack) => {
      playTrack(track);
      saveRecentSearch(track.title);
      setIsFocused(false);
      setQuery("");
      setSuggestions([]);
    },
    [playTrack, saveRecentSearch]
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (event.key === "Enter" && selectedIndex >= 0 && suggestions[selectedIndex]) {
      event.preventDefault();
      handlePlaySuggestion(suggestions[selectedIndex]);
    } else if (event.key === "Escape") {
      setIsFocused(false);
    }
  };

  const showDropdown = isFocused && (suggestions.length > 0 || isSearching || (!query && recentSearches.length > 0));

  return (
    <div className="relative z-50 w-full" ref={searchRef}>
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative flex h-14 items-center gap-3 rounded-full border px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_40px_rgba(0,0,0,0.18)] transition-all duration-300 ${
            isFocused
              ? "border-primary/22 bg-[linear-gradient(180deg,rgba(30,36,44,0.96),rgba(16,20,28,0.94))] ring-1 ring-primary/20"
              : "border-white/8 bg-[linear-gradient(180deg,rgba(24,29,36,0.9),rgba(13,17,24,0.88))] hover:border-white/12"
          }`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-white/65">
            <Search className="h-4 w-4" />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search songs, artists, albums..."
            className="flex-1 bg-transparent text-sm font-medium tracking-tight text-white placeholder:text-white/28 [border:none] [box-shadow:none] [outline:none]"
          />

          {isSearching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="rounded-full p-1 text-white/34 transition hover:bg-white/[0.06] hover:text-white/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28 lg:flex">
              <Sparkles className="h-3 w-3 text-primary" />
              Quick Find
            </div>
          )}
        </div>
      </form>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full mt-3 overflow-hidden rounded-[26px] glass-strong shadow-2xl shadow-black/40"
          >
            {!query && recentSearches.length > 0 && (
              <div className="p-2.5">
                <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
                  Recent
                </p>
                {recentSearches.map((term, index) => (
                  <button
                    key={`recent-${index}`}
                    onClick={() => {
                      setQuery(term);
                      router.push(`/search?q=${encodeURIComponent(term)}`);
                      setIsFocused(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
                  >
                    <Clock3 className="h-4 w-4 shrink-0 text-white/28" />
                    <span className="truncate text-sm text-white/78">{term}</span>
                  </button>
                ))}
              </div>
            )}

            {isSearching && suggestions.length === 0 && (
              <div className="flex items-center justify-center gap-3 p-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-white/55">Searching…</span>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="max-h-[420px] overflow-y-auto p-2">
                {suggestions.map((track, index) => (
                  <motion.div
                    key={`${track.videoId}-${index}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.024, duration: 0.18 }}
                    onClick={() => handlePlaySuggestion(track)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handlePlaySuggestion(track);
                      }
                    }}
                    className={`group flex w-full items-center gap-3 rounded-[20px] p-3 text-left transition ${
                      selectedIndex === index ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl bg-white/[0.04]">
                      <Image
                        src={track.thumbnail}
                        alt={track.title}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{track.title}</p>
                      <p className="truncate text-xs text-white/42">{track.artist}</p>
                    </div>
                    <span className="text-[11px] font-medium tabular-nums text-white/28">{track.duration}</span>
                    <div
                      className="opacity-0 transition group-hover:opacity-100"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <TrackActionMenu
                        track={track}
                        triggerClassName="rounded-full p-2 text-white/64 transition hover:bg-white/10 hover:text-white"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
