export interface Track {
    id: string; // The YouTube videoId
    title: string;
    artist: string;
    thumbnail: string;
    durationSeconds: number;
}

export class QueueManager {
    private queue: Track[] = [];
    private originalQueue: Track[] = []; // Used for restoring from shuffle
    private currentIndex: number = -1;
    private isShuffled: boolean = false;
    private repeatMode: 'off' | 'all' | 'one' = 'off';

    public setQueue(tracks: Track[], startIndex: number = 0) {
        this.originalQueue = [...tracks];
        this.queue = [...tracks];
        this.currentIndex = startIndex;
        this.isShuffled = false;
    }

    public addTrack(track: Track) {
        this.queue.push(track);
        this.originalQueue.push(track);
        if (this.currentIndex === -1) {
            this.currentIndex = 0;
        }
    }

    public addTrackNext(track: Track) {
        if (this.queue.length === 0) {
            this.addTrack(track);
            return;
        }
        this.queue.splice(this.currentIndex + 1, 0, track);
        this.originalQueue.splice(this.originalQueue.findIndex(t => t.id === this.getCurrentTrack()?.id) + 1, 0, track);
    }

    public getCurrentTrack(): Track | null {
        if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
            return this.queue[this.currentIndex];
        }
        return null;
    }

    public getNextTrack(): Track | null {
        if (this.queue.length === 0) return null;

        if (this.repeatMode === 'one') {
            return this.queue[this.currentIndex];
        }

        const nextIndex = this.currentIndex + 1;
        if (nextIndex < this.queue.length) {
            return this.queue[nextIndex];
        }

        if (this.repeatMode === 'all') {
            return this.queue[0];
        }

        return null;
    }

    public getPreviousTrack(): Track | null {
        if (this.queue.length === 0) return null;

        if (this.repeatMode === 'one') {
            return this.queue[this.currentIndex]; // Wait, previous track should ideally go to the same track if repeat one, or actually users expect previous to go to the previous track even when repeat one is on. Let's just go previous.
        }

        const prevIndex = this.currentIndex - 1;
        if (prevIndex >= 0) {
            return this.queue[prevIndex];
        }

        if (this.repeatMode === 'all') {
            return this.queue[this.queue.length - 1];
        }

        // if at start and no repeat all, just restart the current track (handled by player engine, let's return first track)
        return this.queue[0];
    }

    public advanceNext(): boolean {
        // Only call this when track ends or next is explicitly pressed
        if (this.repeatMode === 'one') {
            // Keep same index
            return true;
        }

        const nextIndex = this.currentIndex + 1;
        if (nextIndex < this.queue.length) {
            this.currentIndex = nextIndex;
            return true;
        }

        if (this.repeatMode === 'all') {
            this.currentIndex = 0;
            return true;
        }

        return false;
    }

    public advancePrevious(): boolean {
        const prevIndex = this.currentIndex - 1;
        if (prevIndex >= 0) {
            this.currentIndex = prevIndex;
            return true;
        }

        if (this.repeatMode === 'all' && this.queue.length > 0) {
            this.currentIndex = this.queue.length - 1;
            return true;
        }

        if (this.queue.length > 0) {
            this.currentIndex = 0;
            return true;
        }

        return false;
    }

    public toggleShuffle(): boolean {
        this.isShuffled = !this.isShuffled;

        if (this.isShuffled) {
            const currentTrack = this.getCurrentTrack();
            // simple fisher-yates shuffle excluding current track if playing
            let tracksToShuffle = [...this.originalQueue];
            if (currentTrack) {
                tracksToShuffle = tracksToShuffle.filter(t => t.id !== currentTrack.id);
            }

            for (let i = tracksToShuffle.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tracksToShuffle[i], tracksToShuffle[j]] = [tracksToShuffle[j], tracksToShuffle[i]];
            }

            if (currentTrack) {
                this.queue = [currentTrack, ...tracksToShuffle];
                this.currentIndex = 0;
            } else {
                this.queue = tracksToShuffle;
            }
        } else {
            const currentTrack = this.getCurrentTrack();
            this.queue = [...this.originalQueue];
            if (currentTrack) {
                this.currentIndex = this.queue.findIndex(t => t.id === currentTrack.id);
            }
        }

        return this.isShuffled;
    }

    public toggleRepeat(): 'off' | 'all' | 'one' {
        switch (this.repeatMode) {
            case 'off': this.repeatMode = 'all'; break;
            case 'all': this.repeatMode = 'one'; break;
            case 'one': this.repeatMode = 'off'; break;
        }
        return this.repeatMode;
    }

    public getQueue() {
        return this.queue;
    }

    public clear() {
        this.queue = [];
        this.originalQueue = [];
        this.currentIndex = -1;
    }
}
