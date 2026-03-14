import { useYouTubePlayerStore, type YouTubePlayerState } from "@/store/youtubePlayer"

/**
 * AudioEngine (YouTube IFrame API)
 * Uses the official YouTube IFrame API for playback.
 * 
 * Singleton is persisted on `window.__audioEngine` to survive HMR
 * and prevent duplicate YT IFrame players from overlapping audio.
 */

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void
        YT: {
            Player: new (id: string, options: Record<string, unknown>) => {
                destroy: () => void;
                stopVideo: () => void;
                pauseVideo: () => void;
                playVideo: () => void;
                loadVideoById: (id: string) => void;
                seekTo: (time: number, allowSeekAhead: boolean) => void;
                setVolume: (vol: number) => void;
                getCurrentTime: () => number;
                getDuration: () => number;
                getVideoLoadedFraction: () => number;
            };
        };
        __audioEngine?: AudioEngine
    }
}

const CONTAINER_ID = "yt-player-container"

class AudioEngine {
    private player: {
        destroy: () => void;
        stopVideo: () => void;
        pauseVideo: () => void;
        playVideo: () => void;
        loadVideoById: (id: string) => void;
        seekTo: (time: number, allowSeekAhead: boolean) => void;
        setVolume: (vol: number) => void;
        getCurrentTime: () => number;
        getDuration: () => number;
        getVideoLoadedFraction: () => number;
    } | null = null;
    private isApiLoaded = false
    private isPlayerReady = false
    private currentVideoId: string | null = null
    private progressInterval: ReturnType<typeof setInterval> | null = null

    constructor() {
        // We no longer load API automatically in constructor to prevent 429s on startup
    }

    /** Destroy the player cleanly (used during HMR cleanup) */
    destroy() {
        this.stopProgressUpdates()
        if (this.player) {
            if (this.isPlayerReady) {
                try {
                    this.player.stopVideo?.()
                    this.player.destroy?.()
                } catch {
                    // Ignore destroy errors
                }
            }
            this.player = null
        }
        this.isPlayerReady = false
    }

    private loadApi() {
        if (typeof window === "undefined") return;

        // If the YT API is already loaded (e.g. from a previous HMR cycle), mark it
        if (typeof window.YT !== "undefined" && window.YT.Player) {
            this.isApiLoaded = true
            if (this.currentVideoId) this.initPlayer(this.currentVideoId)
            return
        }

        // Create container if it doesn't exist
        if (!document.getElementById(CONTAINER_ID)) {
            const container = document.createElement("div")
            container.id = CONTAINER_ID
            container.style.position = "fixed"
            container.style.top = "-9999px"
            container.style.left = "-9999px"
            container.style.width = "1px"
            container.style.height = "1px"
            container.style.opacity = "0"
            container.style.pointerEvents = "none"
            document.body.appendChild(container)
        }

        // Only inject the script once — check for existing script tag
        const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]')
        if (existingScript) {
            // Script tag exists but API not ready yet — wait for callback
            const origCb = window.onYouTubeIframeAPIReady
            window.onYouTubeIframeAPIReady = () => {
                origCb?.()
                this.isApiLoaded = true
                useYouTubePlayerStore.setState({ isApiLoaded: true })
                if (this.currentVideoId) this.initPlayer(this.currentVideoId)
            }
            return
        }

        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        const firstScriptTag = document.getElementsByTagName("script")[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

        window.onYouTubeIframeAPIReady = () => {
            this.isApiLoaded = true
            useYouTubePlayerStore.setState({ isApiLoaded: true })

            if (this.currentVideoId) {
                this.initPlayer(this.currentVideoId)
            }
        }
    }

