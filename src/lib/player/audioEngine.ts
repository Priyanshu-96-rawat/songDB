import { useYouTubePlayerStore } from "@/store/youtubePlayer"

class AudioEngine {
    private audio1: HTMLAudioElement
    private audio2: HTMLAudioElement
    private activeAudio: HTMLAudioElement
    private preloadedUrl: string | null = null

    private audioContext: AudioContext | null
    private sourceNode1: MediaElementAudioSourceNode | null
    private sourceNode2: MediaElementAudioSourceNode | null
    private bassFilter: BiquadFilterNode | null
    private presenceFilter: BiquadFilterNode | null

    constructor() {
        if (typeof window !== "undefined") {
            this.audio1 = new Audio()
            this.audio2 = new Audio()
            
            const setupAudio = (audio: HTMLAudioElement) => {
                audio.preload = "auto"
                audio.crossOrigin = "anonymous"
                audio.setAttribute("playsinline", "true")

                audio.ontimeupdate = () => {
                    if (this.activeAudio !== audio) return
                    const { setProgress } = useYouTubePlayerStore.getState()
                    setProgress(audio.currentTime)
                }

                audio.onplay = () => {
                    if (this.activeAudio !== audio) return
                    useYouTubePlayerStore.setState({ isPlaying: true })
                }

                audio.onplaying = () => {
                    if (this.activeAudio !== audio) return
                    useYouTubePlayerStore.setState({ isLoading: false, isPlaying: true })
                }

                audio.onwaiting = () => {
                    if (this.activeAudio !== audio) return
                    useYouTubePlayerStore.setState({ isLoading: true })
                }

                audio.onloadedmetadata = () => {
                    if (this.activeAudio !== audio) return
                    const { setDuration } = useYouTubePlayerStore.getState()
                    if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
                        setDuration(audio.duration)
                    }
                }

                audio.oncanplay = () => {
                    if (this.activeAudio !== audio) return
                    useYouTubePlayerStore.setState({ isLoading: false })
                }

                audio.onpause = () => {
                    if (this.activeAudio !== audio) return
                    if (!audio.ended) {
                        useYouTubePlayerStore.setState({ isPlaying: false, isLoading: false })
                    }
                }

                audio.onended = () => {
                    if (this.activeAudio !== audio) return
                    useYouTubePlayerStore.setState({ isPlaying: false, isLoading: false })
                    const { handleTrackEnded } = useYouTubePlayerStore.getState()
                    handleTrackEnded()
                }

                audio.onerror = () => {
                    if (this.activeAudio !== audio) return
                    console.error("Audio streaming error occurred. Attempting to skip to the next track.");
                    useYouTubePlayerStore.setState({ isPlaying: false, isLoading: false, error: "Stream error - skipping" })
                    const { nextTrack } = useYouTubePlayerStore.getState()
                    setTimeout(() => nextTrack(), 1000)
                }
            }

            setupAudio(this.audio1)
            setupAudio(this.audio2)

            this.activeAudio = this.audio1

            this.audioContext = null
            this.sourceNode1 = null
            this.sourceNode2 = null
            this.bassFilter = null
            this.presenceFilter = null
        } else {
            this.audio1 = {} as HTMLAudioElement
            this.audio2 = {} as HTMLAudioElement
            this.activeAudio = this.audio1
            this.audioContext = null
            this.sourceNode1 = null
            this.sourceNode2 = null
            this.bassFilter = null
            this.presenceFilter = null
        }
    }

    get audio() {
        return this.activeAudio
    }

    private ensureAudioGraph() {
        if (typeof window === "undefined") return
        if (this.audioContext && this.sourceNode1 && this.sourceNode2 && this.bassFilter && this.presenceFilter) return

        const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Context) return

        this.audioContext = new Context()
        this.sourceNode1 = this.audioContext.createMediaElementSource(this.audio1)
        this.sourceNode2 = this.audioContext.createMediaElementSource(this.audio2)
        
        this.bassFilter = this.audioContext.createBiquadFilter()
        this.bassFilter.type = "lowshelf"
        this.bassFilter.frequency.value = 180
        this.bassFilter.gain.value = 0

        this.presenceFilter = this.audioContext.createBiquadFilter()
        this.presenceFilter.type = "highshelf"
        this.presenceFilter.frequency.value = 3200
        this.presenceFilter.gain.value = 0

        // Mix both sources into the same filter chain
        this.sourceNode1.connect(this.bassFilter)
        this.sourceNode2.connect(this.bassFilter)
        this.bassFilter.connect(this.presenceFilter)
        this.presenceFilter.connect(this.audioContext.destination)

        const { bassBoost, soundProfile } = useYouTubePlayerStore.getState()
        this.setBassBoost(bassBoost)
        this.setSoundProfile(soundProfile)
    }

    play(url: string) {
        if (typeof window === "undefined") return
        this.ensureAudioGraph()
        this.audioContext?.resume().catch(() => undefined)

        const inactiveAudio = this.activeAudio === this.audio1 ? this.audio2 : this.audio1
        
        if (this.preloadedUrl === url) {
            // Swap active audio to the preloaded one
            this.activeAudio.pause()
            
            // Note: intentionally not clearing src to avoid aborting any pending requests unnecessarily
            this.activeAudio = inactiveAudio
            this.preloadedUrl = null
        } else {
            // Not preloaded, load it into the active audio directly
            this.activeAudio.src = url
            inactiveAudio.pause()
            this.preloadedUrl = null
        }

        this.activeAudio.play().catch(err => console.error("AudioEngine Play Error:", err))
        
        const { volume } = useYouTubePlayerStore.getState()
        this.activeAudio.volume = volume
    }

    preload(url: string) {
        if (typeof window === "undefined") return
        if (this.preloadedUrl === url) return

        const inactiveAudio = this.activeAudio === this.audio1 ? this.audio2 : this.audio1
        inactiveAudio.src = url
        inactiveAudio.load()
        this.preloadedUrl = url
    }

    pause() {
        if (typeof window === "undefined") return
        this.activeAudio.pause()
    }

    resume() {
        if (typeof window === "undefined") return
        this.ensureAudioGraph()
        this.audioContext?.resume().catch(() => undefined)
        this.activeAudio.play().catch(err => console.error("AudioEngine Resume Error:", err))
    }

    seek(time: number) {
        if (typeof window === "undefined") return
        this.activeAudio.currentTime = time
    }

    setVolume(volume: number) {
        if (typeof window === "undefined") return
        this.activeAudio.volume = volume
    }

    setBassBoost(value: number) {
        this.ensureAudioGraph()
        if (!this.bassFilter) return
        this.bassFilter.gain.value = value
    }

    setSoundProfile(profile: "balanced" | "enhanced") {
        this.ensureAudioGraph()
        if (!this.presenceFilter) return
        this.presenceFilter.gain.value = profile === "enhanced" ? 3.5 : 0
    }
}

export const audioEngine = new AudioEngine()
