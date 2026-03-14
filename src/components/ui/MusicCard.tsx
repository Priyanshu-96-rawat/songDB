"use client";

import Image from "next/image";
import { Play, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { getDynamicGradientStyle } from "@/lib/colors";
import { useYouTubePlayerStore, type YouTubeTrack } from "@/store/youtubePlayer";
import { useLibraryStore } from "@/store/library";
import { TrackActionMenu } from "@/components/ui/TrackActionMenu";
import { useIsMounted } from "@/hooks/useIsMounted";

interface MusicCardProps {
    track: YouTubeTrack;
    size?: "sm" | "md" | "lg";
    subtitle?: string;
    priority?: boolean;
}

export function MusicCard({ track, size = "md", subtitle, priority: isPriority = false }: MusicCardProps) {
    const { playTrack, currentTrack, isPlaying } = useYouTubePlayerStore();
    const { isLiked, toggleLike } = useLibraryStore();
    const [imageFailed, setImageFailed] = useState(false);
    const isMounted = useIsMounted();

    const isCurrentTrack = currentTrack?.videoId === track.videoId;
    const liked = isMounted ? isLiked(track.videoId) : false;
    const hasArtwork = Boolean(track.thumbnail) && !imageFailed;

    const fluidWidths = {
        sm: "clamp(120px, 28vw, 144px)",
        md: "clamp(130px, 30vw, 176px)",
        lg: "clamp(150px, 32vw, 208px)",
    };
    const accentButtonStyle = {
        backgroundColor: "var(--color-primary)",
        color: "var(--color-primary-foreground)",
    };

    return (
        <motion.div
            onClick={() => playTrack(track)}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ width: fluidWidths[size] }}
            className="flex-shrink-0 group text-left focus:outline-none"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    playTrack(track);
                }
            }}
            data-testid="music-card"
            data-track-id={track.videoId}
            data-track-title={track.title}
        >
            <div className="relative rounded-xl bg-white/[0.05] mb-3 shadow-md transition-all duration-300 group-hover:shadow-2xl ring-1 ring-white/5" style={{ width: '100%', aspectRatio: '1 / 1' }}>
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                    {hasArtwork ? (
                        <Image
                            src={track.thumbnail}
                            alt={track.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes={size === "lg" ? "208px" : size === "md" ? "176px" : "144px"}
                            onError={() => setImageFailed(true)}
                            {...(isPriority ? { priority: true, loading: "eager" as const } : {})}
                        />
                    ) : (
                        <div
                            className="absolute inset-0 flex items-end p-3"
                            style={getDynamicGradientStyle(`${track.title} ${track.artist}`)}
                        >
                            <div className="rounded-2xl bg-black/50 px-3 py-2">
                                <p className="line-clamp-2 text-xs font-semibold text-white">
                                    {track.title}
                                </p>
                                <p className="mt-1 text-[11px] text-white/60">{track.artist}</p>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">
                    {track.duration || "Live"}
                </div>
                
                <div
                    className="absolute right-3 top-3 opacity-100 sm:opacity-0 transition-opacity duration-200 group-hover:opacity-100 z-10"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    <TrackActionMenu
                        track={track}
                        triggerClassName="rounded-full bg-black/60 p-2 text-white/70 ring-1 ring-white/10 transition hover:bg-black/80 hover:text-white"
                    />
                </div>

                {/* Play + like overlay */}
                <div className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                        <div className="pointer-events-auto absolute bottom-3 right-3 flex items-center gap-2">
                            <span
                                onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                                className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors cursor-pointer"
                            >
                                <Heart className={`h-4 w-4 ${liked ? 'fill-[var(--color-primary)] text-[var(--color-primary)]' : 'text-white'}`} />
                            </span>
                            <span
                                onClick={(e) => { e.stopPropagation(); playTrack(track); }}
                                className="h-11 w-11 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform cursor-pointer"
                                style={accentButtonStyle}
                            >
                                <Play className="h-5 w-5 text-black fill-black ml-0.5" />
                            </span>
                        </div>
                    </div>
                </div>

                {/* Now playing indicator */}
                {isCurrentTrack && isPlaying && (
                    <div className="absolute bottom-2 left-2 flex items-end gap-[2px] h-3">
                        <span className="eq-bar" style={{ animationDuration: '0.5s' }} />
                        <span className="eq-bar" style={{ animationDuration: '0.7s' }} />
                        <span className="eq-bar" style={{ animationDuration: '0.4s' }} />
                    </div>
                )}
            </div>

            <p className={`text-fluid-sm font-semibold truncate ${isCurrentTrack ? 'text-[var(--color-primary)]' : 'text-white/90'}`}>
                {track.title}
            </p>
            <p className="text-fluid-xs text-white/45 truncate mt-0.5">
                {subtitle || track.artist}
            </p>
        </motion.div>
    );
}
