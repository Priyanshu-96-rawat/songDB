import { create } from 'zustand';

interface PlayerState {
    currentSong: {
        title: string;
        artist: string;
        coverArt: string;
    } | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    playSong: (song: { title: string; artist: string; coverArt: string }) => void;
    togglePlay: () => void;
    setProgress: (progress: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
    currentSong: null,
    isPlaying: false,
    progress: 0,
    duration: 100, // Mock duration
    playSong: (song) => set({ currentSong: song, isPlaying: true }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setProgress: (progress) => set({ progress }),
}));
