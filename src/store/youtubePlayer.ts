import { create } from 'zustand';
import type { TrackLyrics } from '@/lib/youtube-stream';
import { audioEngine } from '@/lib/player/audioEngine';

export interface YouTubeTrack {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    durationSeconds: number;
    album?: string;
    albumId?: string;
}

export interface YouTubePlayerState {
    // Current track
    currentTrack: YouTubeTrack | null;
    isExpanded: boolean;

    // Queue
    queue: YouTubeTrack[];
    history: YouTubeTrack[];

    // Up Next (auto-mix from YouTube Music)
    upNextTracks: YouTubeTrack[];
    isLoadingUpNext: boolean;

    // Lyrics
    lyrics: TrackLyrics | null;
    isLoadingLyrics: boolean;

    // Autoplay & Radio
    autoplayEnabled: boolean;
    radioMode: boolean;

    // Playback state
    isPlaying: boolean;
    isLoading: boolean;
    error: string | null;
    progress: number;
    bufferedPercent: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    repeatMode: 'off' | 'all' | 'one';
    isShuffled: boolean;
    sleepTimerMode: 'off' | 'minutes' | 'end_of_track';
    sleepTimerEndsAt: number | null;

    // Player visibility
    isPlayerVisible: boolean;

    // Expanded player tab
    expandedTab: 'player' | 'lyrics' | 'queue';

    // Actions
    playTrack: (track: YouTubeTrack) => void;
    setIsExpanded: (expanded: boolean) => void;
    setIsPlaying: (playing: boolean) => void;
    togglePlay: () => void;
    setIsLoading: (loading: boolean) => void;
    setProgress: (progress: number) => void;
    setDuration: (duration: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    cycleRepeat: () => void;
    toggleShuffle: () => void;
    addToQueue: (track: YouTubeTrack) => void;
    playNext: (track: YouTubeTrack) => void;
    removeFromQueue: (index: number) => void;
    clearQueue: () => void;
    nextTrack: () => YouTubeTrack | null;
    prevTrack: () => YouTubeTrack | null;
    handleTrackEnded: () => YouTubeTrack | null;
    closePlayer: () => void;

    // New actions
    setLyrics: (lyrics: TrackLyrics | null) => void;
    setIsLoadingLyrics: (loading: boolean) => void;
    fetchLyrics: (videoId: string, durationSeconds?: number) => Promise<void>;
    setUpNextTracks: (tracks: YouTubeTrack[]) => void;
    fetchUpNext: (videoId: string) => Promise<void>;
    toggleAutoplay: () => void;
    startRadio: (track: YouTubeTrack) => void;
    setExpandedTab: (tab: 'player' | 'lyrics' | 'queue') => void;
    moveToTop: (index: number) => void;
    setSleepTimer: (mode: 'off' | 'minutes' | 'end_of_track', minutes?: number) => void;
    clearSleepTimer: () => void;
    prefetchNextTrack: () => void;
}


let sleepTimerTimeout: ReturnType<typeof setTimeout> | null = null;

function clearSleepTimerTimeout() {
    if (sleepTimerTimeout !== null) {
        clearTimeout(sleepTimerTimeout);
        sleepTimerTimeout = null;
    }
}

function loadStoredValue<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) as T : fallback;
    } catch {
        return fallback;
    }
}

function saveStoredValue(key: string, value: unknown) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage errors.
    }
}

