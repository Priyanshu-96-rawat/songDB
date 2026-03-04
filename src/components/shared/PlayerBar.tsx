"use client";

import { usePlayerStore } from '@/store/player';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useEffect } from 'react';
import Image from 'next/image';

export function PlayerBar() {
    const { currentSong, isPlaying, progress, duration, togglePlay, setProgress } = usePlayerStore();

    // Mock progress simulation
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setProgress(progress >= duration ? 0 : progress + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, progress, duration, setProgress]);

    if (!currentSong) return null; // Only show if a song is loaded

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-muted px-4 py-3 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="container mx-auto max-w-7xl flex items-center justify-between gap-4">

                {/* Left: Song Info */}
                <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
                    <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-white/5">
                        <Image
                            src={currentSong.coverArt || "/api/placeholder/400/400"}
                            alt={currentSong.title}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="flex flex-col truncate">
                        <span className="text-sm font-semibold truncate text-foreground">{currentSong.title}</span>
                        <span className="text-xs text-muted-foreground truncate">{currentSong.artist}</span>
                    </div>
                </div>

                {/* Center: Controls & Progress */}
                <div className="flex flex-col items-center flex-1 max-w-2xl px-4">
                    <div className="flex items-center gap-6 mb-1.5">
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <SkipBack className="h-5 w-5 fill-current" />
                        </button>
                        <button
                            onClick={togglePlay}
                            className="h-10 w-10 flex items-center justify-center rounded-full bg-foreground text-background hover:scale-105 transition-transform"
                        >
                            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-1" />}
                        </button>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <SkipForward className="h-5 w-5 fill-current" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                        <span className="text-[10px] text-muted-foreground w-8 text-right">
                            {Math.floor(progress / 60)}:{(progress % 60).toString().padStart(2, '0')}
                        </span>
                        <div className="h-1.5 bg-muted rounded-full flex-1 relative overflow-hidden group">
                            <div
                                className="absolute top-0 left-0 bottom-0 bg-primary group-hover:bg-primary/80 transition-all rounded-full"
                                style={{ width: `${(progress / duration) * 100}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8">
                            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Right: Extra Controls */}
                <div className="flex items-center justify-end w-1/4 min-w-[150px] gap-2">
                    <Volume2 className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                    <div className="h-1.5 w-24 bg-muted rounded-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 bottom-0 w-2/3 bg-foreground rounded-full" />
                    </div>
                </div>

            </div>
        </div>
    );
}
