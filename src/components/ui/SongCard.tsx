"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, ListMusic, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { useYouTubePlayerStore } from "@/store/youtubePlayer";
import { getDynamicGradientStyle } from "@/lib/colors";

interface SongCardProps {
    id: string;
    title: string;
    artist: string;
    coverArt?: string | null;
    image?: string | null;
    playCount?: number;
    rank?: number;
    listeners?: number;
}

export function SongCard({ id, title, artist, coverArt, image, playCount, rank, listeners }: SongCardProps) {
    const [imgError, setImgError] = useState(false);
    const [isLoadingPlay, setIsLoadingPlay] = useState(false);
    const { playTrack, addToQueue } = useYouTubePlayerStore();

    const displayImage = (!imgError && (coverArt || image)) ? (coverArt || image) : null;

    const formatNumber = (num: number) => {
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
        return num.toString();
    };

    // Play the song in-app by searching YouTube and picking the first result
    const handlePlay = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLoadingPlay) return;

        setIsLoadingPlay(true);
        try {
            const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(`${title} ${artist} audio`)}`);
            const data = await res.json();
            if (data.success && data.data?.tracks?.length > 0) {
                playTrack(data.data.tracks[0]);
            }
        } catch {
            // Silenced for production
        } finally {
            setIsLoadingPlay(false);
        }
    }, [title, artist, playTrack, isLoadingPlay]);

    const handleAddToQueue = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(`${title} ${artist} audio`)}`);
            const data = await res.json();
            if (data.success && data.data?.tracks?.length > 0) {
                addToQueue(data.data.tracks[0]);
            }
        } catch {
            // Silenced for production
        }
    }, [title, artist, addToQueue]);

    return (
        <Link
            href={`/song/${id}`}
            className="group relative block w-[clamp(140px,40vw,180px)] shrink-0 rounded-xl bg-card/40 p-3 card-3d"
        >
            {/* Rank badge */}
            {rank && (
                <span className="absolute left-4 top-4 z-10 flex items-center justify-center h-6 w-6 rounded-full bg-black/70 text-[11px] font-bold text-white/90 ring-1 ring-white/10">
                    {rank}
                </span>
            )}

            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted shadow-lg">
                {displayImage ? (
                    <Image
                        src={displayImage}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                        onError={() => setImgError(true)}
                        sizes="180px"
                    />
                ) : (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center"
                        style={getDynamicGradientStyle(title)}
                    >
                        <span className="text-3xl font-black text-white/40 select-none">{title[0]?.toUpperCase()}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30 mt-1">
                            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                    </div>
                )}

                {/* Dark overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Play button */}
                <div className="absolute bottom-2 right-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
                    <button
                        type="button"
                        onClick={handlePlay}
                        disabled={isLoadingPlay}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:opacity-90 active:scale-95 disabled:opacity-60"
                        title="Play"
                    >
                        {isLoadingPlay ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                        )}
                    </button>
                </div>

                {/* Add to queue — top right on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        type="button"
                        onClick={handleAddToQueue}
                        className="h-7 w-7 rounded-full bg-black/70 text-white/70 flex items-center justify-center hover:text-white hover:bg-black/80 transition-all ring-1 ring-white/10"
                        title="Add to queue"
                    >
                        <ListMusic className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <div className="mt-3 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-white transition-colors">{title}</h3>
                <p className="text-[13px] text-muted-foreground truncate">{artist}</p>
                {(playCount || listeners) && (
                    <div className="flex gap-2 mt-1 text-[11px] text-muted-foreground/70">
                        {playCount ? <span>{formatNumber(playCount)} plays</span> : null}
                        {listeners ? <span>{formatNumber(listeners)} listeners</span> : null}
                    </div>
                )}
            </div>
        </Link>
    );
}
