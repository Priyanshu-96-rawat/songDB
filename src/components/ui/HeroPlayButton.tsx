"use client";

import { useState, useCallback } from "react";
import { Play, Loader2 } from "lucide-react";
import { useYouTubePlayerStore } from "@/store/youtubePlayer";

interface HeroPlayButtonProps {
    title: string;
    artist: string;
}

export function HeroPlayButton({ title, artist }: HeroPlayButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { playTrack } = useYouTubePlayerStore();
    const accentButtonStyle = {
        backgroundColor: "var(--color-primary)",
        color: "var(--color-primary-foreground)",
        boxShadow: "0 4px 20px color-mix(in srgb, var(--color-primary) 28%, transparent)",
    };

    const handlePlay = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await fetch(
                `/api/youtube-search?q=${encodeURIComponent(`${title} ${artist} audio`)}`
            );
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                playTrack(data.data[0]);
            }
        } catch (err) {
            // Silenced for production
        } finally {
            setIsLoading(false);
        }
    }, [title, artist, playTrack, isLoading]);

    return (
        <button
            onClick={handlePlay}
            disabled={isLoading}
            className="flex items-center gap-2.5 rounded-full px-7 py-3 text-sm font-bold
                hover:brightness-110 hover:scale-105 active:scale-95
                transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={accentButtonStyle}
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Play className="h-4 w-4 fill-current" />
            )}
            Play
        </button>
    );
}
