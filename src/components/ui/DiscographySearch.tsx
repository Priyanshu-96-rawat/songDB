"use client";

import { useState, useMemo } from "react";
import { Search, Youtube } from "lucide-react";
import Image from "next/image";
import { getDynamicGradientStyle } from "@/lib/colors";

interface Track {
    id: string;
    title: string;
    artist: string;
    coverArt: string | null;
    listeners: number;
    year: string | null;
    rank: number;
}

function ytUrl(track: string, artist: string) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track} ${artist} official`)}`;
}

export function DiscographySearch({ tracks, artistName }: { tracks: Track[]; artistName: string }) {
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        if (!query.trim()) return tracks;
        const q = query.toLowerCase();
        return tracks.filter(t => t.title.toLowerCase().includes(q));
    }, [query, tracks]);

    return (
        <div>
            {/* Search bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder={`Search in ${artistName}'s songs...`}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
                />
                {query && (
                    <button
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Results count */}
            {query && (
                <p className="text-xs text-muted-foreground mb-3">
                    {filtered.length === 0
                        ? `No songs match "${query}"`
                        : `${filtered.length} song${filtered.length !== 1 ? "s" : ""} found`}
                </p>
            )}

            {/* Track list */}
            <div className="glass rounded-xl overflow-hidden border border-white/5">
                {/* Column headers */}
                <div className="grid grid-cols-[40px_1fr_70px_50px] gap-3 px-4 py-3 border-b border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>#</span>
                    <span>Title</span>
                    <span className="text-right">Year</span>
                    <span className="text-right">Play</span>
                </div>

                {filtered.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                        No songs match your search. Try a different keyword.
                    </div>
                ) : (
                    filtered.map((track, i) => (
                        <div
                            key={track.id + "-disc-" + i}
                            className="grid grid-cols-[40px_1fr_70px_50px] gap-3 px-4 py-3 items-center border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
                        >
                            <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                {track.rank}
                            </span>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 relative">
                                    {track.coverArt ? (
                                        <Image src={track.coverArt} alt="" fill className="object-cover" unoptimized />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center" style={getDynamicGradientStyle(track.title)}>
                                            <span className="text-sm font-bold text-white/40">{track.title?.charAt(0)?.toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                        {track.title}
                                    </p>
                                    {track.listeners > 0 && (
                                        <p className="text-[10px] text-muted-foreground tabular-nums">
                                            {track.listeners.toLocaleString()} listeners
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground text-right font-medium">
                                {track.year || "—"}
                            </span>
                            <div className="flex justify-end">
                                <a
                                    href={ytUrl(track.title, track.artist)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-full p-1.5 text-muted-foreground transition-all hover:scale-110 hover:bg-primary/10 hover:text-primary"
                                    title={`Play on YouTube`}
                                >
                                    <Youtube className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* YouTube search all results link */}
            {query && filtered.length === 0 && (
                <div className="mt-4 text-center">
                    <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} ${artistName}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                        <Youtube className="h-4 w-4 text-primary" />
                        Search &quot;{query}&quot; by {artistName} on YouTube
                    </a>
                </div>
            )}
        </div>
    );
}
