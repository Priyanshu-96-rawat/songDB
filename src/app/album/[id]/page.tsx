"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Play, Music2, Shuffle } from "lucide-react";
import Image from "next/image";
import { TrackRow } from "@/components/ui/TrackRow";
import { useYouTubePlayerStore, type YouTubeTrack } from "@/store/youtubePlayer";

interface AlbumData {
    title: string;
    artist: string;
    thumbnail: string;
    year: string;
    trackCount: number;
    tracks: YouTubeTrack[];
}

export default function AlbumPage() {
    const params = useParams();
    const albumId = params.id as string;
    const [album, setAlbum] = useState<AlbumData | null>(null);
    const [loading, setLoading] = useState(true);
    const { playTrack, addToQueue } = useYouTubePlayerStore();

    useEffect(() => {
        async function fetchAlbum() {
            setLoading(true);
            try {
                const res = await fetch(`/api/youtube-music/album?id=${encodeURIComponent(albumId)}`);
                const data = await res.json();
                if (data.success && data.data) {
                    setAlbum(data.data);
                }
            } catch (err) {
                console.error("[Album] Error:", err);
            } finally {
                setLoading(false);
            }
        }
        if (albumId) fetchAlbum();
    }, [albumId]);

    const playAll = () => {
        if (!album || album.tracks.length === 0) return;
        playTrack(album.tracks[0]);
        album.tracks.slice(1).forEach((t) => addToQueue(t));
    };

    const shuffleAll = () => {
        if (!album || album.tracks.length === 0) return;
        const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
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

    if (!album) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Music2 className="h-12 w-12 text-white/10 mb-4" />
                <p className="text-white/30">Album not found</p>
            </div>
        );
    }

    return (
        <div className="pb-8">
            {/* Hero */}
            <div className="relative h-80 overflow-hidden">
                <div className="absolute inset-0">
                    <Image 
                        src={album.thumbnail} 
                        alt={album.title} 
                        fill
                        className="object-cover blur-3xl opacity-30 scale-110" 
                        priority
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f0f]" />

                <div className="relative z-10 flex items-end gap-6 px-8 pb-8 h-full">
                    <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-xl shadow-2xl">
                        <Image 
                            src={album.thumbnail} 
                            alt={album.title} 
                            fill
                            className="object-cover" 
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/40">Album</p>
                        <h1 className="truncate text-3xl font-bold text-white md:text-4xl">{album.title}</h1>
                        <p className="mt-2 text-white/50">{album.artist} · {album.year} · {album.trackCount} songs</p>
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
                    Play
                </button>
                <button onClick={shuffleAll} className="flex items-center gap-2 rounded-full bg-white/[0.06] px-6 py-3 font-semibold text-white transition hover:bg-white/[0.1]">
                    <Shuffle className="h-5 w-5" />
                    Shuffle
                </button>
            </div>

            {/* Track list */}
            <div className="px-6">
                {album.tracks.map((track, i) => (
                    <TrackRow key={`${track.videoId}-${i}`} track={track} index={i} showIndex />
                ))}
            </div>
        </div>
    );
}
