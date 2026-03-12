import { useYouTubePlayerStore } from "@/store/youtubePlayer"

/**
 * AudioEngine (YouTube IFrame API)
 * 
 * Re-implemented to use the official YouTube IFrame Player API for playback.
 * This approach renders a hidden iframe and controls it via postMessage,
 * which is much more reliable than trying to proxy .googlevideo.com streams.
 */

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void
        YT: any
    }
}

class AudioEngine {
    private player: any = null
    private isApiLoaded = false
    private currentVideoId: string | null = null
    private progressInterval: ReturnType<typeof setInterval> | null = null
    private containerId = "yt-player-container"

    constructor() {
        if (typeof window !== "undefined") {
            this.loadApi()
        }
    }

    private loadApi() {
        if (this.isApiLoaded) return

        // Create container if it doesn't exist
        if (!document.getElementById(this.containerId)) {
            const container = document.createElement("div")
            container.id = this.containerId
            container.style.position = "fixed"
            container.style.top = "-9999px"
            container.style.left = "-9999px"
            container.style.width = "1px"
            container.style.height = "1px"
            container.style.opacity = "0"
            container.style.pointerEvents = "none"
            document.body.appendChild(container)
        }

        // Load IFrame API script
        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        const firstScriptTag = document.getElementsByTagName("script")[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

        window.onYouTubeIframeAPIReady = () => {
            this.isApiLoaded = true
            console.log("[AudioEngine] YouTube IFrame API Ready")
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
            this.player.loadVideoById(videoId)
            return
        }

        this.player = new window.YT.Player(this.containerId, {
            height: "1",
            width: "1",
            videoId: videoId,
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
                    console.log("[AudioEngine] Player Ready")
                    useYouTubePlayerStore.setState({ isLoading: false })
                    this.startProgressUpdates()
                },
                onStateChange: (event: any) => {
                    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
                    const state = event.data
                    switch (state) {
                        case 1: // playing
                            useYouTubePlayerStore.setState({ isPlaying: true, isLoading: false })
                            this.startProgressUpdates()
                            break
                        case 2: // paused
                            useYouTubePlayerStore.setState({ isPlaying: false })
                            this.stopProgressUpdates()
                            break
                        case 3: // buffering
                            useYouTubePlayerStore.setState({ isLoading: true })
                            break
                        case 0: // ended
                            useYouTubePlayerStore.setState({ isPlaying: false, isLoading: false })
                            this.stopProgressUpdates()
                            useYouTubePlayerStore.getState().handleTrackEnded()
                            break
                        case 5: // cued
                            useYouTubePlayerStore.setState({ isLoading: false })
                            break
                    }
                },
                onError: (event: any) => {
                    console.error("[AudioEngine] Player Error:", event.data)
                    useYouTubePlayerStore.setState({
                        isPlaying: false,
                        isLoading: false,
                        error: "Unable to play this video. It may be restricted or unavailable.",
                    })
                    // Auto-skip after 3s
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

            if (typeof currentTime === "number" && !isNaN(currentTime)) {
                useYouTubePlayerStore.setState({ progress: currentTime })
            }
            if (typeof duration === "number" && !isNaN(duration) && duration > 0) {
                useYouTubePlayerStore.setState({ duration: duration })
            }

            if (typeof this.player.getVideoLoadedFraction === "function") {
                const fraction = this.player.getVideoLoadedFraction()
                if (typeof fraction === "number" && !isNaN(fraction)) {
                    useYouTubePlayerStore.setState({ bufferedPercent: fraction * 100 })
                }
            }
        }, 500)
    }

    private stopProgressUpdates() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval)
            this.progressInterval = null
        }
    }

    // ── Public API ──

    play(videoId: string) {
        this.currentVideoId = videoId
        if (!this.player) {
            this.initPlayer(videoId)
        } else {
            this.player.loadVideoById(videoId)
        }
        useYouTubePlayerStore.setState({ isLoading: true, error: null })
    }

    pause() {
        if (this.player && typeof this.player.pauseVideo === "function") {
            this.player.pauseVideo()
        }
    }

    resume() {
        if (this.player && typeof this.player.playVideo === "function") {
            this.player.playVideo()
        }
    }

    seek(time: number) {
        if (this.player && typeof this.player.seekTo === "function") {
            this.player.seekTo(time, true)
        }
    }

    setVolume(volume: number) {
        // YT uses 0-100
        if (this.player && typeof this.player.setVolume === "function") {
            this.player.setVolume(volume * 100)
        }
    }

    getCurrentTime(): number {
        return this.player?.getCurrentTime?.() ?? 0
    }

    getDuration(): number {
        return this.player?.getDuration?.() ?? 0
    }

    // Preload is less effective with IFrame API than direct audio, 
    // but we can "cue" the next video to speed up loading.
    preload(videoId: string) {
        // Selective implementation: don't interrupt current playback
    }

    // EQ and Profiling are not possible with IFrame API (no MediaElementSource)
    setBassBoost(value: number) {}
    setSoundProfile(profile: "balanced" | "enhanced") {}
}

export const audioEngine = new AudioEngine()
