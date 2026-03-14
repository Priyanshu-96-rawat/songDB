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
    priority?: boolean;
}

export function TrackRow({ track, index, showIndex = false, compact = false, priority = false }: TrackRowProps) {
    const { playTrack, addToQueue, currentTrack, isPlaying } = useYouTubePlayerStore();
    const { isLiked, toggleLike } = useLibraryStore();
    const isMounted = useIsMounted();

    const isCurrentTrack = currentTrack?.videoId === track.videoId;
    const liked = isMounted ? isLiked(track.videoId) : false;

    return (
        <div
            className={`flex items-center gap-2.5 sm:gap-3.5 ${compact ? 'p-1.5 sm:p-2' : 'px-3 py-2.5 sm:px-4 sm:py-3.5'} rounded-xl sm:rounded-2xl hover:bg-white/[0.06] transition-all duration-300 group cursor-pointer ${isCurrentTrack ? 'bg-white/[0.08] border border-white/5' : 'border border-transparent'}`}
            onClick={() => playTrack(track)}
            data-testid="track-row"
            data-track-id={track.videoId}
            data-track-title={track.title}
        >
            {/* Index or play icon */}
            {showIndex && (
                <div className="w-6 sm:w-8 text-center flex-shrink-0">
                    <span className={`text-[11px] sm:text-[13px] font-bold tabular-nums group-hover:hidden ${isCurrentTrack ? 'text-primary' : 'text-white/25'}`}>
                        {(index ?? 0) + 1}
                    </span>
                    <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white fill-white hidden group-hover:block mx-auto active:scale-90 transition-transform" />
                </div>
            )}

            {/* Thumbnail */}
            <div className={`relative ${compact ? 'h-9 w-9 sm:h-10 sm:w-10' : 'h-10 w-10 sm:h-12 sm:w-12'} rounded-lg sm:rounded-xl overflow-hidden bg-white/[0.05] flex-shrink-0 shadow-lg`}>
                <Image src={track.thumbnail} alt={track.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes={compact ? "40px" : "48px"} priority={priority} />
                {isCurrentTrack && isPlaying && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="flex items-end gap-[2px] h-3.5">
                            <span className="eq-bar w-[2px] sm:w-[3px] rounded-full" style={{ animationDuration: '0.5s' }} />
                            <span className="eq-bar w-[2px] sm:w-[3px] rounded-full" style={{ animationDuration: '0.7s' }} />
                            <span className="eq-bar w-[2px] sm:w-[3px] rounded-full" style={{ animationDuration: '0.4s' }} />
                        </div>
                    </div>
                )}
                {!isCurrentTrack && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-white fill-white drop-shadow-md active:scale-90 transition-transform" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pr-2">
                <p className={`${compact ? 'text-fluid-xs' : 'text-fluid-sm leading-snug'} font-bold truncate ${isCurrentTrack ? 'text-primary' : 'text-white/90'} tracking-tight`}>
                    {track.title}
                </p>
                <p className={`${compact ? 'text-[9px] sm:text-[10px]' : 'text-fluid-xs'} text-white/40 truncate mt-0.5 font-medium`}>
                    {track.artist}
                </p>
            </div>

            {/* Like button */}
            <button
                onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                className={`p-1.5 sm:p-2 rounded-full transition-all duration-300 flex-shrink-0 active:scale-75 ${liked ? 'opacity-100' : (isMounted ? 'opacity-100 lg:opacity-0 group-hover:opacity-100 hover:bg-white/10' : 'opacity-0')}`}
                title={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
            >
                <Heart className={`h-4 w-4 sm:h-4.5 sm:w-4.5 transition-colors ${liked ? 'fill-primary text-primary filter drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]' : 'text-white/20 hover:text-white'}`} />
            </button>

            {/* Duration */}
            <span className="text-fluid-xs text-white/25 tabular-nums font-semibold flex-shrink-0 hidden sm:block">{track.duration}</span>

            {/* Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-0 sm:ml-1">
                <button
                    onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                    className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-all active:scale-90 hidden md:block"
                    title="Add to queue"
                >
                    <ListMusic className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/30 hover:text-white" />
                </button>
                <TrackActionMenu
                    track={track}
                    triggerClassName="rounded-full p-1.5 sm:p-2 text-white/30 transition-all hover:bg-white/10 hover:text-white active:scale-90"
                    iconClassName="h-3.5 w-3.5 sm:h-4 sm:w-4"
                />
            </div>
        </div>
    );
}
