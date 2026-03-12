import { useYouTubePlayerStore } from "@/store/youtubePlayer"

// ─── YouTube IFrame API type declarations ────────────────────────────

declare global {
    interface Window {
        YT: typeof YT
        onYouTubeIframeAPIReady: (() => void) | undefined
    }
}

declare namespace YT {
    enum PlayerState {
        UNSTARTED = -1,
        ENDED = 0,
        PLAYING = 1,
        PAUSED = 2,
        BUFFERING = 3,
        CUED = 5,
    }

    interface PlayerOptions {
        height?: string | number
        width?: string | number
        videoId?: string
        playerVars?: Record<string, unknown>
        events?: {
            onReady?: (event: PlayerEvent) => void
            onStateChange?: (event: OnStateChangeEvent) => void
            onError?: (event: OnErrorEvent) => void
        }
    }

    interface PlayerEvent {
        target: Player
    }

    interface OnStateChangeEvent {
        target: Player
        data: PlayerState
    }

    interface OnErrorEvent {
        target: Player
        data: number
    }

    class Player {
        constructor(elementId: string | HTMLElement, options: PlayerOptions)
        loadVideoById(videoId: string, startSeconds?: number): void
        cueVideoById(videoId: string, startSeconds?: number): void
        playVideo(): void
        pauseVideo(): void
        stopVideo(): void
        seekTo(seconds: number, allowSeekAhead?: boolean): void
        setVolume(volume: number): void
        getVolume(): number
        mute(): void
        unMute(): void
        isMuted(): boolean
        getCurrentTime(): number
        getDuration(): number
        getPlayerState(): PlayerState
        destroy(): void
    }
}

// ─── AudioEngine (YouTube IFrame Player) ─────────────────────────────

class AudioEngine {
    private player: YT.Player | null = null
    private isApiReady = false
    private pendingVideoId: string | null = null
    private progressInterval: ReturnType<typeof setInterval> | null = null
    private isPlayerReady = false
    private currentVolume = 100 // YT uses 0-100

    constructor() {
        if (typeof window !== "undefined") {
            this.loadIframeApi()
        }
    }

    // ── Fake `audio` accessor for backward compatibility ──
    // The store accesses `audioEngine.audio.currentTime` in a few places
    get audio(): { currentTime: number; duration: number } {
        return {
            currentTime: this.getCurrentTime(),
            duration: this.getDuration(),
        }
    }

    // ── Load the YouTube IFrame API script ──
    private loadIframeApi() {
        if (typeof window === "undefined") return
        if (window.YT && window.YT.Player) {
            this.isApiReady = true
            this.initPlayer()
            return
        }

        // Set the global callback
        window.onYouTubeIframeAPIReady = () => {
            this.isApiReady = true
            this.initPlayer()
        }

        // Inject the script if not already present
        if (!document.getElementById("yt-iframe-api-script")) {
            const script = document.createElement("script")
            script.id = "yt-iframe-api-script"
            script.src = "https://www.youtube.com/iframe_api"
            script.async = true
            document.head.appendChild(script)
        }
    }

