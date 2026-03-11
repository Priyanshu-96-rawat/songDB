'use client';

import { create } from 'zustand';
import { type YouTubeTrack } from './youtubePlayer';

export interface LocalPlaylist {
    id: string;
    name: string;
    tracks: YouTubeTrack[];
    createdAt: string;
    updatedAt: string;
}

interface LibraryState {
    likedSongs: YouTubeTrack[];
    isLiked: (videoId: string) => boolean;
    toggleLike: (track: YouTubeTrack) => void;
    recentlyPlayed: YouTubeTrack[];
    addToRecentlyPlayed: (track: YouTubeTrack) => void;
    playlists: LocalPlaylist[];
    hasHydrated: boolean;
    hydrateFromStorage: () => void;
    createPlaylist: (name: string, seedTrack?: YouTubeTrack) => string | null;
    addTrackToPlaylist: (playlistId: string, track: YouTubeTrack) => void;
    removeTrackFromPlaylist: (playlistId: string, videoId: string) => void;
    renamePlaylist: (playlistId: string, name: string) => void;
    deletePlaylist: (playlistId: string) => void;
    getPlaylistById: (playlistId: string) => LocalPlaylist | undefined;
}

const LIKED_STORAGE_KEY = 'songdb_liked';
const RECENT_STORAGE_KEY = 'songdb_recent';
const PLAYLIST_STORAGE_KEY = 'songdb_playlists';

function loadFromStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    } catch {
        return fallback;
    }
}

function saveToStorage(key: string, value: unknown) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch { /* storage full, ignore */ }
}

function createPlaylistId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistPlaylists(playlists: LocalPlaylist[]) {
    saveToStorage(PLAYLIST_STORAGE_KEY, playlists);
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
    likedSongs: [],
    recentlyPlayed: [],
    playlists: [],
    hasHydrated: false,

    hydrateFromStorage: () => {
        const likedSongs = loadFromStorage<YouTubeTrack[]>(LIKED_STORAGE_KEY, []);
        const recentlyPlayed = loadFromStorage<YouTubeTrack[]>(RECENT_STORAGE_KEY, []);
        const playlists = loadFromStorage<LocalPlaylist[]>(PLAYLIST_STORAGE_KEY, []);
        set({ likedSongs, recentlyPlayed, playlists, hasHydrated: true });
    },

    isLiked: (videoId: string) => {
        return get().likedSongs.some(t => t.videoId === videoId);
    },



    toggleLike: (track: YouTubeTrack) => {
        const { likedSongs } = get();
        const exists = likedSongs.some(t => t.videoId === track.videoId);
        const updatedLiked = exists
            ? likedSongs.filter(t => t.videoId !== track.videoId)
            : [track, ...likedSongs];

        set({ likedSongs: updatedLiked });
        saveToStorage(LIKED_STORAGE_KEY, updatedLiked);
    },



    addToRecentlyPlayed: (track: YouTubeTrack) => {
        const current = get().recentlyPlayed;
        // Remove duplicate if exists, add to front, cap at 50
        const filtered = current.filter(t => t.videoId !== track.videoId);
        const updated = [track, ...filtered].slice(0, 50);
        set({ recentlyPlayed: updated });
        saveToStorage(RECENT_STORAGE_KEY, updated);
    },

    createPlaylist: (name: string, seedTrack?: YouTubeTrack) => {
        const trimmed = name.trim();
        if (!trimmed) return null;

        const now = new Date().toISOString();
        const nextPlaylist: LocalPlaylist = {
            id: createPlaylistId(),
            name: trimmed,
            tracks: seedTrack ? [seedTrack] : [],
            createdAt: now,
            updatedAt: now,
        };

        const updated = [nextPlaylist, ...get().playlists];
        set({ playlists: updated });
        persistPlaylists(updated);
        return nextPlaylist.id;
    },

    addTrackToPlaylist: (playlistId: string, track: YouTubeTrack) => {
        const updated = get().playlists.map((playlist) => {
            if (playlist.id !== playlistId) return playlist;

            const alreadyExists = playlist.tracks.some((item) => item.videoId === track.videoId);
            return {
                ...playlist,
                tracks: alreadyExists ? playlist.tracks : [...playlist.tracks, track],
                updatedAt: new Date().toISOString(),
            };
        });

        set({ playlists: updated });
        persistPlaylists(updated);
    },

    removeTrackFromPlaylist: (playlistId: string, videoId: string) => {
        const updated = get().playlists.map((playlist) => {
            if (playlist.id !== playlistId) return playlist;

            return {
                ...playlist,
                tracks: playlist.tracks.filter((track) => track.videoId !== videoId),
                updatedAt: new Date().toISOString(),
            };
        });

        set({ playlists: updated });
        persistPlaylists(updated);
    },

    renamePlaylist: (playlistId: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        const updated = get().playlists.map((playlist) => (
            playlist.id === playlistId
                ? { ...playlist, name: trimmed, updatedAt: new Date().toISOString() }
                : playlist
        ));

        set({ playlists: updated });
        persistPlaylists(updated);
    },

    deletePlaylist: (playlistId: string) => {
        const updated = get().playlists.filter((playlist) => playlist.id !== playlistId);
        set({ playlists: updated });
        persistPlaylists(updated);
    },

    getPlaylistById: (playlistId: string) => {
        return get().playlists.find((playlist) => playlist.id === playlistId);
    },
}));
