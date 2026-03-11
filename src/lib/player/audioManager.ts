import { audioEngine } from '@/lib/player/audioEngine';

type AudioManagerEvent = 'play' | 'playing' | 'pause' | 'waiting' | 'timeupdate' | 'ended';
type AudioManagerHandler = () => void;

class AudioManager {
    private listeners = new Map<AudioManagerEvent, Set<AudioManagerHandler>>();
    private bound = false;

    constructor() {
        this.bindAudioEvents();
    }

    private bindAudioEvents() {
        if (this.bound || typeof window === 'undefined') return;

        const audio = audioEngine.audio;
        if (!audio || typeof audio.addEventListener !== 'function') return;

        (['play', 'playing', 'pause', 'waiting', 'timeupdate', 'ended'] as const).forEach((eventName) => {
            audio.addEventListener(eventName, () => this.emit(eventName));
        });

        this.bound = true;
    }

    private emit(eventName: AudioManagerEvent) {
        const handlers = this.listeners.get(eventName);
        if (!handlers) return;

        handlers.forEach((handler) => handler());
    }

    on(eventName: AudioManagerEvent, handler: AudioManagerHandler) {
        this.bindAudioEvents();

        const handlers = this.listeners.get(eventName) ?? new Set<AudioManagerHandler>();
        handlers.add(handler);
        this.listeners.set(eventName, handlers);

        return () => this.off(eventName, handler);
    }

    off(eventName: AudioManagerEvent, handler: AudioManagerHandler) {
        const handlers = this.listeners.get(eventName);
        if (!handlers) return;

        handlers.delete(handler);
        if (handlers.size === 0) {
            this.listeners.delete(eventName);
        }
    }

    play(videoIdOrUrl: string) {
        const url = videoIdOrUrl.startsWith('http') || videoIdOrUrl.startsWith('/')
            ? videoIdOrUrl
            : `/api/youtube-stream?id=${encodeURIComponent(videoIdOrUrl)}`;

        audioEngine.play(url);
    }

    pause() {
        audioEngine.pause();
    }

    resume() {
        audioEngine.resume();
    }

    seek(seconds: number) {
        audioEngine.seek(seconds);
    }

    setVolume(volume: number) {
        audioEngine.setVolume(volume);
    }

    getCurrentTime() {
        return audioEngine.audio?.currentTime ?? 0;
    }

    getDuration() {
        return audioEngine.audio?.duration ?? 0;
    }
}

export const audioManager = new AudioManager();
