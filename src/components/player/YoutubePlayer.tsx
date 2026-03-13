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

const chromeButton =
    "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white";
const waveHeights = Array.from({ length: 56 }, (_, index) => {
    const primary = Math.sin(index * 0.55) * 0.45;
    const secondary = Math.cos(index * 0.23) * 0.25;
    return Math.max(18, Math.round((primary + secondary + 1.2) * 34));
});

function formatTime(value: number) {
    if (!Number.isFinite(value) || value <= 0) return "0:00";
    const total = Math.floor(value);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function accentStyle(alpha = 0.14) {
    return {
        backgroundColor: `color-mix(in srgb, var(--color-primary) ${Math.round(alpha * 100)}%, transparent)`,
        borderColor: `color-mix(in srgb, var(--color-primary) 24%, transparent)`,
    };
}

function getLyricsStatus(lyrics: typeof useYouTubePlayerStore.getState extends () => infer T ? T extends { lyrics: infer L } ? L : never : never) {
    if (!lyrics) return "Unavailable";
    if (lyrics.timingMode === "synced") return "Synced";
    if (lyrics.timingMode === "estimated") return "Estimated";
    return "Static";
}

function getSleepTimerStatus(mode: "off" | "minutes" | "end_of_track", endsAt: number | null, now: number) {
    if (mode === "end_of_track") return "End of track";
    if (mode === "minutes" && endsAt) {
        const remainingMs = Math.max(endsAt - now, 0);
        const remainingMinutes = Math.ceil(remainingMs / 60_000);
        return `${remainingMinutes} min left`;
    }
    return "Off";
}

function WaveProgressBar({
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
    // Reduce number of bars in compact mode for performance
    const bars = compact ? waveHeights.filter((_, i) => i % 2 === 0) : waveHeights;
    
    return (
        <div
            onClick={onSeek}
            onMouseMove={onHover}
            onMouseLeave={onLeave}
            className={`group relative cursor-pointer overflow-hidden rounded-full border border-white/5 bg-white/[0.02] ${
                compact ? "h-1.5" : "h-14"
            }`}
        >
            {!compact ? (
                <div className="wave-progress-grid px-3 py-2">
                    {bars.map((height, index) => {
                        const marker = ((index + 1) / bars.length) * 100;
                        const stateClass =
                            marker <= progressPercent
                                ? "wave-progress-bar-active"
                                : marker <= bufferedPercent
                                    ? "wave-progress-bar-buffered"
                                    : "wave-progress-bar-idle";

                        return (
                            <span
                                key={index}
                                className={`wave-progress-bar ${stateClass}`}
                                style={{
                                    height: `${height}%`,
                                    animationDelay: `${index * 36}ms`,
                                }}
                            />
                        );
                    })}
                </div>
            ) : (
                // Simple progress bar for compact mode to save CPU/GPU
                <div className="absolute inset-0 flex items-center px-0">
                    <div className="relative h-full w-full bg-white/10">
                        <div 
                            className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-300" 
                            style={{ width: `${bufferedPercent}%` }} 
                        />
                        <div 
                            className="absolute inset-y-0 left-0 bg-[var(--color-primary)] transition-all duration-300" 
                            style={{ width: `${progressPercent}%` }} 
                        />
                    </div>
                </div>
            )}

            {!compact && (
                <div
                    className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/60 bg-white shadow-[0_10px_28px_rgba(255,255,255,0.22)] opacity-0 transition group-hover:opacity-100"
                    style={{ left: `calc(${progressPercent}% - 8px)` }}
                />
            )}
            
            {hoverProgress !== null && currentDuration > 0 && (
                <span
                    className="pointer-events-none absolute -top-9 rounded-full bg-black/75 px-2 py-1 text-[11px] text-white"
                    style={{ left: `calc(${(hoverProgress / currentDuration) * 100}% - 18px)` }}
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
                <p className="truncate text-xs text-white/45">{track.artist}</p>
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
            setExpanded(false);
        }
    }

    useEffect(() => {
        if (!expanded || expandedTab !== "lyrics" || activeLyricIndex < 0) return;
        lyricRefs.current[activeLyricIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [activeLyricIndex, expanded, expandedTab, currentTrack?.videoId]);

    useEffect(() => {
        if (sleepTimerMode !== "minutes" || !sleepTimerEndsAt) return;
        const interval = window.setInterval(() => setSleepTimerNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, [sleepTimerEndsAt, sleepTimerMode]);

    if (!currentTrack || !isPlayerVisible) return null;

    const openPanel = (tab: "player" | "lyrics" | "queue") => {
        setExpandedTab(tab);
        setExpanded(true);
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
                {expanded && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-2xl">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,255,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(0,204,204,0.14),transparent_40%)]" />
                        <div className="relative flex h-full flex-col gap-4 px-4 pb-28 pt-4 md:px-8 md:pb-24 md:pt-6">
                            <div className="flex items-center justify-between">
                                <div className="text-xs uppercase tracking-[0.32em] text-white/35">Immersive Player</div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={handleCopyTrack} className={`${chromeButton} h-10 w-10`} aria-label="Copy track details"><Copy className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => setExpanded(false)} className={`${chromeButton} h-10 w-10`} aria-label="Collapse player"><ChevronDown className="h-4 w-4" /></button>
                                    <button type="button" onClick={closePlayer} className={`${chromeButton} h-10 w-10`} aria-label="Close player"><X className="h-4 w-4" /></button>
                                </div>
                            </div>

                            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)]">
                                <section className="glass-strong flex min-h-0 flex-col rounded-[34px] p-6 md:p-8">
                                    <div className="relative aspect-square overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
                                        <Image src={currentTrack.thumbnail} alt={currentTrack.title} fill priority className="object-cover" sizes="(max-width: 1024px) 72vw, 38vw" />
                                        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,7,10,0.7),transparent_40%)]" />
                                        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                                            {radioMode && <span className="rounded-full border px-3 py-1 text-xs text-[var(--color-primary)]" style={accentStyle()}>Radio</span>}
                                            {lyrics?.timingMode === "synced" && <span className="rounded-full border px-3 py-1 text-xs text-[var(--color-primary)]" style={accentStyle()}>Synced Lyrics</span>}
                                            {lyrics?.timingMode === "estimated" && <span className="rounded-full border px-3 py-1 text-xs text-[var(--color-primary)]" style={accentStyle()}>Estimated Lyrics</span>}
                                        </div>
                                    </div>
                                    <div className="mt-5 min-w-0">
                                        <h2 className="truncate text-2xl font-semibold text-white md:text-3xl">{currentTrack.title}</h2>
                                        <p className="mt-1 truncate text-sm text-white/55 md:text-base">{currentTrack.artist}</p>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <button type="button" onClick={() => toggleLike(currentTrack)} className={`${chromeButton} h-10 px-4 ${liked ? "text-[var(--color-primary)] font-bold" : ""}`} style={liked ? accentStyle() : undefined}><ThumbsUp className={`mr-2 h-4 w-4 ${liked ? "fill-current" : ""}`} />{liked ? "Liked" : "Like"}</button>

                                        <button type="button" onClick={() => startRadio(currentTrack)} className={`${chromeButton} h-10 px-4 ${radioMode ? "text-[var(--color-primary)]" : ""}`} style={radioMode ? accentStyle() : undefined}><Radio className="mr-2 h-4 w-4" />Radio</button>
                                        <button type="button" onClick={toggleAutoplay} className={`${chromeButton} h-10 px-4 ${autoplayEnabled ? "text-[var(--color-primary)]" : ""}`} style={autoplayEnabled ? accentStyle() : undefined}><ListMusic className="mr-2 h-4 w-4" />Autoplay</button>
                                        <TrackActionMenu track={currentTrack} showSleepTimer triggerClassName={`${chromeButton} h-10 w-10`} />
                                    </div>
                                    <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6 text-white/20">
                                        <div className="flex items-center gap-6 text-[10px] font-medium uppercase tracking-[0.2em]">
                                            <p>Highest quality enabled</p>
                                            <p>Lossless streaming</p>
                                            <p>Synced with cloud</p>
                                        </div>
                                        <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-primary)] opacity-40">Made by Priyanshu</p>
                                    </div>
                                    <div className="mt-auto pt-6">
                                        <div className="mb-2 flex items-center justify-between text-xs text-white/40">
                                            <span>{formatTime(progress)}</span>
                                            <span>{formatTime(currentDuration)}</span>
                                        </div>
                                        <WaveProgressBar
                                            progressPercent={progressPercent}
                                            bufferedPercent={bufferedPercent}
                                            hoverProgress={hoverProgress}
                                            currentDuration={currentDuration}
                                            onSeek={(event) => seekFromClientX(event.clientX, event.currentTarget)}
                                            onHover={handleProgressHover}
                                            onLeave={() => setHoverProgress(null)}
                                        />
                                        <div className="mt-6 flex items-center justify-center gap-3">
                                            <button type="button" onClick={prevTrack} className={`${chromeButton} h-10 w-10`} aria-label="Previous track"><SkipBack className="h-5 w-5 fill-current" /></button>
                                            <button type="button" onClick={togglePlay} disabled={isLoading} className="inline-flex h-16 w-16 items-center justify-center rounded-full text-black transition hover:scale-[1.03] disabled:opacity-60" style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }} aria-label={isLoading ? "Loading track" : isPlaying ? "Pause" : "Play"}>
                                                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="ml-0.5 h-6 w-6 fill-current" />}
                                            </button>
                                            <button type="button" onClick={nextTrack} className={`${chromeButton} h-10 w-10`} aria-label="Next track"><SkipForward className="h-5 w-5 fill-current" /></button>
                                        </div>
                                    </div>
                                </section>

                                <section className="glass-strong flex min-h-0 flex-col rounded-[34px] p-4 md:p-5">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                                            {(["player", "lyrics", "queue"] as const).map((tab) => (
                                                <button key={tab} type="button" onClick={() => setExpandedTab(tab)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${expandedTab === tab ? "bg-white text-black" : "text-white/50 hover:text-white"}`}>
                                                    {tab === "player" ? "Overview" : tab === "lyrics" ? "Lyrics" : "Queue"}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="text-xs text-white/35">{queue.length} queued · {upNextTracks.length} up next</div>
                                    </div>

                                    {expandedTab === "player" && (
                                        <div className="space-y-4 overflow-y-auto">
                                            <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                                                <p className="text-xs uppercase tracking-[0.28em] text-white/35">Current Session</p>
                                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-white/70">Playback: {isLoading ? "Buffering" : isPlaying ? "Playing" : "Paused"}</div>
                                                    <div className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-white/70">Lyrics: {getLyricsStatus(lyrics)}</div>
                                                    <div className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-white/70">Autoplay: {autoplayEnabled ? "On" : "Off"}</div>
                                                    <div className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-white/70">Duration: {formatTime(currentDuration)}</div>
                                                    <div className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-white/70 font-medium text-[var(--color-primary)]">Sleep timer: {sleepTimerStatus}</div>
                                                </div>
                                            </div>
                                            <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.28em] text-white/35">Sleep Timer</p>
                                                        <p className="mt-1 text-sm text-white/45">Schedule an automatic stop for your playback.</p>
                                                    </div>
                                                    {sleepTimerMode !== "off" && (
                                                        <button type="button" onClick={clearSleepTimer} className="text-xs text-[var(--color-primary)] transition hover:opacity-80">
                                                            Reset timer
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="mt-4 rounded-2xl bg-white/[0.03] p-4">
                                                    <p className="text-sm font-semibold text-white">Status: {sleepTimerStatus}</p>
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {[15, 30, 45, 60].map((minutes) => (
                                                            <button
                                                                key={minutes}
                                                                type="button"
                                                                onClick={() => setSleepTimer("minutes", minutes)}
                                                                className="rounded-full bg-white/[0.04] px-4 py-2 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                                                            >
                                                                {minutes}m
                                                            </button>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => setSleepTimer("end_of_track")}
                                                            className={`rounded-full px-4 py-2 text-sm transition ${sleepTimerMode === "end_of_track" ? "text-[var(--color-primary)] font-bold" : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"}`}
                                                            style={sleepTimerMode === "end_of_track" ? accentStyle() : undefined}
                                                        >
                                                            End of track
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                                                <div className="mb-3 flex items-center justify-between">
                                                    <p className="text-xs uppercase tracking-[0.28em] text-white/35">Recommendations</p>
                                                    {isLoadingUpNext && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />}
                                                </div>
                                                <div className="space-y-2">
                                                    {upNextTracks.slice(0, 6).map((track, index) => (
                                                        <TrackItem key={`overview-${track.videoId}-${index}`} track={track} active={currentTrack.videoId === track.videoId} playing={isPlaying} onClick={() => playTrack(track)} actions={<TrackActionMenu track={track} />} />
                                                    ))}
                                                    {!isLoadingUpNext && upNextTracks.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/35">Recommendations will appear here once the context loads.</div>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {expandedTab === "lyrics" && (
                                        <div className="lyrics-mask flex-1 overflow-y-auto pr-2">
                                            {isLoadingLyrics ? (
                                                <div className="space-y-3 py-10">{Array.from({ length: 10 }).map((_, index) => <div key={index} className="h-6 rounded-full bg-white/[0.05]" style={{ width: `${84 - index * 4}%` }} />)}</div>
                                            ) : lyrics ? (
                                                <div className="space-y-3 py-10">
                                                    {lyrics.lines.map((line, index) => {
                                                        const active = index === activeLyricIndex;
                                                        const past = activeLyricIndex > index && activeLyricIndex !== -1;
                                                        return (
                                                            <p key={`${line.text}-${index}`} ref={(node) => { lyricRefs.current[index] = node; }} data-lyric-index={index} data-lyric-state={active ? "active" : past ? "past" : "idle"} className={`rounded-2xl px-4 py-2 text-xl font-medium leading-relaxed transition md:text-2xl ${active ? "bg-white/[0.08] text-white" : past ? "text-white/28" : lyrics.timingMode !== "static" ? "text-white/55" : "text-white/78"}`} style={active ? accentStyle() : undefined}>
                                                                {line.text}
                                                            </p>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] text-center text-sm text-white/35">No lyrics available for this track.</div>
                                            )}
                                        </div>
                                    )}

                                    {expandedTab === "queue" && (
                                        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
                                            <div className="flex min-h-0 flex-col rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                                                <div className="mb-3 flex items-center justify-between">
                                                    <p className="text-xs uppercase tracking-[0.28em] text-white/35">Queue</p>
                                                    {queue.length > 0 && <button type="button" onClick={clearQueue} className="text-xs text-white/45 transition hover:text-white">Clear all</button>}
                                                </div>
                                                <div className="space-y-2 overflow-y-auto pr-1">
                                                    {queue.map((track, index) => (
                                                        <TrackItem key={`queue-${track.videoId}-${index}`} track={track} active={currentTrack.videoId === track.videoId} playing={isPlaying} onClick={() => playTrack(track)} actions={<div className="flex items-center gap-1"><button type="button" onClick={(event) => { event.stopPropagation(); moveToTop(index); }} className="rounded-full p-2 text-white/35 transition hover:bg-white/10 hover:text-white" aria-label="Move to top"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={(event) => { event.stopPropagation(); removeFromQueue(index); }} className="rounded-full p-2 text-white/35 transition hover:bg-white/10 hover:text-white" aria-label="Remove from queue"><Trash2 className="h-4 w-4" /></button></div>} />
                                                    ))}
                                                    {queue.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/35">No manual queue yet.</div>}
                                                </div>
                                            </div>
                                            <div className="flex min-h-0 flex-col rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                                                <div className="mb-3 flex items-center justify-between">
                                                    <p className="text-xs uppercase tracking-[0.28em] text-white/35">Up Next</p>
                                                    {isLoadingUpNext && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />}
                                                </div>
                                                <div className="space-y-2 overflow-y-auto pr-1">
                                                    {upNextTracks.slice(0, 18).map((track, index) => (
                                                        <TrackItem key={`up-next-${track.videoId}-${index}`} track={track} active={currentTrack.videoId === track.videoId} playing={isPlaying} onClick={() => playTrack(track)} actions={<TrackActionMenu track={track} />} />
                                                    ))}
                                                    {!isLoadingUpNext && upNextTracks.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/35">Recommendations will appear here once the track context loads.</div>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div 
                initial={{ y: 100 }} 
                animate={{ y: 0 }} 
                exit={{ y: 100 }} 
                transition={{ type: "spring", stiffness: 260, damping: 20 }} 
                className="fixed bottom-[72px] left-0 right-0 z-[55] border-t border-white/5 bg-black/40 backdrop-blur-lg select-none sm:bottom-0"
                data-testid="player-bar"
            >
                {/* Thin progress bar at the very top of the bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5">
                    <div 
                        className="h-full bg-[var(--color-primary)] transition-all duration-500 ease-out" 
                        style={{ width: `${progressPercent}%` }} 
                    />
                </div>

                <div className="flex h-16 items-center justify-between px-4 md:px-6">
                    {/* Left: Track Info */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <button 
                            type="button" 
                            onClick={() => setExpanded(true)} 
                            className="group relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]"
                        >
                            <Image 
                                src={currentTrack.thumbnail} 
                                alt={currentTrack.title} 
                                fill 
                                className="object-cover transition duration-300 group-hover:scale-110" 
                                sizes="40px" 
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                                <ChevronUp className="h-4 w-4 text-white" />
                            </div>
                        </button>
                        <div className="min-w-0 flex-1">
                            <button 
                                type="button" 
                                onClick={() => setExpanded(true)} 
                                className="block max-w-full truncate text-left text-sm font-medium text-white transition hover:text-[var(--color-primary)]"
                            >
                                {currentTrack.title}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => openPanel("player")} 
                                className="block max-w-full truncate text-left text-[11px] text-white/40 transition hover:text-white"
                            >
                                {currentTrack.artist}
                            </button>
                        </div>
                    </div>

                    {/* Center: Essential Controls */}
                    <div className="flex items-center gap-1 sm:gap-4 px-4">
                        <button 
                            type="button" 
                            onClick={prevTrack} 
                            className="p-2 text-white/60 transition hover:text-white" 
                            aria-label="Previous track"
                        >
                            <SkipBack className="h-5 w-5 fill-current" />
                        </button>
                        <button 
                            type="button" 
                            onClick={togglePlay} 
                            disabled={isLoading} 
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 active:scale-95 disabled:opacity-60"
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
                            className="p-2 text-white/60 transition hover:text-white" 
                            aria-label="Next track"
                        >
                            <SkipForward className="h-5 w-5 fill-current" />
                        </button>
                    </div>

                    {/* Right: Actions & Utils */}
                    <div className="flex flex-1 items-center justify-end gap-1 md:gap-3">
                        <div className="hidden items-center gap-1 sm:flex">
                            <button 
                                type="button" 
                                onClick={() => toggleLike(currentTrack)} 
                                className={`p-2 transition ${liked ? "text-[var(--color-primary)]" : "text-white/40 hover:text-white"}`}
                                aria-label="Like"
                            >
                                <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                            </button>
                        </div>

                        <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-1">
                            <button 
                                type="button" 
                                onClick={() => openPanel("lyrics")} 
                                className={`rounded-full p-2.5 transition ${expandedTab === "lyrics" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                                title="Lyrics"
                            >
                                <Captions className="h-4 w-4" />
                            </button>
                            <button 
                                type="button" 
                                onClick={() => openPanel("queue")} 
                                className={`rounded-full p-2.5 transition ${expandedTab === "queue" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                                title="Queue"
                            >
                                <ListMusic className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="hidden items-center gap-2 lg:flex ml-2">
                             <button type="button" onClick={toggleMute} className="text-white/40 transition hover:text-white">
                                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </button>
                        </div>

                        <button 
                            type="button" 
                            onClick={() => setExpanded(true)} 
                            className="ml-2 p-2 text-white/40 transition hover:text-white"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