export const useYouTubePlayerStore = create<YouTubePlayerState>((set, get) => {

    // AudioEngine handles direct store updates via its own events (timeupdate, loadedmetadata, ended)
    if (typeof window !== 'undefined') {
        // Initialize Media Session API hooks on mount
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => get().setIsPlaying(true));
            navigator.mediaSession.setActionHandler('pause', () => get().setIsPlaying(false));
            navigator.mediaSession.setActionHandler('previoustrack', () => { get().prevTrack(); });
            navigator.mediaSession.setActionHandler('nexttrack', () => { get().nextTrack(); });
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime !== undefined) {
                    get().setProgress(details.seekTime);
                }
            });
            navigator.mediaSession.setActionHandler('seekbackward', () => {
                const newTime = Math.max(0, audioEngine.getCurrentTime() - 10);
                get().setProgress(newTime);
            });
            navigator.mediaSession.setActionHandler('seekforward', () => {
                const newTime = Math.min(get().duration, audioEngine.getCurrentTime() + 10);
                get().setProgress(newTime);
            });
        }
    }

    return {
        currentTrack: null,
        isExpanded: false,
        queue: [],
        history: [],
        upNextTracks: [],
        isLoadingUpNext: false,
        lyrics: null,
        isLoadingLyrics: false,
        autoplayEnabled: true,
        radioMode: false,
        isPlaying: false,
        isLoading: false,
        error: null,
        progress: 0,
        bufferedPercent: 0,
        duration: 0,
        volume: 1,
        isMuted: false,
        repeatMode: 'off',
        isShuffled: false,
        sleepTimerMode: 'off',
        sleepTimerEndsAt: null,
        isPlayerVisible: false,
        expandedTab: 'player',

        playTrack: (track) => {
            const { currentTrack } = get();
            const newHistory = currentTrack
                ? [...get().history, currentTrack]
                : get().history;

            set({
                currentTrack: track,
                isExpanded: true,
                isPlaying: true,
                isLoading: true,
                progress: 0,
                bufferedPercent: 0,
                duration: track.durationSeconds || 0,
                history: newHistory.slice(-50),
                isPlayerVisible: true,
                expandedTab: 'player',
                lyrics: null,
                isLoadingLyrics: false,
            });

            // Play via our new AudioEngine
            if (typeof window !== 'undefined') {
                audioEngine.play(track.videoId);

                if ('mediaSession' in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: track.title,
                        artist: track.artist,
                        album: track.album || 'YouTube Music',
                        artwork: [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
                    });
                }
            }

            // Auto-fetch lyrics and up next for the new track
            get().fetchLyrics(track.videoId, track.durationSeconds);
            get().fetchUpNext(track.videoId);
        },

        setIsExpanded: (expanded) => set({ isExpanded: expanded }),

        setIsPlaying: (playing) => {
            if (typeof window !== 'undefined') {
                if (playing) audioEngine.resume();
                else audioEngine.pause();
            }
            set({ isPlaying: playing });
        },

        togglePlay: () => {
            const { isPlaying, currentTrack } = get();
            if (!currentTrack) return;

            const newIsPlaying = !isPlaying;
            if (typeof window !== 'undefined') {
                if (newIsPlaying) audioEngine.resume();
                else audioEngine.pause();
            }
            set({ isPlaying: newIsPlaying });
        },

        setIsLoading: (loading) => set({ isLoading: loading }),

        setProgress: (progress) => {
            // Only seek if the difference is significant to avoid loops from ontimeupdate
            if (typeof window !== 'undefined') {
                const diff = Math.abs(audioEngine.getCurrentTime() - progress);
                if (diff > 1) {
                    audioEngine.seek(progress);
                }
            }
            set({ progress });
        },

        setDuration: (duration) => set({ duration }),

        setVolume: (volume) => {
            if (typeof window !== 'undefined') audioEngine.setVolume(volume);
            set({ volume, isMuted: volume === 0 });
        },

        toggleMute: () => {
            const { isMuted, volume } = get();
            const newMuted = !isMuted;
            if (typeof window !== 'undefined') audioEngine.setVolume(newMuted ? 0 : volume);
            set({ isMuted: newMuted });
        },

        cycleRepeat: () =>
            set((s) => ({
                repeatMode:
                    s.repeatMode === 'off'
                        ? 'all'
                        : s.repeatMode === 'all'
                            ? 'one'
                            : 'off',
            })),

        toggleShuffle: () => {
            const newShuffle = !get().isShuffled;
            set({ isShuffled: newShuffle });
            // Advanced shuffle logic could apply here
        },

        addToQueue: (track) => {
            set((s) => ({ queue: [...s.queue, track] }));
            get().prefetchNextTrack();
        },

        playNext: (track) => {
            if (get().currentTrack?.videoId === track.videoId) {
                return;
            }

            if (!get().currentTrack) {
                get().playTrack(track);
                return;
            }

            set((s) => ({
                queue: [track, ...s.queue.filter((item) => item.videoId !== track.videoId)],
            }));
            get().prefetchNextTrack();
        },

        removeFromQueue: (index) => {
            set((s) => ({
                queue: s.queue.filter((_, i) => i !== index),
            }));
            get().prefetchNextTrack();
        },

        clearQueue: () => {
            set({ queue: [] });
            get().prefetchNextTrack();
        },

        moveToTop: (index) => {
            set((s) => {
                const track = s.queue[index];
                if (!track) return s;
                const newQueue = [track, ...s.queue.filter((_, i) => i !== index)];
                return { queue: newQueue };
            });
            get().prefetchNextTrack();
        },

        nextTrack: () => {
            const { queue, isShuffled, repeatMode, currentTrack, autoplayEnabled, upNextTracks } = get();

            if (repeatMode === 'one' && currentTrack) {
                set({ progress: 0, isPlaying: true, isLoading: true });
                if (typeof window !== 'undefined') {
                    audioEngine.seek(0);
                    audioEngine.resume();
                }
                return currentTrack;
            }

            // 1. Try manual queue first
            if (queue.length > 0) {
                const nextIndex = isShuffled
                    ? Math.floor(Math.random() * queue.length)
                    : 0;

                const nextTrack = queue[nextIndex];
                const newQueue = queue.filter((_, i) => i !== nextIndex);
                const newHistory = currentTrack
                    ? [...get().history, currentTrack].slice(-50)
                    : get().history;

                set({
                    currentTrack: nextTrack,
                    queue: newQueue,
                    history: newHistory,
                    isPlaying: true,
                    isLoading: true,
                    progress: 0,
                    duration: nextTrack.durationSeconds || 0,
                    lyrics: null,
                    isLoadingLyrics: false,
                });

                if (typeof window !== 'undefined') audioEngine.play(nextTrack.videoId);
                get().fetchLyrics(nextTrack.videoId, nextTrack.durationSeconds);
                get().fetchUpNext(nextTrack.videoId);
                get().prefetchNextTrack();
                return nextTrack;
            }

            // 2. If autoplay enabled, use Up Next tracks
            if (autoplayEnabled && upNextTracks.length > 0) {
                const nextTrack = upNextTracks[0];
                const remainingUpNext = upNextTracks.slice(1);
                const newHistory = currentTrack
                    ? [...get().history, currentTrack].slice(-50)
                    : get().history;

                set({
                    currentTrack: nextTrack,
                    upNextTracks: remainingUpNext,
                    history: newHistory,
                    isPlaying: true,
                    isLoading: true,
                    progress: 0,
                    duration: nextTrack.durationSeconds || 0,
                    lyrics: null,
                    isLoadingLyrics: false,
                });

                if (typeof window !== 'undefined') audioEngine.play(nextTrack.videoId);
                get().fetchLyrics(nextTrack.videoId, nextTrack.durationSeconds);

                // Fetch more if we're running low
                if (remainingUpNext.length <= 2) {
                    get().fetchUpNext(nextTrack.videoId);
                }
                get().prefetchNextTrack();
                return nextTrack;
            }

            // 3. Repeat all
            if (repeatMode === 'all' && currentTrack) {
                set({ progress: 0, bufferedPercent: 0, isPlaying: true, isLoading: true });
                if (typeof window !== 'undefined') {
                    audioEngine.seek(0);
                    audioEngine.resume();
                }
                return currentTrack;
            }

            // Stopped playing if no next track
            if (typeof window !== 'undefined') audioEngine.pause();
            return null;
        },

        prevTrack: () => {
            const { history, currentTrack, progress } = get();

            if (progress > 3 && currentTrack) {
                set({ progress: 0, bufferedPercent: 0, isLoading: true });
                if (typeof window !== 'undefined') {
                    audioEngine.seek(0);
                    audioEngine.resume();
                }
                return currentTrack;
            }

            if (history.length === 0) {
                if (typeof window !== 'undefined') audioEngine.seek(0);
                return null;
            }

            const prevTrack = history[history.length - 1];
            const newHistory = history.slice(0, -1);
            const newQueue = currentTrack
                ? [currentTrack, ...get().queue]
                : get().queue;

            set({
                currentTrack: prevTrack,
                history: newHistory,
                queue: newQueue,
                isPlaying: true,
                isLoading: true,
                progress: 0,
                bufferedPercent: 0,
                duration: prevTrack.durationSeconds || 0,
                lyrics: null,
                isLoadingLyrics: false,
            });

            if (typeof window !== 'undefined') audioEngine.play(prevTrack.videoId);
            get().fetchLyrics(prevTrack.videoId, prevTrack.durationSeconds);
            get().fetchUpNext(prevTrack.videoId);
            get().prefetchNextTrack();
            return prevTrack;
        },

        handleTrackEnded: () => {
            if (get().sleepTimerMode === 'end_of_track') {
                clearSleepTimerTimeout();
                set({
                    isPlaying: false,
                    isLoading: false,
                    sleepTimerMode: 'off',
                    sleepTimerEndsAt: null,
                });
                return null;
            }

            return get().nextTrack();
        },

        closePlayer: () => {
            if (typeof window !== 'undefined') audioEngine.pause();
            clearSleepTimerTimeout();
            set({
                currentTrack: null,
                isPlaying: false,
                isLoading: false,
                progress: 0,
                duration: 0,
                isPlayerVisible: false,
                lyrics: null,
                isLoadingLyrics: false,
                upNextTracks: [],
                isLoadingUpNext: false,
                radioMode: false,
                sleepTimerMode: 'off',
                sleepTimerEndsAt: null,
            });
        },

        setLyrics: (lyrics) => set({ lyrics }),
        setIsLoadingLyrics: (loading) => set({ isLoadingLyrics: loading }),

        fetchLyrics: async (videoId: string, durationSeconds = 0) => {
            set({ isLoadingLyrics: true, lyrics: null });
            try {
                const params = new URLSearchParams({ id: videoId });
                if (durationSeconds > 0) {
                    params.set('durationSeconds', String(durationSeconds));
                }
                const res = await fetch(`/api/youtube-music/lyrics?${params.toString()}`);
                const data = await res.json();
                if (get().currentTrack?.videoId !== videoId) {
                    return;
                }

                if (data.success && data.data) {
                    set({ lyrics: data.data as TrackLyrics, isLoadingLyrics: false });
                } else {
                    set({ lyrics: null, isLoadingLyrics: false });
                }
            } catch {
                if (get().currentTrack?.videoId === videoId) {
                    set({ lyrics: null, isLoadingLyrics: false });
                }
            }
        },

        setUpNextTracks: (tracks) => set({ upNextTracks: tracks }),

        fetchUpNext: async (videoId: string) => {
            const { upNextTracks, currentTrack } = get();
            
            // Limit fetch if we already have plenty of upcoming tracks
            if (upNextTracks.length > 50) return;

            set({ isLoadingUpNext: true });
            try {
                const res = await fetch(`/api/youtube-music/up-next?id=${videoId}&automix=true`);
                const data = await res.json();
                
                // If user changed tracks while we were fetching
                if (get().currentTrack?.videoId !== videoId && currentTrack?.videoId !== videoId) {
                    return;
                }

                if (data.success && data.data) {
                    const currentIds = new Set([
                        get().currentTrack?.videoId,
                        ...get().queue.map(t => t.videoId),
                        ...get().history.map(t => t.videoId),
                        ...get().upNextTracks.map(t => t.videoId)
                    ]);
                    
                    const newTracks = data.data.filter((t: YouTubeTrack) => !currentIds.has(t.videoId));
                    
                    set(s => ({ 
                        upNextTracks: [...s.upNextTracks, ...newTracks], 
                        isLoadingUpNext: false 
                    }));
                    get().prefetchNextTrack();
                } else {
                    set({ isLoadingUpNext: false });
                }
            } catch {
                if (get().currentTrack?.videoId === videoId || currentTrack?.videoId === videoId) {
                    set({ isLoadingUpNext: false });
                }
            }
        },

        toggleAutoplay: () => {
            set((s) => ({ autoplayEnabled: !s.autoplayEnabled }));
            get().prefetchNextTrack();
        },

        startRadio: (track) => {
            set({
                radioMode: true,
                autoplayEnabled: true,
                queue: [],
            });
            get().playTrack(track);
        },

        setExpandedTab: (tab) => set({ expandedTab: tab }),

        setSleepTimer: (mode, minutes) => {
            clearSleepTimerTimeout();

            if (mode === 'off') {
                set({ sleepTimerMode: 'off', sleepTimerEndsAt: null });
                return;
            }

            if (mode === 'end_of_track') {
                set({ sleepTimerMode: 'end_of_track', sleepTimerEndsAt: null });
                return;
            }

            const safeMinutes = Math.max(1, Math.floor(minutes ?? 0));
            const endsAt = Date.now() + safeMinutes * 60_000;
            sleepTimerTimeout = setTimeout(() => {
                if (typeof window !== 'undefined') {
                    audioEngine.pause();
                }
                set({
                    isPlaying: false,
                    isLoading: false,
                    sleepTimerMode: 'off',
                    sleepTimerEndsAt: null,
                });
            }, safeMinutes * 60_000);

            set({
                sleepTimerMode: 'minutes',
                sleepTimerEndsAt: endsAt,
            });
        },

        clearSleepTimer: () => {
            clearSleepTimerTimeout();
            set({ sleepTimerMode: 'off', sleepTimerEndsAt: null });
        },


        prefetchNextTrack: () => {
            const { queue, upNextTracks, autoplayEnabled } = get();
            const nextTrack = queue[0] ?? (autoplayEnabled ? upNextTracks[0] : null);
            if (nextTrack) {
                audioEngine.preload(nextTrack.videoId);
            }
        },
    };
});
