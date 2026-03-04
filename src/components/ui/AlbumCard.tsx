"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface AlbumCardProps {
    id: string;
    title: string;
    artist: string;
    coverArt?: string | null;
    year?: number;
    playCount?: number | string;
}

export function AlbumCard({ id, title, artist, coverArt, year, playCount }: AlbumCardProps) {
    const [imgError, setImgError] = useState(false);
    const displayImage = (!imgError && coverArt) ? coverArt : null;

    return (
        <Link href={`/album/${id}`} className="group relative block w-[200px] shrink-0">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-card transition-all duration-300 group-hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)] group-hover:ring-1 group-hover:ring-white/10">
                {displayImage ? (
                    <Image
                        src={displayImage}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImgError(true)}
                        sizes="200px"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-card to-muted">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/30">
                            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
                            <line x1="12" y1="2" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="22" />
                        </svg>
                    </div>
                )}
                {/* Year Badge */}
                {year && (
                    <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white/80">
                        {year}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
            <div className="mt-3 flex flex-col gap-0.5">
                <h3 className="text-sm font-bold text-foreground truncate leading-tight">{title}</h3>
                <p className="text-xs text-muted-foreground truncate">{artist}</p>
            </div>
        </Link>
    );
}
