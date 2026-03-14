"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Music2, Users, Disc3, ListMusic } from "lucide-react";
import { motion } from "framer-motion";
import { TrackRow } from "@/components/ui/TrackRow";
import { type YouTubeTrack } from "@/store/youtubePlayer";
import { useDraggableScroll } from "@/hooks/useDraggableScroll";

type SearchTab = "songs" | "videos" | "artists" | "albums" | "playlists";

interface SearchResults {
    tracks: YouTubeTrack[];
    artists: Array<{ id: string; name: string; thumbnail: string; subscribers?: string }>;
    albums: Array<{ id: string; title: string; artist: string; thumbnail: string; year?: string }>;
    playlists: Array<{ id: string; title: string; author: string; thumbnail: string; trackCount?: number }>;
}

export default function SearchPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const scrollRef = useDraggableScroll();
    const initialQuery = searchParams.get("q") || "";

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResults>({ tracks: [], artists: [], albums: [], playlists: [] });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<SearchTab>("songs");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const tabs: { key: SearchTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { key: "songs", label: "Songs", icon: Music2 },
        { key: "videos", label: "Videos", icon: Disc3 },
        { key: "artists", label: "Artists", icon: Users },
        { key: "albums", label: "Albums", icon: Disc3 },
        { key: "playlists", label: "Playlists", icon: ListMusic },
    ];

    const doSearch = useCallback(async (q: string, tab?: SearchTab, isRetry = false) => {
        if (!q.trim()) return;
        setLoading(true);
        setHasSearched(true);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        try {
            const type = tab || activeTab;
            const apiType = type === "songs" ? "songs" : type;
            const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}&type=${apiType}`);
            const data = await res.json();
            
            let finalTracks = data.data?.tracks ?? [];
            
            // Typo Resilience: If no tracks found and not already retrying, try with top suggestion if available
            if (finalTracks.length === 0 && !isRetry && suggestions.length > 0) {
                const topSug = suggestions[0];
                const retryRes = await fetch(`/api/youtube-search?q=${encodeURIComponent(topSug)}&type=${apiType}`);
                const retryData = await retryRes.json();
                if (retryData.success && retryData.data?.tracks?.length > 0) {
                    setQuery(topSug);
                    finalTracks = retryData.data.tracks;
                    data.data = { ...data.data, ...retryData.data };
                }
            }

            if (data.success && data.data) {
                setResults({
                    tracks: finalTracks,
                    artists: (data.data.artists ?? []).map((artist: any) => ({
                        id: artist.artistId,
                        name: artist.name,
                        thumbnail: artist.thumbnail,
                        subscribers: artist.subscribers,
                    })),
                    albums: (data.data.albums ?? []).map((album: any) => ({
                        id: album.albumId,
                        title: album.title,
                        artist: album.artist,
                        thumbnail: album.thumbnail,
                        year: album.year,
                    })),
                    playlists: (data.data.playlists ?? []).map((playlist: any) => ({
                        id: playlist.playlistId,
                        title: playlist.title,
                        author: playlist.author ?? 'Unknown',
                        thumbnail: playlist.thumbnail,
                        trackCount: playlist.trackCount,
                    })),
                });
            }
        } catch (err) {
            // Silenced for production
        } finally {
            setLoading(false);
        }
    }, [activeTab, suggestions]);

    // Search on initial query
    useEffect(() => {
        if (initialQuery) {
            setQuery(initialQuery);
            doSearch(initialQuery);
        }
    }, [initialQuery, doSearch]);

    // Fetch suggestions as user types
    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/youtube-music/suggestions?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                if (data.success && data.data) {
                    setSuggestions(data.data.slice(0, 6));
                }
            } catch { /* ignore */ }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query)}`);
            doSearch(query);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter" && selectedIndex >= 0) {
            e.preventDefault();
            const sug = suggestions[selectedIndex];
            setQuery(sug);
            setShowSuggestions(false);
            router.push(`/search?q=${encodeURIComponent(sug)}`);
            doSearch(sug);
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    const handleTabChange = (tab: SearchTab) => {
        setActiveTab(tab);
        if (query.trim()) {
            doSearch(query, tab);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="px-fluid py-6"
        >
            <div className="relative max-w-2xl mb-8">
                <form onSubmit={handleSearch}>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => { 
                                setQuery(e.target.value); 
                                setShowSuggestions(true); 
                                setSelectedIndex(-1);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search songs, artists, albums..."
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.06] text-white text-fluid-sm placeholder:text-white/25 outline-none focus:border-white/15 focus:bg-white/[0.08] transition-all"
                        />
                        {loading && <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-primary" />}
                    </div>
                </form>

                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-[#0f0f0f] border border-white/10 shadow-2xl z-20 overflow-hidden py-2">
                        {suggestions.map((sug, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setQuery(sug);
                                    setShowSuggestions(false);
                                    router.push(`/search?q=${encodeURIComponent(sug)}`);
                                    doSearch(sug);
                                }}
                                onMouseEnter={() => setSelectedIndex(i)}
                                className={`w-full flex items-center gap-4 px-5 py-3 transition-all text-left text-sm ${
                                    selectedIndex === i ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                                }`}
                            >
                                <Search className={`h-4 w-4 flex-shrink-0 transition-colors ${selectedIndex === i ? "text-[var(--color-primary)]" : "text-white/20"}`} />
                                <span className="truncate">{sug}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {showSuggestions && <div className="fixed inset-0 z-10" onClick={() => setShowSuggestions(false)} />}

            {hasSearched && (
                <div ref={scrollRef} className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
                    {tabs.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => handleTabChange(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 ${activeTab === key
                                ? "bg-white text-black"
                                : "bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1]"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : hasSearched ? (
                <div>
                    {(activeTab === "songs" || activeTab === "videos") && results.tracks.length > 0 && (
                        <div className="space-y-0.5">
                            {results.tracks.map((track, i) => (
                                <TrackRow key={`${track.videoId}-${i}`} track={track} index={i} showIndex priority={i === 0} />
                            ))}
                        </div>
                    )}

                    {activeTab === "artists" && results.artists.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-fluid">
                            {results.artists.map((artist) => (
                                <Link key={artist.id} href={`/artist/${encodeURIComponent(artist.name)}`} className="flex flex-col items-center gap-3 group">
                                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-[#1a1a1a] shadow-lg group-hover:shadow-xl transition-shadow" style={{ position: 'relative' }}>
                                        {artist.thumbnail && (
                                            <Image src={artist.thumbnail} alt={artist.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                                        )}
                                    </div>
                                    <p className="text-fluid-sm font-medium text-white text-center truncate max-w-[120px]">{artist.name}</p>
                                    {artist.subscribers && <p className="text-fluid-xs text-white/30">{artist.subscribers}</p>}
                                </Link>
                            ))}
                        </div>
                    )}

                    {activeTab === "albums" && results.albums.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-fluid">
                            {results.albums.map((album) => (
                                <Link key={album.id} href={`/album/${album.id}`} className="group text-left">
                                    <div className="relative aspect-square rounded-xl overflow-hidden bg-[#1a1a1a] mb-3 shadow-lg group-hover:shadow-xl transition-shadow" style={{ position: 'relative' }}>
                                        {album.thumbnail && (
                                            <Image src={album.thumbnail} alt={album.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                                        )}
                                    </div>
                                    <p className="text-fluid-sm font-medium text-white truncate">{album.title}</p>
                                    <p className="text-fluid-xs text-white/40 truncate">{album.artist}{album.year ? ` · ${album.year}` : ''}</p>
                                </Link>
                            ))}
                        </div>
                    )}

                    {activeTab === "playlists" && results.playlists.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-fluid">
                            {results.playlists.map((pl) => (
                                <Link key={pl.id} href={`/playlist/${pl.id}`} className="group text-left">
                                    <div className="relative aspect-square rounded-xl overflow-hidden bg-[#1a1a1a] mb-3 shadow-lg group-hover:shadow-xl transition-shadow" style={{ position: 'relative' }}>
                                        {pl.thumbnail && (
                                            <Image src={pl.thumbnail} alt={pl.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                                        )}
                                    </div>
                                    <p className="text-fluid-sm font-medium text-white truncate">{pl.title}</p>
                                    <p className="text-fluid-xs text-white/40 truncate">{pl.author}{pl.trackCount ? ` · ${pl.trackCount} songs` : ''}</p>
                                </Link>
                            ))}
                        </div>
                    )}

                    {results.tracks.length === 0 && results.artists.length === 0 && results.albums.length === 0 && results.playlists.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Music2 className="h-12 w-12 text-white/10 mb-4" />
                            <p className="text-lg font-semibold text-white/30">No results found</p>
                            <p className="text-sm text-white/20 mt-1">Try a different search term</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20">
                    <Search className="h-16 w-16 text-white/10 mb-4" />
                    <p className="text-lg font-semibold text-white/30">Search YouTube Music</p>
                    <p className="text-sm text-white/20 mt-1">Find songs, artists, albums, and playlists</p>
                </div>
            )}
        </motion.div>
    );
}
