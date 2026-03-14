"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Check,
    ChevronLeft,
    Clock3,
    Heart,
    ListMusic,
    MoreHorizontal,
    Plus,
    Radio,
    Share2,
    StepForward,
    X,
} from "lucide-react";
import { useLibraryStore } from "@/store/library";
import { useYouTubePlayerStore, type YouTubeTrack } from "@/store/youtubePlayer";
import { createPortal } from "react-dom";

type MenuView = "menu" | "playlist" | "sleep";

interface TrackActionMenuProps {
    track: YouTubeTrack;
    align?: "left" | "right";
    side?: "top" | "bottom";
    showSleepTimer?: boolean;
    triggerClassName?: string;
    iconClassName?: string;
}

const sleepOptions = [
    { label: "15 minutes", minutes: 15 },
    { label: "30 minutes", minutes: 30 },
    { label: "45 minutes", minutes: 45 },
    { label: "1 hour", minutes: 60 },
] as const;

function formatRemainingSleep(endsAt: number | null) {
    if (!endsAt) return null;
    const remainingMs = Math.max(endsAt - Date.now(), 0);
    const remainingMinutes = Math.ceil(remainingMs / 60_000);
    return `${remainingMinutes} min left`;
}

export function TrackActionMenu({
    track,
    align = "right",
    showSleepTimer = false,
    triggerClassName = "rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white",
    iconClassName = "h-4 w-4",
}: TrackActionMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<MenuView>("menu");
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [coords, setCoords] = useState({ top: 0, left: 0, right: 0, bottom: 0, side: "bottom", align: "right" });
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => setMounted(true), []);

    const {
        addToQueue,
        playNext,
        startRadio,
        stopRadio,
        radioMode,
        setSleepTimer,
        clearSleepTimer,
        sleepTimerMode,
        sleepTimerEndsAt,
    } = useYouTubePlayerStore();
    const {
        playlists,
        createPlaylist,
        addTrackToPlaylist,
        isLiked,
        toggleLike,
    } = useLibraryStore();

    const liked = isLiked(track.videoId);
    const sleepTimerLabel = useMemo(() => {
        if (sleepTimerMode === "end_of_track") return "End of track";
        if (sleepTimerMode === "minutes") return formatRemainingSleep(sleepTimerEndsAt);
        return null;
    }, [sleepTimerEndsAt, sleepTimerMode]);

    useEffect(() => {
        if (!open) {
            setView("menu");
            setNewPlaylistName("");
            return;
        }

        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current && menuRef.current.contains(target)) return;
            const portalNode = document.getElementById("track-action-menu-portal");
            if (portalNode && portalNode.contains(target)) return;
            setOpen(false);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        
        const handleScroll = () => {
             // Close on scroll to prevent detached menus
             setOpen(false);
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);
        window.addEventListener("scroll", handleScroll, true); // true to capture all scroll events in any scrollable container
        
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [open]);

    const handleShare = async () => {
        const url = `https://music.youtube.com/watch?v=${track.videoId}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: track.title,
                    text: `${track.title} - ${track.artist}`,
                    url,
                });
            } else {
                await navigator.clipboard.writeText(url);
            }
        } catch {
            // Ignore user-dismissed share dialogs.
        } finally {
            setOpen(false);
        }
    };

    const addTrackToNewPlaylist = () => {
        const playlistId = createPlaylist(newPlaylistName, track);
        if (!playlistId) return;
        setOpen(false);
    };

    const menuButtonClassName = "group flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white active:scale-[0.98]";

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    if (!open && menuRef.current) {
                        const rect = menuRef.current.getBoundingClientRect();
                        const windowHeight = window.innerHeight;
                        const windowWidth = window.innerWidth;
                        
                        // Decide placement based on space available
                        const isBottomSpace = windowHeight - rect.bottom > 300;
                        const calcSide = isBottomSpace ? "bottom" : "top";
                        
                        const isRightSpace = windowWidth - rect.left > 288; // 18rem
                        const calcAlign = align === "left" || !isRightSpace ? "right" : "left";

                        setCoords({
                            side: calcSide,
                            align: calcAlign,
                            top: calcSide === "bottom" ? rect.bottom + 8 : 0,
                            bottom: calcSide === "top" ? windowHeight - rect.top + 8 : 0,
                            left: calcAlign === "left" ? rect.left : 0,
                            right: calcAlign === "right" ? windowWidth - rect.right : 0,
                        });
                    }
                    setOpen((value) => !value);
                }}
                className={triggerClassName}
                aria-label="Open track actions"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <MoreHorizontal className={iconClassName} />
            </button>

            {open && mounted && createPortal(
                <div
                    id="track-action-menu-portal"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    className={`fixed z-[99999] w-[18rem] rounded-[24px] border border-white/10 bg-[#050508]/95 backdrop-blur-3xl p-2 shadow-[0_28px_80px_rgba(0,0,0,0.8)] filter drop-shadow-2xl ${
                        coords.side === "top" ? "origin-bottom" : "origin-top"
                    }`}
                    style={{
                        top: coords.side === "bottom" ? coords.top : undefined,
                        bottom: coords.side === "top" ? coords.bottom : undefined,
                        left: coords.align === "left" ? coords.left : undefined,
                        right: coords.align === "right" ? coords.right : undefined,
                    }}
                >
                    {view === "menu" && (
                        <div className="space-y-1">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    playNext(track);
                                    setOpen(false);
                                }}
                                className={menuButtonClassName}
                            >
                                <StepForward className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                                Play next
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    addToQueue(track);
                                    setOpen(false);
                                }}
                                className={menuButtonClassName}
                            >
                                <ListMusic className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                                Add to queue
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setView("playlist");
                                }}
                                className={menuButtonClassName}
                            >
                                <Plus className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                                Add to playlist
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    startRadio(track);
                                    setOpen(false);
                                }}
                                className={menuButtonClassName}
                            >
                                <Radio className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                                Start mix
                            </button>
                            {radioMode && (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        stopRadio();
                                        setOpen(false);
                                    }}
                                    className={menuButtonClassName}
                                >
                                    <X className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                                    Stop radio mix
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    toggleLike(track);
                                    setOpen(false);
                                }}
                                className={menuButtonClassName}
                            >
                                <Heart className={`h-4 w-4 ${liked ? "fill-[var(--color-primary)] text-[var(--color-primary)]" : "text-white/42"}`} />
                                {liked ? "Remove from library" : "Save to library"}
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    void handleShare();
                                }}
                                className={menuButtonClassName}
                            >
                                <Share2 className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                                Share
                            </button>
                            {showSleepTimer && (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setView("sleep");
                                    }}
                                    className={menuButtonClassName}
                                >
                                    <Clock3 className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                                    <span className="flex-1">Sleep timer</span>
                                    {sleepTimerLabel && <span className="text-[11px] text-[var(--color-primary)]">{sleepTimerLabel}</span>}
                                </button>
                            )}
                        </div>
                    )}

                    {view === "playlist" && (
                        <div className="space-y-2">
                            <button type="button" onClick={() => setView("menu")} className="flex items-center gap-2 px-2 py-1 text-xs uppercase tracking-[0.22em] text-white/35 transition hover:text-white">
                                <ChevronLeft className="h-4 w-4" />
                                Playlists
                            </button>
                            <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                                {playlists.map((playlist) => {
                                    const alreadyAdded = playlist.tracks.some((item) => item.videoId === track.videoId);
                                    return (
                                        <button
                                            key={playlist.id}
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                addTrackToPlaylist(playlist.id, track);
                                                setOpen(false);
                                            }}
                                            className={menuButtonClassName}
                                        >
                                            <div className="flex-1">
                                                <p className="truncate font-medium text-white/88">{playlist.name}</p>
                                                <p className="text-xs text-white/35">{playlist.tracks.length} tracks</p>
                                            </div>
                                            {alreadyAdded && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
                                        </button>
                                    );
                                })}
                                {playlists.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-white/38">
                                        Create your first local playlist below.
                                    </div>
                                )}
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-2">
                                <input
                                    value={newPlaylistName}
                                    onChange={(event) => setNewPlaylistName(event.target.value)}
                                    placeholder="New playlist name"
                                    className="w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/24 [border:none] [box-shadow:none] [outline:none]"
                                />
                                <button
                                    type="button"
                                    onClick={addTrackToNewPlaylist}
                                    disabled={!newPlaylistName.trim()}
                                    className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Create playlist and add track
                                </button>
                            </div>
                        </div>
                    )}

                    {view === "sleep" && (
                        <div className="space-y-2">
                            <button type="button" onClick={() => setView("menu")} className="flex items-center gap-2 px-2 py-1 text-xs uppercase tracking-[0.22em] text-white/35 transition hover:text-white">
                                <ChevronLeft className="h-4 w-4" />
                                Sleep timer
                            </button>
                            <div className="space-y-1">
                                {sleepOptions.map((option) => (
                                    <button
                                        key={option.minutes}
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setSleepTimer("minutes", option.minutes);
                                            setOpen(false);
                                        }}
                                        className={menuButtonClassName}
                                    >
                                        <Clock3 className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                                        {option.label}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setSleepTimer("end_of_track");
                                        setOpen(false);
                                    }}
                                    className={menuButtonClassName}
                                >
                                    <Clock3 className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                                    Stop at end of track
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        clearSleepTimer();
                                        setOpen(false);
                                    }}
                                    className={menuButtonClassName}
                                >
                                    <Clock3 className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                                    Turn off timer
                                </button>
                            </div>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
