import { audioEngine } from '@/lib/player/audioEngine';

/**
 * Legacy AudioManager wrapper.
 * With the YouTube IFrame API, the AudioEngine handles all state updates
 * directly via YT.Player events. This class is kept for API compatibility
 * but delegates everything to audioEngine.
 */
class AudioManager {
    play(videoId: string) {
        audioEngine.play(videoId);
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
        return audioEngine.getCurrentTime();
    }

    getDuration() {
        return audioEngine.getDuration();
    }
}

export const audioManager = new AudioManager();
