import { useYouTubePlayerStore } from "@/store/youtubePlayer"

// ─── AudioEngine (HTML5 Audio + Web Audio API) ──────────────────────

class AudioEngine {
    private _audio: HTMLAudioElement | null = null
    private _preloadAudio: HTMLAudioElement | null = null
    private audioContext: AudioContext | null = null
    private sourceNode: MediaElementAudioSourceNode | null = null
    private gainNode: GainNode | null = null
    private bassFilter: BiquadFilterNode | null = null
    private progressInterval: ReturnType<typeof setInterval> | null = null
    private retryCount = 0
    private maxRetries = 2
    private currentVideoId: string | null = null

    constructor() {
        if (typeof window !== "undefined") {
            this.initAudio()
        }
    }

    get audio(): HTMLAudioElement | null {
        return this._audio
    }

    // ── Initialize the primary audio element ──
    private initAudio() {
        if (this._audio) return

        this._audio = new Audio()
        this._audio.crossOrigin = "anonymous"
        this._audio.preload = "auto"
        this._audio.volume = 1

        this.bindEvents(this._audio)
    }

    // ── Bind all HTML5 audio events ──
    private bindEvents(audio: HTMLAudioElement) {
        audio.addEventListener("play", () => {
            useYouTubePlayerStore.setState({ isPlaying: true, isLoading: false })
            this.startProgressUpdates()
        })

        audio.addEventListener("playing", () => {
            useYouTubePlayerStore.setState({ isPlaying: true, isLoading: false })
        })

        audio.addEventListener("pause", () => {
            useYouTubePlayerStore.setState({ isPlaying: false })
            this.stopProgressUpdates()
        })

        audio.addEventListener("waiting", () => {
            useYouTubePlayerStore.setState({ isLoading: true })
        })

        audio.addEventListener("canplay", () => {
            useYouTubePlayerStore.setState({ isLoading: false })
        })

        audio.addEventListener("loadedmetadata", () => {
            if (audio.duration && isFinite(audio.duration)) {
                useYouTubePlayerStore.setState({ duration: audio.duration })
            }
        })

        audio.addEventListener("timeupdate", () => {
            if (audio.currentTime !== undefined && !isNaN(audio.currentTime)) {
                useYouTubePlayerStore.setState({ progress: audio.currentTime })
            }
        })

        audio.addEventListener("ended", () => {
            useYouTubePlayerStore.setState({ isPlaying: false, isLoading: false })
            this.stopProgressUpdates()
            const { handleTrackEnded } = useYouTubePlayerStore.getState()
            handleTrackEnded()
        })

        audio.addEventListener("error", () => {
            this.handleError()
        })

        audio.addEventListener("stalled", () => {
            // Only treat as error if we've been stalled for too long
            setTimeout(() => {
                if (audio.readyState < 2 && this.retryCount < this.maxRetries) {
                    this.handleError()
                }
            }, 5000)
        })
    }

    // ── Error handler with retry logic ──
    private handleError() {
        if (this.retryCount < this.maxRetries && this.currentVideoId) {
            this.retryCount++
            console.warn(`[AudioEngine] Stream error, retrying (${this.retryCount}/${this.maxRetries})...`)

            const videoId = this.currentVideoId
            const delay = this.retryCount * 1500 // 1.5s, 3s backoff

            setTimeout(() => {
                // Only retry if we're still on the same track
                if (this.currentVideoId === videoId && this._audio) {
                    const url = `/api/youtube-stream?id=${videoId}&retry=${this.retryCount}`
                    this._audio.src = url
                    this._audio.load()
                    this._audio.play().catch(() => {
                        // If still failing, let the next error handler deal with it
                    })
                }
            }, delay)
        } else {
            console.error("[AudioEngine] Stream failed after retries")
            useYouTubePlayerStore.setState({
                isPlaying: false,
                isLoading: false,
                error: "Unable to play this track. The stream may be unavailable.",
            })

            // Auto-skip to next track after showing error briefly
            setTimeout(() => {
                const { nextTrack, error } = useYouTubePlayerStore.getState()
                if (error) {
                    nextTrack()
                }
            }, 3000)
        }
    }

