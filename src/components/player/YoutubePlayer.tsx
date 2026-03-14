"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowUp,
    Captions,
    ChevronDown,
    ChevronUp,
    Copy,
    ListMusic,
    Loader2,
    Pause,
    Play,
    Radio,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
    ThumbsUp,
    Trash2,
    Volume1,
    Volume2,
    VolumeX,
    Waves,
    X,
} from "lucide-react";
import { getActiveLyricIndex } from "@/lib/youtube-stream";
import { audioEngine } from "@/lib/player/audioEngine";
import { TrackActionMenu } from "@/components/ui/TrackActionMenu";
import { useLibraryStore } from "@/store/library";
import { useYouTubePlayerStore, type YouTubeTrack } from "@/store/youtubePlayer";
import { formatTime, getLyricsStatus, getSleepTimerStatus } from "./playerUtils";

const chromeButton =
    "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white";
const waveHeights = Array.from({ length: 56 }, (_, index) => {
    const primary = Math.sin(index * 0.55) * 0.45;
    const secondary = Math.cos(index * 0.23) * 0.25;
    return Math.max(18, Math.round((primary + secondary + 1.2) * 34));
});

function accentStyle(alpha = 0.14, customColor?: string) {
    const color = customColor || "var(--color-primary)";
    return {
        backgroundColor: `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 24%, transparent)`,
    };
}


function ProgressBar({
    compact = false,
    progressPercent,
    bufferedPercent,
    hoverProgress,
    currentDuration,
    onSeek,
    onHover,
    onLeave,
}: {
    compact?: boolean;
    progressPercent: number;
    bufferedPercent: number;
    hoverProgress: number | null;
    currentDuration: number;
    onSeek: (event: ReactMouseEvent<HTMLDivElement>) => void;
    onHover: (event: ReactMouseEvent<HTMLDivElement>) => void;
    onLeave: () => void;
}) {
    return (
        <div
            onClick={onSeek}
            onMouseMove={onHover}
            onMouseLeave={onLeave}
            className="group relative cursor-pointer py-2"
        >
            <div className={`relative overflow-hidden rounded-full bg-white/[0.08] transition-all duration-300 group-hover:bg-white/15 ${
                compact ? "h-1" : "h-1.5 group-hover:h-2"
            }`}>
            <div className="absolute inset-0">
                <div 
                    className="absolute inset-y-0 left-0 bg-white/10 transition-all duration-300" 
                    style={{ width: `${bufferedPercent}%` }} 
                />
                <div 
                    className="absolute inset-y-0 left-0 bg-[var(--color-primary)] transition-all duration-300" 
                    style={{ width: `${progressPercent}%` }} 
                />
            </div>

            </div>

            {!compact && (
                <div
                    className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-primary)] shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)] opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ left: `calc(${progressPercent}% - 8px)` }}
                />
            )}
            
            {hoverProgress !== null && currentDuration > 0 && (
                <span
                    className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-[#282828] px-2 py-1 text-[10px] text-white"
                    style={{ left: `${(hoverProgress / currentDuration) * 100}%` }}
                >
                    {formatTime(hoverProgress)}
                </span>
            )}
        </div>
    );
}

function TrackItem({
    track,
    active,
    playing,
    actions,
    onClick,
}: {
    track: YouTubeTrack;
    active: boolean;
    playing: boolean;
    actions?: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick();
                }
            }}
            className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                active ? "border-white/15 bg-white/[0.08]" : "border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.05]"
            }`}
        >
            <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
                <Image src={track.thumbnail} alt={track.title} fill className="object-cover" sizes="44px" />
            </div>
            <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-semibold ${active ? "text-[var(--color-primary)]" : "text-white/90"}`}>
                    {track.title}
                </p>
                <p className="mt-1 truncate text-xs text-white/45">{track.artist}</p>
            </div>
            {active && playing ? (
                <Waves className="h-4 w-4 text-[var(--color-primary)]" />
            ) : (
                <span className="text-xs tabular-nums text-white/30">{track.duration}</span>
            )}
            {actions}
        </div>
    );
}