    private initPlayer(videoId: string) {
        if (!this.isApiLoaded || typeof window.YT === "undefined") {
            this.currentVideoId = videoId
            return
        }

        if (this.player) {
            if (this.isPlayerReady) {
                try {
                    this.player.loadVideoById(videoId)
                } catch {
                    // Player in bad state, recreate
                    this.player = null
                    this.isPlayerReady = false
                    this.initPlayer(videoId)
                }
            } else {
                this.currentVideoId = videoId
            }
            return
        }

        // Ensure the container is empty (clear any leftover iframe from a previous instance)
        const container = document.getElementById(CONTAINER_ID)
        if (container) {
            container.innerHTML = ""
        }

        this.player = new window.YT.Player(CONTAINER_ID, {
            height: "1",
            width: "1",
            videoId,
            playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                modestbranding: 1,
                iv_load_policy: 3,
                origin: window.location.origin,
            },
            events: {
                onReady: () => {
                    this.isPlayerReady = true
                    
                    // If currentVideoId changed while loading, load the new one
                    if (this.currentVideoId && this.currentVideoId !== videoId) {
                        this.player?.loadVideoById(this.currentVideoId)
                    }

                    useYouTubePlayerStore.setState({ isLoading: false })
                    this.startProgressUpdates()
                },

                onStateChange: (event: { data: number }) => {
                    const state = event.data
                    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
                    switch (state) {
                        case 1:
                            useYouTubePlayerStore.setState({
                                isPlaying: true,
                                isLoading: false,
                            })
                            this.startProgressUpdates()
                            break

                        case 2:
                            useYouTubePlayerStore.setState({ isPlaying: false })
                            this.stopProgressUpdates()
                            break

                        case 3:
                            useYouTubePlayerStore.setState({ isLoading: true })
                            break

                        case 0:
                            useYouTubePlayerStore.setState({
                                isPlaying: false,
                                isLoading: false,
                            })
                            this.stopProgressUpdates()
                            useYouTubePlayerStore.getState().handleTrackEnded()
                            break

                        case 5:
                            useYouTubePlayerStore.setState({ isLoading: false })
                            break
                    }
                },

                onError: () => {

                    useYouTubePlayerStore.setState({
                        isPlaying: false,
                        isLoading: false,
                        error: "Unable to play this video.",
                    })

                    setTimeout(() => {
                        const { nextTrack, error } = useYouTubePlayerStore.getState()
                        if (error) nextTrack()
                    }, 3000)
                },
            },
        })
    }

    private startProgressUpdates() {
        this.stopProgressUpdates()

        this.progressInterval = setInterval(() => {
            if (!this.player || !this.isPlayerReady || typeof this.player.getCurrentTime !== "function") return

            const currentTime = this.player.getCurrentTime()
            const duration = this.player.getDuration()
            let bufferedPercent = 0

            // GAPLESS OPTIMIZATION: Trigger next track early if we are very close to finishing
            // YouTube transition natively adds ~1-2s gap; this masks it.
            if (currentTime > 0 && duration > 0 && (duration - currentTime) < 0.5) {
                const state = useYouTubePlayerStore.getState();
                // Only trigger if we haven't already marked this specific video as ended
                if (state.currentTrack && state.lastProcessedEndedVideoId !== state.currentTrack.videoId) {
                    state.handleTrackEnded();
                }
            }

            if (typeof this.player.getVideoLoadedFraction === "function") {
                bufferedPercent = (this.player.getVideoLoadedFraction() || 0) * 100
            }

            const updates: Partial<YouTubePlayerState & { bufferedPercent: number }> = {}
            if (typeof currentTime === "number") updates.progress = currentTime
            if (typeof duration === "number" && duration > 0) updates.duration = duration
            if (bufferedPercent >= 0) updates.bufferedPercent = bufferedPercent

            if (Object.keys(updates).length > 0) {
                useYouTubePlayerStore.setState(updates);
            }
        }, 500)
    }

    private stopProgressUpdates() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval)
            this.progressInterval = null
        }
    }

    // PUBLIC API

    play(videoId: string) {
        this.currentVideoId = videoId
        
        if (!this.isApiLoaded) {
            this.loadApi()
            return
        }

        if (!this.player) {
            this.initPlayer(videoId)
        } else if (this.isPlayerReady) {
            try {
                this.player.loadVideoById(videoId)
            } catch {
                // Player in bad state, recreate
                this.player = null
                this.isPlayerReady = false
                this.initPlayer(videoId)
            }
        }

        useYouTubePlayerStore.setState({
            isLoading: true,
            error: null,
        })
    }

    pause() {
        if (this.player && this.isPlayerReady) {
            this.player.pauseVideo()
        }
    }

    resume() {
        if (this.player && this.isPlayerReady) {
            this.player.playVideo()
        }
    }

    seek(time: number) {
        if (this.player && this.isPlayerReady) {
            this.player.seekTo(time, true)
        }
    }

    setVolume(volume: number) {
        if (this.player && this.isPlayerReady) {
            this.player.setVolume(volume * 100)
        }
    }

    getCurrentTime(): number {
        if (!this.isPlayerReady) return 0
        return this.player?.getCurrentTime?.() ?? 0
    }

    getDuration(): number {
        if (!this.isPlayerReady) return 0
        return this.player?.getDuration?.() ?? 0
    }

    preload() { }

}

// Persist singleton on window to survive HMR — destroy old instance first
function getOrCreateEngine(): AudioEngine {
    if (typeof window === "undefined") {
        return new AudioEngine()
    }

    // Destroy previous instance if exists (HMR scenario)
    if (window.__audioEngine) {
        window.__audioEngine.destroy()
    }

    const engine = new AudioEngine()
    window.__audioEngine = engine
    return engine
}

export const audioEngine = getOrCreateEngine()