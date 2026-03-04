"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { getDynamicGradientStyle } from "@/lib/colors";

interface ArtistCardProps {
    id: string;
    name: string;
    image?: string | null;
    listeners?: number | string;
    rank?: number;
}

export function ArtistCard({ id, name, image, listeners, rank }: ArtistCardProps) {
    const [imgError, setImgError] = useState(false);
    const displayImage = (!imgError && image) ? image : null;

    const formatListeners = (val: number | string | undefined) => {
        if (!val) return null;
        const num = typeof val === 'string' ? parseInt(val) : val;
        if (isNaN(num)) return null;
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
        return num.toString();
    };

    return (
        <Link href={`/artist/${encodeURIComponent(name)}`} className="group flex w-[170px] shrink-0 flex-col items-center rounded-lg bg-card/50 p-4 transition-colors hover:bg-card">
            {rank && (
                <span className="mb-2 text-xs font-bold text-muted-foreground">{rank}</span>
            )}
            <div className="relative h-36 w-36 overflow-hidden rounded-full bg-muted shadow-lg transition-transform duration-200 group-hover:scale-105">
                {displayImage ? (
                    <Image
                        src={displayImage}
                        alt={name}
                        fill
                        className="object-cover"
                        onError={() => setImgError(true)}
                        sizes="144px"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={getDynamicGradientStyle(name)}>
                        <span className="text-3xl font-black text-white/50 select-none">{name[0]?.toUpperCase()}</span>
                    </div>
                )}
            </div>
            <h3 className="mt-3 w-full truncate text-center text-sm font-semibold text-foreground">{name}</h3>
            {listeners && (
                <span className="mt-0.5 text-xs text-muted-foreground">
                    {formatListeners(listeners)} listeners
                </span>
            )}
        </Link>
    );
}