export default function YoutubePlayer() {
    const {
        currentTrack,
        isPlayerVisible,
        queue,
        upNextTracks,
        isLoadingUpNext,
        lyrics,
        isLoadingLyrics,
        autoplayEnabled,
        radioMode,
        isPlaying,
        isLoading,
        progress,
        bufferedPercent,
        duration,
        volume,
        isMuted,
        repeatMode,
        isShuffled,
        sleepTimerMode,
        sleepTimerEndsAt,
        expandedTab,
        isExpanded,
        setIsExpanded,
        setIsPlaying,
        togglePlay,
        setProgress,
        setVolume,
        toggleMute,
        cycleRepeat,
        toggleShuffle,
        removeFromQueue,
        clearQueue,
        nextTrack,
        prevTrack,
        closePlayer,
        playTrack,
        toggleAutoplay,
        startRadio,
        setExpandedTab,
        moveToTop,
        setSleepTimer,
        clearSleepTimer,
    } = useYouTubePlayerStore();
    const { isLiked, toggleLike } = useLibraryStore();

    const [expanded, setExpanded] = useState(false);
    const [hoverProgress, setHoverProgress] = useState<number | null>(null);
    const [sleepTimerNow, setSleepTimerNow] = useState(() => Date.now());
    const [accentColors, setAccentColors] = useState<{ primary: string; secondary: string; dark: string } | null>(null);
    const lyricRefs = useRef<Record<number, HTMLParagraphElement | null>>({});

    const currentDuration = duration || currentTrack?.durationSeconds || 0;
    const progressPercent = currentDuration > 0 ? Math.min((progress / currentDuration) * 100, 100) : 0;
    const liked = currentTrack ? isLiked(currentTrack.videoId) : false;
    const activeLyricIndex = useMemo(
        () => (lyrics && lyrics.timingMode !== "static" ? getActiveLyricIndex(lyrics.lines, progress * 1000) : -1),
        [lyrics, progress]
    );

    const [prevIsPlayerVisible, setPrevIsPlayerVisible] = useState(isPlayerVisible);
    if (isPlayerVisible !== prevIsPlayerVisible) {
        setPrevIsPlayerVisible(isPlayerVisible);
        if (!isPlayerVisible) {
            setIsExpanded(false);
        }
    }

    useEffect(() => {
        if (!isExpanded || expandedTab !== "lyrics" || activeLyricIndex < 0) return;
        
        const element = lyricRefs.current[activeLyricIndex];
        if (element) {
            // Use scrollTo for more reliable center alignment in some browsers/layouts
            const container = element.parentElement?.parentElement;
            if (container) {
                const elementTop = element.offsetTop;
                const elementHeight = element.offsetHeight;
                const containerHeight = container.offsetHeight;
                
                container.scrollTo({
                    top: elementTop - containerHeight / 2 + elementHeight / 2,
                    behavior: "smooth"
                });
            }
        }
    }, [activeLyricIndex, isExpanded, expandedTab, currentTrack?.videoId]);

    useEffect(() => {
        if (!currentTrack?.thumbnail) return;

        // Extract colors for dynamic theming
        async function extractColors() {
            try {
                // Use the image directly if it has CORS, or a proxy.
                // YouTube thumbnails usually work with crossOrigin, but note dynamic import for reliability.
                const { Vibrant } = await import('node-vibrant/browser');
                
                // Note: v3.2 behavior - .from() returns an builder, .getPalette() returns the promise
                const palette = await Vibrant.from(currentTrack!.thumbnail).getPalette();
                if (palette) {
                    setAccentColors({
                        primary: palette.Vibrant?.hex || "#8B5CF6",
                        secondary: palette.LightVibrant?.hex || palette.Muted?.hex || "#3B82F6",
                        dark: palette.DarkVibrant?.hex || "#121218"
                    });
                }
            } catch (error) {
                // Color extraction failed — silently use fallback
                setAccentColors(null);
            }
        }

        extractColors();
    }, [currentTrack?.videoId]);

    useEffect(() => {
        if (sleepTimerMode !== "minutes" || !sleepTimerEndsAt) return;
        const interval = window.setInterval(() => setSleepTimerNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, [sleepTimerEndsAt, sleepTimerMode]);

    if (!currentTrack || !isPlayerVisible) return null;

    const openPanel = (tab: "player" | "lyrics" | "queue") => {
        setExpandedTab(tab);
        setIsExpanded(true);
    };

    const seekFromClientX = (clientX: number, element: HTMLDivElement) => {
        if (currentDuration <= 0) return;
        const rect = element.getBoundingClientRect();
        const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        setProgress(ratio * currentDuration);
    };

    const handleProgressHover = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (currentDuration <= 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
        setHoverProgress(ratio * currentDuration);
    };

    const handleCopyTrack = async () => {
        await navigator.clipboard.writeText(`${currentTrack.title} - ${currentTrack.artist}\nhttps://music.youtube.com/watch?v=${currentTrack.videoId}`);
    };

    const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;
    const sleepTimerStatus = getSleepTimerStatus(sleepTimerMode, sleepTimerEndsAt, sleepTimerNow);

    return (
        <>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ y: "100%", opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        exit={{ y: "100%", opacity: 0 }} 
                        transition={{ type: "spring", damping: 30, stiffness: 200, mass: 1 }}
                        className="fixed inset-0 z-[60] bg-[#050508] pointer-events-auto overflow-hidden"
                    >
                        {/* Subtle gradient background — no heavy blur image */}
                        <div className="absolute inset-0 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1 }}
                                className="absolute inset-0"
                                key={`bg-${currentTrack.videoId}`}
                            >
                                <div
                                    className="absolute inset-0 opacity-30 transition-colors duration-1000"
                                    style={{
                                        background: accentColors
                                            ? `radial-gradient(ellipse at 30% 20%, ${accentColors.primary}22 0%, transparent 60%),
                                               radial-gradient(ellipse at 70% 80%, ${accentColors.secondary}22 0%, transparent 60%)`
                                            : `radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.08) 0%, transparent 60%),
                                               radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.08) 0%, transparent 60%)`
                                    }}
                                />
                            </motion.div>
                        </div>

                        {/* Content */}
                        <div className="relative flex h-full flex-col overflow-hidden">
                            {/* Top bar */}
                            <div className="flex items-center justify-between px-5 pt-4 pb-2 md:px-8 md:pt-6">
                                <button type="button" onClick={() => setIsExpanded(false)} className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white" aria-label="Collapse">
                                    <ChevronDown className="h-5 w-5" />
                                </button>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/30">Now Playing</p>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={handleCopyTrack} className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white" aria-label="Copy"><Copy className="h-4 w-4" /></button>
                                    <button type="button" onClick={closePlayer} className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button>
                                </div>
                            </div>

                            {/* Main body: two-col on desktop, single-col on mobile */}
                            <div className="flex flex-1 min-h-0 flex-col lg:flex-row lg:gap-6 lg:px-8 lg:pb-6">

                                {/* LEFT: Player column */}
                                <div className="flex flex-col items-center justify-center flex-1 min-h-0 px-6 pb-4 lg:pb-0 lg:px-0 overflow-y-auto scrollbar-hide">
                                    {/* Album art */}
                                    <div className="w-full max-w-[340px] lg:max-w-[420px] mx-auto">
                                        <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-white/[0.04] shadow-2xl">
                                            <Image src={currentTrack.thumbnail} alt={currentTrack.title} fill priority className="object-cover" sizes="(max-width: 1024px) 80vw, 420px" />
                                            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                                                {radioMode && <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">Radio</span>}
                                                {lyrics?.timingMode === "synced" && <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">Synced</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Track info */}
                                    <div className="mt-6 w-full max-w-[340px] lg:max-w-[420px] mx-auto min-w-0">
                                        <h2 className="truncate text-xl font-bold text-white md:text-2xl">{currentTrack.title}</h2>
                                        <p className="mt-0.5 truncate text-sm text-white/50">{currentTrack.artist}</p>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-5 w-full max-w-[340px] lg:max-w-[420px] mx-auto">
                                        <ProgressBar
                                            progressPercent={progressPercent}
                                            bufferedPercent={bufferedPercent}
                                            hoverProgress={hoverProgress}
                                            currentDuration={currentDuration}
                                            onSeek={(event) => seekFromClientX(event.clientX, event.currentTarget)}
                                            onHover={handleProgressHover}
                                            onLeave={() => setHoverProgress(null)}
                                        />
                                        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/35">
                                            <span>{formatTime(progress)}</span>
                                            <span>{formatTime(currentDuration)}</span>
                                        </div>
                                    </div>

                                    {/* Playback controls */}
                                    <div className="mt-5 flex w-full max-w-[340px] lg:max-w-[420px] mx-auto items-center justify-between">
                                        <button type="button" onClick={toggleShuffle} className={`p-2 transition ${isShuffled ? "text-[var(--color-primary)]" : "text-white/30 hover:text-white"}`} aria-label="Shuffle">
                                            <Shuffle className="h-5 w-5" />
                                        </button>
                                        <div className="flex items-center gap-5">
                                            <button type="button" onClick={prevTrack} className="p-1 text-white/60 transition hover:text-white" aria-label="Previous"><SkipBack className="h-6 w-6 fill-current" /></button>
                                            <button type="button" onClick={togglePlay} disabled={isLoading} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 active:scale-95 disabled:opacity-60 shadow-lg" aria-label={isPlaying ? "Pause" : "Play"}>
                                                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="ml-0.5 h-6 w-6 fill-current" />}
                                            </button>
                                            <button type="button" onClick={nextTrack} className="p-1 text-white/60 transition hover:text-white" aria-label="Next"><SkipForward className="h-6 w-6 fill-current" /></button>
                                        </div>
                                        <button type="button" onClick={cycleRepeat} className={`p-2 transition ${repeatMode !== "off" ? "text-[var(--color-primary)]" : "text-white/30 hover:text-white"}`} aria-label="Repeat">
                                            {repeatMode === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                                        </button>
                                    </div>

                                    {/* Action row: like, lyrics, queue, volume */}
                                    <div className="mt-5 flex w-full max-w-[340px] lg:max-w-[420px] mx-auto items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => toggleLike(currentTrack)} className={`rounded-full p-2.5 transition ${liked ? "text-[var(--color-primary)]" : "text-white/35 hover:text-white"}`} aria-label="Like">
                                                <ThumbsUp className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} />
                                            </button>
                                            <button type="button" onClick={() => { setExpandedTab("lyrics"); }} className={`rounded-full p-2.5 transition ${expandedTab === "lyrics" ? "text-[var(--color-primary)]" : "text-white/35 hover:text-white"}`} aria-label="Lyrics">
                                                <Captions className="h-[18px] w-[18px]" />
                                            </button>
                                            <button type="button" onClick={() => { setExpandedTab("queue"); }} className={`rounded-full p-2.5 transition ${expandedTab === "queue" ? "text-[var(--color-primary)]" : "text-white/35 hover:text-white"}`} aria-label="Queue">
                                                <ListMusic className="h-[18px] w-[18px]" />
                                            </button>
                                            <TrackActionMenu track={currentTrack} showSleepTimer triggerClassName="rounded-full p-2.5 text-white/35 transition hover:text-white" iconClassName="h-[18px] w-[18px]" />
                                        </div>
                                        <div className="flex items-center gap-2 w-28">
                                            <button type="button" onClick={toggleMute} className="text-white/35 transition hover:text-white p-1">
                                                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 0.5 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                            </button>
                                            <div className="relative group/vol flex-1 py-2">
                                                <div className="relative h-1 rounded-full bg-white/[0.1] overflow-hidden group-hover/vol:h-1.5 transition-all">
                                                    <div onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setVolume(Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)); }} className="absolute inset-0 cursor-pointer z-10" />
                                                    <div className="absolute inset-y-0 left-0 bg-white/60 group-hover/vol:bg-[var(--color-primary)] transition-all" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
                                                </div>
                                                <div className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white opacity-0 group-hover/vol:opacity-100 transition-opacity" style={{ left: `calc(${(isMuted ? 0 : volume) * 100}% - 5px)` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Side panel (Lyrics / Queue / Overview) — visible on desktop always, mobile as bottom sheet */}
                                <div className={`${expandedTab === "player" ? "hidden lg:flex" : "flex"} min-h-0 flex-col rounded-t-3xl lg:rounded-3xl bg-white/[0.03] border-t lg:border border-white/[0.06] lg:w-[420px] lg:flex-shrink-0 overflow-hidden`}>
                                    {/* Tabs */}
                                    <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
                                        <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5">
                                            {(["player", "lyrics", "queue"] as const).map((tab) => (
                                                <button key={tab} type="button" onClick={() => setExpandedTab(tab)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${expandedTab === tab ? "bg-white text-black" : "text-white/45 hover:text-white"}`}>
                                                    {tab === "player" ? "Overview" : tab === "lyrics" ? "Lyrics" : "Queue"}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="text-[10px] text-white/25 tabular-nums">{queue.length + upNextTracks.length} tracks</div>
                                    </div>

                                    {/* Tab content */}
                                    <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-28 lg:pb-4 scrollbar-hide">
                                        {expandedTab === "player" && (
                                            <div className="space-y-3">
                                                <div className="rounded-2xl bg-white/[0.03] p-4">
                                                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-3">Session</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/60">{isLoading ? "Buffering" : isPlaying ? "▶ Playing" : "⏸ Paused"}</div>
                                                        <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/60">{getLyricsStatus(lyrics)}</div>
                                                        <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/60">Autoplay: {autoplayEnabled ? "On" : "Off"}</div>
                                                        <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/60">{formatTime(currentDuration)}</div>
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl bg-white/[0.03] p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">Sleep Timer</p>
                                                        {sleepTimerMode !== "off" && <button type="button" onClick={clearSleepTimer} className="text-[10px] text-[var(--color-primary)]">Reset</button>}
                                                    </div>
                                                    <p className="text-xs text-white/50 mb-3">{sleepTimerStatus}</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {[15, 30, 45, 60].map((m) => (
                                                            <button key={m} type="button" onClick={() => setSleepTimer("minutes", m)} className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/55 transition hover:bg-white/[0.1] hover:text-white">{m}m</button>
                                                        ))}
                                                        <button type="button" onClick={() => setSleepTimer("end_of_track")} className={`rounded-full px-3 py-1.5 text-[11px] transition ${sleepTimerMode === "end_of_track" ? "text-[var(--color-primary)] font-bold bg-[var(--color-primary)]/10" : "bg-white/[0.05] text-white/55 hover:bg-white/[0.1] hover:text-white"}`}>End of track</button>
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl bg-white/[0.03] p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">Up Next</p>
                                                        {isLoadingUpNext && <Loader2 className="h-3 w-3 animate-spin text-[var(--color-primary)]" />}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {upNextTracks.slice(0, 8).map((track, index) => (
                                                            <TrackItem key={`overview-${track.videoId}-${index}`} track={track} active={currentTrack.videoId === track.videoId} playing={isPlaying} onClick={() => playTrack(track)} actions={<TrackActionMenu track={track} />} />
                                                        ))}
                                                        {!isLoadingUpNext && upNextTracks.length === 0 && <p className="py-6 text-center text-xs text-white/25">Recommendations load with context.</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {expandedTab === "lyrics" && (
                                            <div className="lyrics-mask">
                                                {isLoadingLyrics ? (
                                                    <div className="space-y-3 py-8">{Array.from({ length: 10 }).map((_, index) => <div key={index} className="h-5 rounded-full bg-white/[0.04] animate-pulse" style={{ width: `${80 - index * 3}%`, animationDelay: `${index * 80}ms` }} />)}</div>
                                                ) : lyrics ? (
                                                    <div className="space-y-2 py-8">
                                                        {lyrics.lines.map((line, index) => {
                                                            const active = index === activeLyricIndex;
                                                            const past = activeLyricIndex > index && activeLyricIndex !== -1;
                                                            return (
                                                                <p
                                                                    key={`${line.text}-${index}`}
                                                                    ref={(node) => { lyricRefs.current[index] = node; }}
                                                                    data-lyric-index={index}
                                                                    data-lyric-state={active ? "active" : past ? "past" : "idle"}
                                                                    className={`rounded-2xl px-3 py-1.5 text-lg font-medium leading-relaxed transition-all duration-500 md:text-xl ${
                                                                        active ? "bg-white/[0.06] text-white scale-[1.01] origin-left" : past ? "text-white/25" : lyrics.timingMode !== "static" ? "text-white/50" : "text-white/70"
                                                                    }`}
                                                                    style={active ? accentStyle(0.1, accentColors?.primary) : undefined}
                                                                >
                                                                    {line.text}
                                                                </p>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex h-full items-center justify-center py-20 text-center text-sm text-white/30">No lyrics available.</div>
                                                )}
                                            </div>
                                        )}

                                        {expandedTab === "queue" && (
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">Queue</p>
                                                        {queue.length > 0 && <button type="button" onClick={clearQueue} className="text-[10px] text-white/40 transition hover:text-white">Clear</button>}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {queue.map((track, index) => (
                                                            <TrackItem key={`queue-${track.videoId}-${index}`} track={track} active={currentTrack.videoId === track.videoId} playing={isPlaying} onClick={() => playTrack(track)} actions={<div className="flex items-center gap-0.5"><button type="button" onClick={(event) => { event.stopPropagation(); moveToTop(index); }} className="rounded-full p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white" aria-label="Move to top"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" onClick={(event) => { event.stopPropagation(); removeFromQueue(index); }} className="rounded-full p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white" aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button></div>} />
                                                        ))}
                                                        {queue.length === 0 && <p className="py-6 text-center text-xs text-white/25">No manual queue.</p>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">Up Next</p>
                                                        {isLoadingUpNext && <Loader2 className="h-3 w-3 animate-spin text-[var(--color-primary)]" />}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {upNextTracks.map((track, index) => (
                                                            <TrackItem key={`up-next-${track.videoId}-${index}`} track={track} active={currentTrack.videoId === track.videoId} playing={isPlaying} onClick={() => playTrack(track)} actions={<TrackActionMenu track={track} />} />
                                                        ))}
                                                        {!isLoadingUpNext && upNextTracks.length === 0 && <p className="py-6 text-center text-xs text-white/25">Recommendations load with context.</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div 
                initial={{ y: 100 }} 
                animate={{ y: 0 }} 
                exit={{ y: 100 }} 
                transition={{ type: "spring", stiffness: 260, damping: 24 }} 
                className="fixed bottom-[72px] left-0 right-0 z-[55] border-t border-white/[0.06] bg-[#181818] select-none sm:bottom-0"
                data-testid="player-bar"
            >
                <div className="grid h-[72px] grid-cols-[1fr_2fr_1fr] items-center gap-2 px-3 sm:px-4 md:px-6">
                    {/* Left: Track Info */}
                    <div className="flex min-w-0 items-center gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsExpanded(true)} 
                            className="group relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-white/[0.04]"
                        >
                            <Image 
                                src={currentTrack.thumbnail} 
                                alt={currentTrack.title} 
                                fill 
                                className="object-cover transition duration-300 group-hover:brightness-75" 
                                sizes="56px" 
                            />
                        </button>
                        <div className="min-w-0 flex-1">
                            <button 
                                type="button" 
                                onClick={() => setIsExpanded(true)} 
                                className="block max-w-full truncate text-left text-[14px] font-semibold text-white transition hover:underline"
                            >
                                {currentTrack.title}
                            </button>
                            <p className="max-w-full truncate text-left text-[12px] text-white/50">
                                {currentTrack.artist}
                            </p>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => toggleLike(currentTrack)} 
                            className={`hidden sm:block p-2 transition flex-shrink-0 ${liked ? "text-[var(--color-primary)]" : "text-white/40 hover:text-white"}`}
                            aria-label="Like"
                        >
                            <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                        </button>
                    </div>

                    {/* Center: Controls + Progress */}
                    <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-3 sm:gap-5">
                            <button 
                                type="button" 
                                onClick={() => toggleShuffle()} 
                                className={`hidden sm:block p-1 transition ${isShuffled ? "text-[var(--color-primary)]" : "text-white/50 hover:text-white"}`}
                                aria-label="Shuffle"
                            >
                                <Shuffle className="h-4 w-4" />
                            </button>
                            <button 
                                type="button" 
                                onClick={prevTrack} 
                                className="p-1 text-white/60 transition hover:text-white" 
                                aria-label="Previous"
                            >
                                <SkipBack className="h-5 w-5 fill-current" />
                            </button>
                            <button 
                                type="button" 
                                onClick={togglePlay} 
                                disabled={isLoading} 
                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 active:scale-95 disabled:opacity-60"
                                aria-label={isPlaying ? "Pause" : "Play"}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isPlaying ? (
                                    <Pause className="h-4 w-4 fill-current" />
                                ) : (
                                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                                )}
                            </button>
                            <button 
                                type="button" 
                                onClick={nextTrack} 
                                className="p-1 text-white/60 transition hover:text-white" 
                                aria-label="Next"
                            >
                                <SkipForward className="h-5 w-5 fill-current" />
                            </button>
                            <button 
                                type="button" 
                                onClick={() => cycleRepeat()} 
                                className={`hidden sm:block p-1 transition relative ${repeatMode !== "off" ? "text-[var(--color-primary)]" : "text-white/50 hover:text-white"}`}
                                aria-label="Repeat"
                            >
                                {repeatMode === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                                {repeatMode !== "off" && (
                                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex h-1 w-1 rounded-full bg-[var(--color-primary)]" />
                                )}
                            </button>
                        </div>
                        <div className="flex w-full items-center gap-2">
                            <span className="w-9 text-right text-[11px] tabular-nums text-white/40">{formatTime(progress)}</span>
                            <div className="flex-1">
                                <ProgressBar
                                    compact
                                    progressPercent={progressPercent}
                                    bufferedPercent={bufferedPercent}
                                    hoverProgress={hoverProgress}
                                    currentDuration={currentDuration}
                                    onSeek={(event) => seekFromClientX(event.clientX, event.currentTarget)}
                                    onHover={handleProgressHover}
                                    onLeave={() => setHoverProgress(null)}
                                />
                            </div>
                            <span className="w-9 text-[11px] tabular-nums text-white/40">{formatTime(currentDuration)}</span>
                        </div>
                    </div>

                    {/* Right: Utilities */}
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                        <div className="flex items-center rounded-full border border-white/[0.06] bg-white/[0.03] p-0.5">
                            <button 
                                type="button" 
                                onClick={() => openPanel("lyrics")} 
                                className={`rounded-full p-2 transition ${expandedTab === "lyrics" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                                title="Lyrics"
                            >
                                <Captions className="h-3.5 w-3.5" />
                            </button>
                            <button 
                                type="button" 
                                onClick={() => openPanel("queue")} 
                                className={`rounded-full p-2 transition ${expandedTab === "queue" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                                title="Queue"
                            >
                                <ListMusic className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        
                        <div className="hidden items-center gap-2 lg:flex ml-2">
                            <button type="button" onClick={toggleMute} className="text-white/40 transition hover:text-white p-1">
                                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 0.5 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </button>
                            <div className="w-24 group/vol relative py-2">
                                <div className="relative h-1 rounded-full bg-white/[0.12] overflow-hidden group-hover/vol:h-1.5 transition-all">
                                    <div 
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const val = (e.clientX - rect.left) / rect.width;
                                            setVolume(Math.min(Math.max(val, 0), 1));
                                        }}
                                        className="absolute inset-0 cursor-pointer z-10"
                                    />
                                    <div 
                                        className="absolute inset-y-0 left-0 bg-white/70 group-hover/vol:bg-[var(--color-primary)] transition-all" 
                                        style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} 
                                    />
                                </div>
                                <div 
                                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity group-hover/vol:opacity-100"
                                    style={{ left: `calc(${(isMuted ? 0 : volume) * 100}% - 6px)` }}
                                />
                            </div>
                        </div>

                        <button 
                            type="button" 
                            onClick={() => setIsExpanded(true)} 
                            className="p-2 text-white/40 transition hover:text-white"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
