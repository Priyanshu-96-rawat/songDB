"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Music2, Users, Disc3, ListMusic } from "lucide-react";
import { motion } from "framer-motion";
import { TrackRow } from "@/components/ui/TrackRow";
import { type YouTubeTrack } from "@/store/youtubePlayer";

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
    const initialQuery = searchParams.get("q") || "";

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResults>({ tracks: [], artists: [], albums: [], playlists: [] });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<SearchTab>("songs");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const tabs: { key: SearchTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { key: "songs", label: "Songs", icon: Music2 },
        { key: "videos", label: "Videos", icon: Disc3 },
        { key: "artists", label: "Artists", icon: Users },
        { key: "albums", label: "Albums", icon: Disc3 },
        { key: "playlists", label: "Playlists", icon: ListMusic },
    ];

    const doSearch = useCallback(async (q: string, tab?: SearchTab) => {
        if (!q.trim()) return;
        setLoading(true);
        setHasSearched(true);
        setShowSuggestions(false);
        try {
            const type = tab || activeTab;
            const apiType = type === "songs" ? "songs" : type;
            const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}&type=${apiType}`);
            const data = await res.json();
            if (data.success && data.data) {
                setResults({
                    tracks: data.data.tracks ?? [],
                    artists: (data.data.artists ?? []).map((artist: { artistId: string; name: string; thumbnail: string; subscribers?: string }) => ({
                        id: artist.artistId,
                        name: artist.name,
                        thumbnail: artist.thumbnail,
                        subscribers: artist.subscribers,
                    })),
                    albums: (data.data.albums ?? []).map((album: { albumId: string; title: string; artist: string; thumbnail: string; year?: string }) => ({
                        id: album.albumId,
                        title: album.title,
                        artist: album.artist,
                        thumbnail: album.thumbnail,
                        year: album.year,
                    })),
                    playlists: (data.data.playlists ?? []).map((playlist: { playlistId: string; title: string; author?: string; thumbnail: string; trackCount?: number }) => ({
                        id: playlist.playlistId,
                        title: playlist.title,
                        author: playlist.author ?? 'Unknown',
                        thumbnail: playlist.thumbnail,
                        trackCount: playlist.trackCount,
                    })),
                });
            }
        } catch (err) {
            console.error("[Search] Error:", err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

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
            className="px-6 py-6"
        >
            {/* Search bar */}
            <div className="relative max-w-2xl mb-8">
                <form onSubmit={handleSearch}>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                            onFocus={() => setShowSuggestions(true)}
                            placeholder="Search songs, artists, albums..."
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.06] text-white text-sm placeholder:text-white/25 outline-none focus:border-white/15 focus:bg-white/[0.08] transition-all"
                        />
                        {loading && <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-primary" />}
                    </div>
                </form>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#1a1a1a] border border-white/[0.06] shadow-xl z-20 overflow-hidden">
                        {suggestions.map((sug, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setQuery(sug);
                                    setShowSuggestions(false);
                                    router.push(`/search?q=${encodeURIComponent(sug)}`);
                                    doSearch(sug);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors text-left text-sm text-white/70 hover:text-white"
                            >
                                <Search className="h-4 w-4 text-white/20 flex-shrink-0" />
                                {sug}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Click outside to close suggestions */}
            {showSuggestions && <div className="fixed inset-0 z-10" onClick={() => setShowSuggestions(false)} />}

            {/* Tabs */}
            {hasSearched && (
                <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
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

            {/* Results */}
            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : hasSearched ? (
                <div>
                    {/* Songs/Videos tab */}
                    {(activeTab === "songs" || activeTab === "videos") && results.tracks.length > 0 && (
                        <div className="space-y-0.5">
                            {results.tracks.map((track, i) => (
                                <TrackRow key={`${track.videoId}-${i}`} track={track} index={i} showIndex />
                            ))}
                        </div>
                    )}

                    {/* Artists tab */}
                    {activeTab === "artists" && results.artists.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {results.artists.map((artist) => (
                                <Link key={artist.id} href={`/artist/${encodeURIComponent(artist.name)}`} className="flex flex-col items-center gap-3 group">
                                    <div className="relative w-32 h-32 rounded-full overflow-hidden bg-[#1a1a1a] shadow-lg group-hover:shadow-xl transition-shadow">
                                        {artist.thumbnail && (
                                            <Image src={artist.thumbnail} alt={artist.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-white text-center truncate max-w-[120px]">{artist.name}</p>
                                    {artist.subscribers && <p className="text-xs text-white/30">{artist.subscribers}</p>}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Albums tab */}
                    {activeTab === "albums" && results.albums.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {results.albums.map((album) => (
                                <Link key={album.id} href={`/album/${album.id}`} className="group text-left">
                                    <div className="relative aspect-square rounded-xl overflow-hidden bg-[#1a1a1a] mb-3 shadow-lg group-hover:shadow-xl transition-shadow">
                                        {album.thumbnail && (
                                            <Image src={album.thumbnail} alt={album.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-white truncate">{album.title}</p>
                                    <p className="text-xs text-white/40 truncate">{album.artist}{album.year ? ` · ${album.year}` : ''}</p>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Playlists tab */}
                    {activeTab === "playlists" && results.playlists.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {results.playlists.map((pl) => (
                                <Link key={pl.id} href={`/playlist/${pl.id}`} className="group text-left">
                                    <div className="relative aspect-square rounded-xl overflow-hidden bg-[#1a1a1a] mb-3 shadow-lg group-hover:shadow-xl transition-shadow">
                                        {pl.thumbnail && (
                                            <Image src={pl.thumbnail} alt={pl.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-white truncate">{pl.title}</p>
                                    <p className="text-xs text-white/40 truncate">{pl.author}{pl.trackCount ? ` · ${pl.trackCount} songs` : ''}</p>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* No results */}
                    {results.tracks.length === 0 && results.artists.length === 0 && results.albums.length === 0 && results.playlists.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Music2 className="h-12 w-12 text-white/10 mb-4" />
                            <p className="text-lg font-semibold text-white/30">No results found</p>
                            <p className="text-sm text-white/20 mt-1">Try a different search term</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Initial state */
                <div className="flex flex-col items-center justify-center py-20">
                    <Search className="h-16 w-16 text-white/10 mb-4" />
                    <p className="text-lg font-semibold text-white/30">Search YouTube Music</p>
                    <p className="text-sm text-white/20 mt-1">Find songs, artists, albums, and playlists</p>
                </div>
            )}
        </motion.div>
    );
}
