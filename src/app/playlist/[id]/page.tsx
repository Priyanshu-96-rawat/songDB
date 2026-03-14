"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Play, Shuffle, ListMusic } from "lucide-react";
import Image from "next/image";
import { TrackRow } from "@/components/ui/TrackRow";
import { useYouTubePlayerStore, type YouTubeTrack } from "@/store/youtubePlayer";

interface PlaylistData {
    title: string;
    author: string;
    thumbnail: string;
    trackCount: number;
    tracks: YouTubeTrack[];
}

export default function PlaylistPage() {
    const params = useParams();
    const playlistId = params.id as string;
    const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
    const [loading, setLoading] = useState(true);
    const { playTrack, addToQueue } = useYouTubePlayerStore();

    useEffect(() => {
        async function fetchPlaylist() {
            setLoading(true);
            try {
                const res = await fetch(`/api/youtube-music/playlist?id=${encodeURIComponent(playlistId)}`);
                const data = await res.json();
                if (data.success && data.data) {
                    setPlaylist(data.data);
                }
            } catch (err) {
                // Silenced for production
            } finally {
                setLoading(false);
            }
        }
        if (playlistId) fetchPlaylist();
    }, [playlistId]);

    const playAll = () => {
        if (!playlist || playlist.tracks.length === 0) return;
        playTrack(playlist.tracks[0]);
        playlist.tracks.slice(1).forEach((t) => addToQueue(t));
    };

    const shuffleAll = () => {
        if (!playlist || playlist.tracks.length === 0) return;
        const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
        playTrack(shuffled[0]);
        shuffled.slice(1).forEach((t) => addToQueue(t));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <ListMusic className="h-12 w-12 text-white/10 mb-4" />
                <p className="text-white/30">Playlist not found</p>
            </div>
        );
    }

    return (
        <div className="pb-8">
            {/* Hero */}
            <div className="relative h-80 overflow-hidden">
                <div className="absolute inset-0">
                    <Image src={playlist.thumbnail} alt={playlist.title} fill className="object-cover blur-3xl opacity-30 scale-110" unoptimized />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f0f]" />

                <div className="relative z-10 flex items-end gap-6 px-8 pb-8 h-full">
                    <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 relative">
                        <Image src={playlist.thumbnail} alt={playlist.title} fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Playlist</p>
                        <h1 className="text-3xl md:text-4xl font-bold text-white truncate">{playlist.title}</h1>
                        <p className="text-white/50 mt-2">{playlist.author} · {playlist.trackCount} songs</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-8 py-6">
                <button
                    onClick={playAll}
                    className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90"
                >
                    <Play className="h-5 w-5 fill-current" />
                    Play All
                </button>
                <button onClick={shuffleAll} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.06] text-white font-semibold hover:bg-white/[0.1] transition">
                    <Shuffle className="h-5 w-5" />
                    Shuffle
                </button>
            </div>

            {/* Track list */}
            <div className="px-6">
                {playlist.tracks.map((track, i) => (
                    <TrackRow key={`${track.videoId}-${i}`} track={track} index={i} showIndex />
                ))}
            </div>
        </div>
    );
}
