"use client";

import Image from "next/image";
import { Play, ListMusic, Heart } from "lucide-react";
import { useYouTubePlayerStore, type YouTubeTrack } from "@/store/youtubePlayer";
import { useLibraryStore } from "@/store/library";
import { TrackActionMenu } from "@/components/ui/TrackActionMenu";
import { useIsMounted } from "@/hooks/useIsMounted";

interface TrackRowProps {
    track: YouTubeTrack;
    index?: number;
    showIndex?: boolean;
    compact?: boolean;
}

export function TrackRow({ track, index, showIndex = false, compact = false }: TrackRowProps) {
    const { playTrack, addToQueue, currentTrack, isPlaying } = useYouTubePlayerStore();
    const { isLiked, toggleLike } = useLibraryStore();
    const isMounted = useIsMounted();

    const isCurrentTrack = currentTrack?.videoId === track.videoId;
    const liked = isMounted ? isLiked(track.videoId) : false;

    return (
        <div
            className={`flex items-center gap-3 ${compact ? 'p-2' : 'px-4 py-3'} rounded-xl hover:bg-white/[0.05] transition-all group cursor-pointer ${isCurrentTrack ? 'bg-white/[0.06]' : ''}`}
            onClick={() => playTrack(track)}
            data-testid="track-row"
            data-track-id={track.videoId}
            data-track-title={track.title}
        >
            {/* Index or play icon */}
            {showIndex && (
                <div className="w-7 text-center flex-shrink-0">
                    <span className={`text-sm tabular-nums group-hover:hidden ${isCurrentTrack ? 'text-[var(--color-primary)] font-bold' : 'text-white/40'}`}>
                        {(index ?? 0) + 1}
                    </span>
                    <Play className="h-4 w-4 text-white fill-white hidden group-hover:block mx-auto" />
                </div>
            )}

            {/* Thumbnail */}
            <div className={`relative ${compact ? 'h-10 w-10' : 'h-12 w-12'} rounded-lg overflow-hidden bg-white/[0.05] flex-shrink-0`}>
                <Image src={track.thumbnail} alt={track.title} fill className="object-cover" sizes={compact ? "40px" : "48px"} />
                {isCurrentTrack && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex items-end gap-[2px] h-3">
                            <span className="eq-bar" style={{ animationDuration: '0.5s' }} />
                            <span className="eq-bar" style={{ animationDuration: '0.7s' }} />
                            <span className="eq-bar" style={{ animationDuration: '0.4s' }} />
                        </div>
                    </div>
                )}
                {!isCurrentTrack && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-4 w-4 text-white fill-white" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className={`${compact ? 'text-xs' : 'text-[15px] leading-tight'} font-medium truncate ${isCurrentTrack ? 'text-[var(--color-primary)]' : 'text-white/90'}`}>
                    {track.title}
                </p>
                <p className={`${compact ? 'text-[10px]' : 'text-[13px]'} text-white/50 truncate mt-0.5`}>
                    {track.artist}
                </p>
            </div>

            {/* Like button */}
            <button
                onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                className={`p-1.5 rounded-full transition-all flex-shrink-0 ${liked ? 'opacity-100' : (isMounted ? 'opacity-100 sm:opacity-0 group-hover:opacity-100' : 'opacity-0')}`}
                title={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
            >
                <Heart className={`h-4 w-4 transition-colors ${liked ? 'fill-[var(--color-primary)] text-[var(--color-primary)]' : 'text-white/40 hover:text-white'}`} />
            </button>

            {/* Duration */}
            <span className="text-[13px] text-white/30 tabular-nums flex-shrink-0">{track.duration}</span>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors hidden sm:block"
                    title="Add to queue"
                >
                    <ListMusic className="h-3.5 w-3.5 text-white/40 hover:text-white" />
                </button>
                <TrackActionMenu
                    track={track}
                    triggerClassName="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                    iconClassName="h-3.5 w-3.5"
                />
            </div>
        </div>
    );
}
