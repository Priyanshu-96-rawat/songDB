import { useYouTubePlayerStore, type YouTubePlayerState } from "@/store/youtubePlayer"

/**
 * AudioEngine (YouTube IFrame API)
 * Uses the official YouTube IFrame API for playback.
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
    private isPlayerReady = false
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
                    console.log("[AudioEngine] Player Ready")
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
                    console.error("[AudioEngine] Player Error:", event.data)

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
        }, 1000) // Update every 1 second for better performance
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
                console.warn("[AudioEngine] loadVideoById called too early")
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

export const audioEngine = new AudioEngine()