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
        YT: any
        __audioEngine?: AudioEngine
    }
}

const CONTAINER_ID = "yt-player-container"

class AudioEngine {
    private player: any = null
    private isApiLoaded = false
    private isPlayerReady = false
    private currentVideoId: string | null = null
    private progressInterval: ReturnType<typeof setInterval> | null = null

    constructor() {
        if (typeof window !== "undefined") {
            this.loadApi()
        }
    }

    /** Destroy the player cleanly (used during HMR cleanup) */
    destroy() {
        this.stopProgressUpdates()
        if (this.player) {
            try {
                this.player.stopVideo?.()
                this.player.destroy?.()
            } catch {
                // Ignore destroy errors
            }
            this.player = null
        }
        this.isPlayerReady = false
    }

    private loadApi() {
        // If the YT API is already loaded (e.g. from a previous HMR cycle), mark it
        if (typeof window.YT !== "undefined" && window.YT.Player) {
            this.isApiLoaded = true
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
        if (this.isApiLoaded) return
        const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]')
        if (existingScript) {
            // Script tag exists but API not ready yet — wait for callback
            const origCb = window.onYouTubeIframeAPIReady
            window.onYouTubeIframeAPIReady = () => {
                origCb?.()
                this.isApiLoaded = true
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
            try {
                this.player.loadVideoById(videoId)
            } catch {
                // Player in bad state, recreate
                this.player = null
                this.isPlayerReady = false
                this.initPlayer(videoId)
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

                onError: (event: { data: number }) => {

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
            if (!this.player || typeof this.player.getCurrentTime !== "function") return

            const currentTime = this.player.getCurrentTime()
            const duration = this.player.getDuration()
            let bufferedPercent = 0

            if (typeof this.player.getVideoLoadedFraction === "function") {
                bufferedPercent = (this.player.getVideoLoadedFraction() || 0) * 100
            }

            const updates: Partial<YouTubePlayerState & { bufferedPercent: number }> = {}
            if (typeof currentTime === "number") updates.progress = currentTime
            if (typeof duration === "number" && duration > 0) updates.duration = duration
            if (bufferedPercent >= 0) updates.bufferedPercent = bufferedPercent

            if (Object.keys(updates).length > 0) {
                useYouTubePlayerStore.setState(updates as any)
            }
        }, 1000)
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
        return this.player?.getCurrentTime?.() ?? 0
    }

    getDuration(): number {
        return this.player?.getDuration?.() ?? 0
    }

    preload(videoId: string) { }

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