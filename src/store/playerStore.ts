import { create } from 'zustand';
import { audioManager } from '@/lib/player/audioManager';
import { QueueManager, type Track } from '@/lib/player/queueManager';

interface PlayerState {
    currentTrack: Track | null;
    queue: Track[];
    isPlaying: boolean;
    isBuffering: boolean;
    volume: number;
    currentTime: number;
    duration: number;
    isShuffled: boolean;
    repeatMode: 'off' | 'all' | 'one';
    isPlayerVisible: boolean;

    // Actions
    playTrack: (track: Track, queue?: Track[]) => void;
    pause: () => void;
    resume: () => void;
    next: () => void;
    previous: () => void;
    seek: (seconds: number) => void;
    setVolume: (volume: number) => void;
    addToQueue: (track: Track) => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    setPlayerVisible: (visible: boolean) => void;
}

const queueManager = new QueueManager();

export const usePlayerStore = create<PlayerState>((set, get) => {

    // Setup audio manager listeners
    audioManager.on('play', () => set({ isPlaying: true, isBuffering: false }));
    audioManager.on('playing', () => set({ isPlaying: true, isBuffering: false }));
    audioManager.on('pause', () => set({ isPlaying: false }));
    audioManager.on('waiting', () => set({ isBuffering: true }));

    audioManager.on('timeupdate', () => {
        set({
            currentTime: audioManager.getCurrentTime(),
            duration: audioManager.getDuration() || get().currentTrack?.durationSeconds || 0
        });
    });

    audioManager.on('ended', () => {
        // Automatically play next track
        get().next();
    });

    // Keyboard controls (Media Session API)
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => get().resume());
        navigator.mediaSession.setActionHandler('pause', () => get().pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => get().previous());
        navigator.mediaSession.setActionHandler('nexttrack', () => get().next());
    }

    return {
        currentTrack: null,
        queue: [],
        isPlaying: false,
        isBuffering: false,
        volume: 1,
        currentTime: 0,
        duration: 0,
        isShuffled: false,
        repeatMode: 'off',
        isPlayerVisible: false,

        playTrack: (track, newQueue) => {
            if (newQueue) {
                const startIndex = newQueue.findIndex(t => t.id === track.id);
                queueManager.setQueue(newQueue, startIndex >= 0 ? startIndex : 0);
            } else if (!get().queue.find(t => t.id === track.id)) {
                // If track not in current queue, replace queue
                queueManager.setQueue([track], 0);
            } else {
                // Track is in queue, update index
                const currentQueue = queueManager.getQueue();
                const startIndex = currentQueue.findIndex(t => t.id === track.id);
                queueManager.setQueue(currentQueue, startIndex);
            }

            set({
                currentTrack: track,
                queue: queueManager.getQueue(),
                isPlayerVisible: true,
                currentTime: 0,
            });

            audioManager.play(track.id);

            // Update Media Session Metadata
            if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: track.title,
                    artist: track.artist,
                    artwork: [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
                });
            }
        },

        pause: () => {
            audioManager.pause();
        },

        resume: () => {
            if (get().currentTrack) {
                audioManager.resume();
            }
        },

        next: () => {
            const nextTrack = queueManager.getNextTrack();
            if (nextTrack) {
                queueManager.advanceNext();
                set({ currentTrack: nextTrack, currentTime: 0 });
                audioManager.play(nextTrack.id);

                if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: nextTrack.title,
                        artist: nextTrack.artist,
                        artwork: [{ src: nextTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
                    });
                }
            } else {
                // Queue ended
                audioManager.pause();
                set({ isPlaying: false, currentTime: 0 });
            }
        },

        previous: () => {
            // If we are more than 3 seconds in, just seek to start
            if (audioManager.getCurrentTime() > 3) {
                audioManager.seek(0);
                return;
            }

            const prevTrack = queueManager.getPreviousTrack();
            if (prevTrack) {
                queueManager.advancePrevious();
                set({ currentTrack: prevTrack, currentTime: 0 });
                audioManager.play(prevTrack.id);

                if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: prevTrack.title,
                        artist: prevTrack.artist,
                        artwork: [{ src: prevTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
                    });
                }
            } else {
                audioManager.seek(0);
            }
        },

        seek: (seconds) => {
            audioManager.seek(seconds);
            set({ currentTime: seconds });
        },

        setVolume: (volume) => {
            audioManager.setVolume(volume);
            set({ volume });
        },

        addToQueue: (track) => {
            queueManager.addTrackNext(track);
            set({ queue: queueManager.getQueue() });
        },

        toggleShuffle: () => {
            const isShuffled = queueManager.toggleShuffle();
            set({ isShuffled, queue: queueManager.getQueue() });
        },

        toggleRepeat: () => {
            const repeatMode = queueManager.toggleRepeat();
            set({ repeatMode });
        },

        setPlayerVisible: (visible) => {
            set({ isPlayerVisible: visible });
        }
    };
});