    // ── Web Audio API setup for EQ ──
    private initWebAudio() {
        if (this.audioContext || !this._audio) return

        try {
            this.audioContext = new AudioContext()
            this.sourceNode = this.audioContext.createMediaElementSource(this._audio)

            // Bass boost filter
            this.bassFilter = this.audioContext.createBiquadFilter()
            this.bassFilter.type = "lowshelf"
            this.bassFilter.frequency.value = 200
            this.bassFilter.gain.value = 0

            // Master gain
            this.gainNode = this.audioContext.createGain()
            this.gainNode.gain.value = 1

            // Chain: source → bass → gain → destination
            this.sourceNode.connect(this.bassFilter)
            this.bassFilter.connect(this.gainNode)
            this.gainNode.connect(this.audioContext.destination)
        } catch (e) {
            console.warn("[AudioEngine] Web Audio API init failed:", e)
            // Fallback: connect directly if Web Audio fails
            if (this.sourceNode && this.audioContext) {
                try {
                    this.sourceNode.connect(this.audioContext.destination)
                } catch {
                    // Ignore — audio will still play without EQ
                }
            }
        }
    }

    // ── Progress updates ──
    private startProgressUpdates() {
        this.stopProgressUpdates()
        this.progressInterval = setInterval(() => {
            if (!this._audio) return
            const t = this._audio.currentTime
            if (typeof t === "number" && !isNaN(t)) {
                useYouTubePlayerStore.setState({ progress: t })
            }
        }, 250)
    }

    private stopProgressUpdates() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval)
            this.progressInterval = null
        }
    }

    // ── Public API ──

    getCurrentTime(): number {
        return this._audio?.currentTime ?? 0
    }

    getDuration(): number {
        const d = this._audio?.duration
        return d && isFinite(d) ? d : 0
    }

    play(videoId: string) {
        if (typeof window === "undefined") return
        if (!this._audio) this.initAudio()
        if (!this._audio) return

        this.retryCount = 0
        this.currentVideoId = videoId

        // Init Web Audio on first play (requires user gesture)
        if (!this.audioContext) {
            this.initWebAudio()
        } else if (this.audioContext.state === "suspended") {
            this.audioContext.resume().catch(() => {})
        }

        // Check if preloaded audio matches
        if (this._preloadAudio && this._preloadAudio.src.includes(`id=${videoId}`)) {
            // Swap preloaded audio in
            this.stopProgressUpdates()

            // Transfer Web Audio source if needed
            if (this.sourceNode && this.audioContext) {
                try { this.sourceNode.disconnect() } catch {}
                this.sourceNode = this.audioContext.createMediaElementSource(this._preloadAudio)
                if (this.bassFilter) {
                    this.sourceNode.connect(this.bassFilter)
                } else {
                    this.sourceNode.connect(this.audioContext.destination)
                }
            }

            // Rebind events
            this._audio.pause()
            this._audio.removeAttribute("src")
            this._audio = this._preloadAudio
            this._preloadAudio = null
            this.bindEvents(this._audio)

            this._audio.play().catch(() => {})
            return
        }

        const url = `/api/youtube-stream?id=${videoId}`
        this._audio.src = url
        this._audio.load()
        this._audio.play().catch(() => {
            // Autoplay may be blocked — user interaction needed
            console.warn("[AudioEngine] Autoplay blocked, waiting for user gesture")
        })
    }

    preload(videoId: string) {
        if (typeof window === "undefined") return
        if (this.currentVideoId === videoId) return

        // Cleanup existing preload
        if (this._preloadAudio) {
            this._preloadAudio.pause()
            this._preloadAudio.removeAttribute("src")
            this._preloadAudio.load()
        }

        this._preloadAudio = new Audio()
        this._preloadAudio.crossOrigin = "anonymous"
        this._preloadAudio.preload = "auto"
        this._preloadAudio.src = `/api/youtube-stream?id=${videoId}`
        this._preloadAudio.load()
    }

    pause() {
        this._audio?.pause()
    }

    resume() {
        if (typeof window === "undefined") return

        if (this.audioContext?.state === "suspended") {
            this.audioContext.resume().catch(() => {})
        }

        this._audio?.play().catch(() => {})
    }

    seek(time: number) {
        if (!this._audio) return
        try {
            this._audio.currentTime = time
        } catch {
            // Seek may fail if media isn't loaded yet
        }
    }

    setVolume(volume: number) {
        // Store uses 0-1 range
        if (this._audio) {
            this._audio.volume = Math.max(0, Math.min(1, volume))
        }
    }

    setBassBoost(value: number) {
        if (this.bassFilter) {
            this.bassFilter.gain.value = value
        }
    }

    setSoundProfile(profile: "balanced" | "enhanced") {
        if (!this.gainNode || !this.bassFilter) return

        if (profile === "enhanced") {
            this.bassFilter.gain.value = Math.max(this.bassFilter.gain.value, 3)
            this.gainNode.gain.value = 1.08
        } else {
            this.bassFilter.gain.value = 0
            this.gainNode.gain.value = 1
        }
    }
}

export const audioEngine = new AudioEngine()
