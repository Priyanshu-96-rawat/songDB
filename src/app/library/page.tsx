"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Clock, Heart, ListMusic, Music2, Play, Plus, Shuffle, Trash2 } from "lucide-react";
import { TrackRow } from "@/components/ui/TrackRow";
import { useLibraryStore } from "@/store/library";
import { useYouTubePlayerStore } from "@/store/youtubePlayer";

type LibraryTab = "liked" | "recent" | "playlists";

export default function LibraryPage() {
    const {
        likedSongs,
        recentlyPlayed,
        playlists,
        createPlaylist,
        deletePlaylist,
        getPlaylistById,
    } = useLibraryStore();
    const { playTrack, addToQueue } = useYouTubePlayerStore();
    const [activeTab, setActiveTab] = useState<LibraryTab>("liked");
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const accentButtonStyle = {
        backgroundColor: "var(--color-primary)",
        color: "var(--color-primary-foreground)",
    };

    const selectedPlaylist = useMemo(
        () => (selectedPlaylistId ? getPlaylistById(selectedPlaylistId) ?? null : null),
        [getPlaylistById, selectedPlaylistId]
    );

    const tracks = activeTab === "liked"
        ? likedSongs
        : activeTab === "recent"
            ? recentlyPlayed
            : selectedPlaylist?.tracks ?? [];

    const playAll = () => {
        if (tracks.length === 0) return;
        playTrack(tracks[0]);
        tracks.slice(1).forEach(t => addToQueue(t));
    };

    const shufflePlay = () => {
        if (tracks.length === 0) return;
        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
        playTrack(shuffled[0]);
        shuffled.slice(1).forEach(t => addToQueue(t));
    };

    const createNewPlaylist = () => {
        const playlistId = createPlaylist(newPlaylistName);
        if (!playlistId) return;
        setNewPlaylistName("");
        setActiveTab("playlists");
        setSelectedPlaylistId(playlistId);
    };

    return (
        <div className="px-6 py-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Your Library</h1>
                <p className="text-white/40 text-sm">
                    {activeTab === "playlists"
                        ? selectedPlaylist
                            ? `${selectedPlaylist.tracks.length} tracks in ${selectedPlaylist.name}`
                            : "Your local playlists, saved for quick playback"
                        : "Your saved music and listening history"}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => setActiveTab("liked")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === "liked"
                            ? ""
                            : "bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1]"
                        }`}
                    style={activeTab === "liked" ? accentButtonStyle : undefined}
                >
                    <Heart className={`h-4 w-4 ${activeTab === "liked" ? "fill-black" : ""}`} />
                    Liked Songs
                    <span className="text-xs opacity-70">({likedSongs.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab("recent")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === "recent"
                            ? ""
                            : "bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1]"
                        }`}
                    style={activeTab === "recent" ? accentButtonStyle : undefined}
                >
                    <Clock className="h-4 w-4" />
                    Recently Played
                    <span className="text-xs opacity-70">({recentlyPlayed.length})</span>
                </button>
                <button
                    onClick={() => {
                        setActiveTab("playlists");
                        setSelectedPlaylistId(null);
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === "playlists"
                            ? ""
                            : "bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1]"
                        }`}
                    style={activeTab === "playlists" ? accentButtonStyle : undefined}
                >
                    <ListMusic className="h-4 w-4" />
                    Playlists
                    <span className="text-xs opacity-70">({playlists.length})</span>
                </button>
            </div>

            {/* Action buttons */}
            {tracks.length > 0 && (
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={playAll}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:brightness-110"
                        style={accentButtonStyle}
                    >
                        <Play className="h-4 w-4 fill-black" />
                        Play All
                    </button>
                    <button
                        onClick={shufflePlay}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/[0.06] text-white/80 font-medium text-sm hover:bg-white/[0.1] transition-colors"
                    >
                        <Shuffle className="h-4 w-4" />
                        Shuffle
                    </button>
                    {activeTab === "playlists" && selectedPlaylist && (
                        <button
                            onClick={() => {
                                deletePlaylist(selectedPlaylist.id);
                                setSelectedPlaylistId(null);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] text-white/70 font-medium text-sm hover:bg-white/[0.1] hover:text-white transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Playlist
                        </button>
                    )}
                </div>
            )}

            {activeTab === "playlists" && !selectedPlaylist ? (
                <div className="space-y-6">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-lg font-semibold text-white">Create a playlist</p>
                                <p className="mt-1 text-sm text-white/45">Tracks added from the action menus land here instantly.</p>
                            </div>
                            <div className="flex w-full max-w-xl gap-3">
                                <input
                                    value={newPlaylistName}
                                    onChange={(event) => setNewPlaylistName(event.target.value)}
                                    placeholder="Night drive, gym set, focus loop..."
                                    className="h-12 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/24 [outline:none]"
                                />
                                <button
                                    onClick={createNewPlaylist}
                                    disabled={!newPlaylistName.trim()}
                                    className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                    style={accentButtonStyle}
                                >
                                    <Plus className="h-4 w-4" />
                                    New Playlist
                                </button>
                            </div>
                        </div>
                    </div>

                    {playlists.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {playlists.map((playlist) => (
                                <button
                                    key={playlist.id}
                                    type="button"
                                    onClick={() => setSelectedPlaylistId(playlist.id)}
                                    className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-white/16 hover:bg-white/[0.05]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-lg font-semibold text-white">{playlist.name}</p>
                                            <p className="mt-1 text-sm text-white/40">{playlist.tracks.length} tracks</p>
                                        </div>
                                        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/30">
                                            Local
                                        </span>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2">
                                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full text-black" style={accentButtonStyle}>
                                            <Play className="ml-0.5 h-4 w-4 fill-current" />
                                        </span>
                                        <span className="text-sm text-white/45">Open playlist</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                            <ListMusic className="h-16 w-16 text-white/10 mb-4" />
                            <p className="text-lg font-semibold text-white/30">No playlists yet</p>
                            <p className="text-sm text-white/20 mt-1">Create one here or use Add to playlist from any track menu.</p>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {activeTab === "playlists" && selectedPlaylist && (
                        <div className="mb-5 flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3">
                            <button
                                onClick={() => setSelectedPlaylistId(null)}
                                className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                All playlists
                            </button>
                            <div className="text-right">
                                <p className="text-sm font-medium text-white">{selectedPlaylist.name}</p>
                                <p className="text-xs text-white/35">{selectedPlaylist.tracks.length} tracks</p>
                            </div>
                        </div>
                    )}

                    {tracks.length > 0 ? (
                        <div className="space-y-0.5">
                            {tracks.map((track, i) => (
                                <TrackRow key={`${track.videoId}-${i}`} track={track} index={i} showIndex />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Music2 className="h-16 w-16 text-white/10 mb-4" />
                            <p className="text-lg font-semibold text-white/30">
                                {activeTab === "liked"
                                    ? "No liked songs yet"
                                    : activeTab === "recent"
                                        ? "No recently played songs"
                                        : "This playlist is empty"}
                            </p>
                            <p className="text-sm text-white/20 mt-1">
                                {activeTab === "liked"
                                    ? "Tap the heart icon on any song to save it here"
                                    : activeTab === "recent"
                                        ? "Songs you play will appear here"
                                        : "Use Add to playlist from any track menu to fill it."}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
