"use client";


export function formatTime(value: number) {
    if (!Number.isFinite(value) || value <= 0) return "0:00";
    const total = Math.floor(value);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getLyricsStatus(lyrics: { timingMode?: string } | null) {
    if (!lyrics) return "Unavailable";
    if (lyrics.timingMode === "synced") return "Synced";
    if (lyrics.timingMode === "estimated") return "Estimated";
    return "Static";
}

export function getSleepTimerStatus(mode: "off" | "minutes" | "end_of_track", endsAt: number | null, now: number) {
    if (mode === "end_of_track") return "End of track";
    if (mode === "minutes" && endsAt) {
        const remainingMs = Math.max(endsAt - now, 0);
        const remainingMinutes = Math.ceil(remainingMs / 60_000);
        return `${remainingMinutes} min left`;
    }
    return "Off";
}