    // ── Create the hidden YT.Player instance ──
    private initPlayer() {
        if (!this.isApiReady || typeof window === "undefined") return
        if (this.player) return

        // Create a hidden container for the iframe
        let container = document.getElementById("yt-iframe-player")
        if (!container) {
            container = document.createElement("div")
            container.id = "yt-iframe-player"
            container.style.position = "fixed"
            container.style.top = "-9999px"
            container.style.left = "-9999px"
            container.style.width = "1px"
            container.style.height = "1px"
            container.style.opacity = "0"
            container.style.pointerEvents = "none"
            document.body.appendChild(container)
        }

        this.player = new window.YT.Player("yt-iframe-player", {
            height: "1",
            width: "1",
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3, // No annotations
                modestbranding: 1,
                rel: 0,
                playsinline: 1,
                origin: window.location.origin,
            },
            events: {
                onReady: (event) => {
                    this.isPlayerReady = true
                    event.target.setVolume(this.currentVolume)
                    // If there's a pending video, play it now
                    if (this.pendingVideoId) {
                        const vid = this.pendingVideoId
                        this.pendingVideoId = null
                        this.play(vid)
                    }
                },
                onStateChange: (event) => this.handleStateChange(event),
                onError: (event) => this.handleError(event),
            },
        })
    }

    // ── State change handler ──
    private handleStateChange(event: YT.OnStateChangeEvent) {
        const state = event.data

        switch (state) {
            case YT.PlayerState.PLAYING:
                useYouTubePlayerStore.setState({ isPlaying: true, isLoading: false })
                this.startProgressUpdates()
                // Update duration when playing starts
                this.updateDuration()
                break

            case YT.PlayerState.PAUSED:
                useYouTubePlayerStore.setState({ isPlaying: false, isLoading: false })
                this.stopProgressUpdates()
                break

            case YT.PlayerState.BUFFERING:
                useYouTubePlayerStore.setState({ isLoading: true })
                break

            case YT.PlayerState.ENDED:
                useYouTubePlayerStore.setState({ isPlaying: false, isLoading: false })
                this.stopProgressUpdates()
                const { handleTrackEnded } = useYouTubePlayerStore.getState()
                handleTrackEnded()
                break

            case YT.PlayerState.CUED:
                useYouTubePlayerStore.setState({ isLoading: false })
                break
        }
    }

    // ── Error handler ──
    private handleError(event: YT.OnErrorEvent) {
        console.error("[YT IFrame] Error code:", event.data)
        useYouTubePlayerStore.setState({
            isPlaying: false,
            isLoading: false,
            error: `YouTube error (code ${event.data})`,
        })

        // Auto-skip to next track on error
        const { nextTrack } = useYouTubePlayerStore.getState()
        setTimeout(() => nextTrack(), 1500)
    }

    // ── Progress tracking via polling ──
    private startProgressUpdates() {
        this.stopProgressUpdates()
        this.progressInterval = setInterval(() => {
            if (!this.player || !this.isPlayerReady) return
            try {
                const currentTime = this.player.getCurrentTime()
                if (typeof currentTime === "number" && !isNaN(currentTime)) {
                    // Directly set state to avoid seek loop in setProgress
                    useYouTubePlayerStore.setState({ progress: currentTime })
                }
            } catch {
                // Player might not be ready
            }
        }, 250)
    }

    private stopProgressUpdates() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval)
            this.progressInterval = null
        }
    }

    private updateDuration() {
        if (!this.player || !this.isPlayerReady) return
        try {
            const dur = this.player.getDuration()
            if (dur && dur > 0 && !isNaN(dur)) {
                useYouTubePlayerStore.setState({ duration: dur })
            }
        } catch {
            // Ignore
        }
    }

    // ── Public API (same interface as before) ──

    getCurrentTime(): number {
        if (!this.player || !this.isPlayerReady) return 0
        try {
            return this.player.getCurrentTime() ?? 0
        } catch {
            return 0
        }
    }

    getDuration(): number {
        if (!this.player || !this.isPlayerReady) return 0
        try {
            return this.player.getDuration() ?? 0
        } catch {
            return 0
        }
    }

    play(videoId: string) {
        if (typeof window === "undefined") return

        if (!this.isPlayerReady || !this.player) {
            // Queue it for when the player is ready
            this.pendingVideoId = videoId
            this.loadIframeApi()
            return
        }

        this.player.loadVideoById(videoId)
        this.player.setVolume(this.currentVolume)
    }

    preload(_videoId: string) {
        // YouTube IFrame API does not support preloading another video
        // This is a no-op
    }

    pause() {
        if (!this.player || !this.isPlayerReady) return
        this.player.pauseVideo()
    }

    resume() {
        if (typeof window === "undefined") return

        if (!this.player || !this.isPlayerReady) return
        this.player.playVideo()
    }

    seek(time: number) {
        if (!this.player || !this.isPlayerReady) return
        this.player.seekTo(time, true)
    }

    setVolume(volume: number) {
        // Store uses 0-1, YT uses 0-100
        this.currentVolume = Math.round(volume * 100)
        if (this.player && this.isPlayerReady) {
            this.player.setVolume(this.currentVolume)
        }
    }

    // These are no-ops with YouTube IFrame API (no access to audio nodes)
    setBassBoost(_value: number) {
        // Not supported with YouTube IFrame API
    }

    setSoundProfile(_profile: "balanced" | "enhanced") {
        // Not supported with YouTube IFrame API
    }
}

export const audioEngine = new AudioEngine()
