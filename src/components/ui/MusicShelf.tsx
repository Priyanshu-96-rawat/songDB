"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { type YouTubeTrack } from "@/store/youtubePlayer";
import { MusicCard } from "@/components/ui/MusicCard";
import { TrackRow } from "@/components/ui/TrackRow";
import { useDraggableScroll } from "@/hooks/useDraggableScroll";

interface MusicShelfProps {
    title: string;
    subtitle?: string;
    tracks: YouTubeTrack[];
    layout?: "grid" | "list" | "scroll";
    showMoreHref?: string;
    maxItems?: number;
    cardSize?: "sm" | "md" | "lg";
}

export function MusicShelf({
    title,
    subtitle,
    tracks,
    layout = "scroll",
    showMoreHref,
    maxItems = 10,
    cardSize = "md",
}: MusicShelfProps) {
    const scrollRef = useDraggableScroll();

    if (!tracks || tracks.length === 0) return null;

    const displayTracks = tracks.slice(0, maxItems);

    return (
        <section className="mb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div>
                    <h2 className="text-fluid-xl font-bold text-white">{title}</h2>
                    {subtitle && <p className="text-fluid-xs text-white/30 mt-0.5">{subtitle}</p>}
                </div>
                {showMoreHref && (
                    <Link
                        href={showMoreHref}
                        className="flex items-center gap-1 text-fluid-xs font-semibold text-white/40 hover:text-white transition-colors uppercase tracking-wider group"
                    >
                        More
                        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                )}
            </div>

            {/* Content */}
            {layout === "scroll" && (
                <div ref={scrollRef} className="flex gap-fluid overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                    {displayTracks.map((track, i) => (
                        <MusicCard key={`${track.videoId}-${i}`} track={track} size={cardSize} priority={i < 4} />
                    ))}
                </div>
            )}

            {layout === "grid" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-fluid">
                    {displayTracks.map((track, i) => (
                        <MusicCard key={`${track.videoId}-${i}`} track={track} size="md" priority={i < 4} />
                    ))}
                </div>
            )}

            {layout === "list" && (
                <div className="space-y-0.5">
                    {displayTracks.map((track, i) => (
                        <TrackRow key={`${track.videoId}-${i}`} track={track} index={i} showIndex />
                    ))}
                </div>
            )}
        </section>
    );
}
