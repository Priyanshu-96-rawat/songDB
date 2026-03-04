"use client";

import Image from "next/image";
import Link from "next/link";
import { Youtube } from "lucide-react";
import { useState } from "react";

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

    const handleYouTube = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(
            `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist} official`)}`,
            '_blank'
        );
    };

    const displayImage = (!imgError && (coverArt || image)) ? (coverArt || image) : null;

    const formatNumber = (num: number) => {
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
        return num.toString();
    };

    return (
        <Link href={`/song/${id}`} className="group relative block w-[180px] shrink-0 rounded-lg bg-card/50 p-3 transition-colors hover:bg-card">
            {/* Rank */}
            {rank && (
                <span className="absolute left-4 top-4 z-10 text-xs font-bold text-white/80 drop-shadow-md">{rank}</span>
            )}
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted shadow-lg">
                {displayImage ? (
                    <Image
                        src={displayImage}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
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
                {/* Spotify-style play overlay */}
                <div className="absolute bottom-2 right-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={handleYouTube}
                        className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
                        title="Play on YouTube"
                    >
                        <Youtube className="h-5 w-5 ml-0.5" />
                    </button>
                </div>
            </div>
            <div className="mt-3 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
                <p className="text-sm text-muted-foreground truncate">{artist}</p>
                {(playCount || listeners) && (
                    <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                        {playCount && <span>{formatNumber(playCount)} plays</span>}
                        {listeners && <span>{formatNumber(listeners)} listeners</span>}
                    </div>
                )}
            </div>
        </Link>
    );
}
