"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
    const [mounted, setMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        setMounted(true);
        const dismissed = window.sessionStorage.getItem("songdb-splash-dismissed") === "1";
        if (!dismissed) {
            setIsVisible(true);
        }
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        window.sessionStorage.setItem("songdb-splash-dismissed", "1");

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const minDisplayTime = prefersReducedMotion ? 280 : 650;
        const exitDuration = prefersReducedMotion ? 120 : 220;

        const timer1 = setTimeout(() => setIsLeaving(true), minDisplayTime);
        const timer2 = setTimeout(() => setIsVisible(false), minDisplayTime + exitDuration);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [isVisible]);

    if (!mounted || !isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black pointer-events-none transition-all duration-600 ease-[cubic-bezier(0.85,0,0.15,1)] ${isLeaving ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}
        >
            {/* Ambient glow */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="splash-glow-orb splash-glow-orb-1" />
                <div className="splash-glow-orb splash-glow-orb-2" />
                <div className="splash-glow-orb splash-glow-orb-3" />
            </div>

            <div className="relative flex flex-col items-center gap-5">
                {/* Logo mark */}
                <div className="splash-logo-container">
                    {/* Outer ring pulse */}
                    <div className="splash-ring" />
                    <div className="splash-ring splash-ring-delay" />

                    {/* Logo icon */}
                    <div
                        className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-primary via-secondary to-accent splash-logo-icon"
                        style={{ boxShadow: "0 0 60px color-mix(in srgb, var(--color-primary) 35%, transparent)" }}
                    >
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Waveform bars */}
                            <rect className="splash-bar" x="4" y="16" width="4" height="8" rx="2" fill="white" style={{ animationDelay: '0ms' }} />
                            <rect className="splash-bar" x="11" y="10" width="4" height="20" rx="2" fill="white" style={{ animationDelay: '120ms' }} />
                            <rect className="splash-bar" x="18" y="6" width="4" height="28" rx="2" fill="white" style={{ animationDelay: '240ms' }} />
                            <rect className="splash-bar" x="25" y="12" width="4" height="16" rx="2" fill="white" style={{ animationDelay: '360ms' }} />
                            <rect className="splash-bar" x="32" y="14" width="4" height="12" rx="2" fill="white" style={{ animationDelay: '480ms' }} />
                        </svg>
                    </div>
                </div>

                {/* Wordmark */}
                <div className="flex flex-col items-center gap-1.5">
                    <h1 className="splash-wordmark font-extrabold text-4xl tracking-tight">
                        SongDB
                    </h1>
                    <div className="flex flex-col items-center">
                        <p className="text-white/25 text-[10px] tracking-[0.4em] uppercase font-medium">
                            Music Streaming
                        </p>
                        <p className="text-[var(--color-primary)] opacity-40 text-[9px] tracking-[0.2em] uppercase font-bold mt-1">
                            Made by Priyanshu
                        </p>
                    </div>
                </div>

                {/* Waveform loader */}
                <div className="flex items-end gap-[3px] h-5 mt-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="splash-wave-bar w-[3px] rounded-full bg-gradient-to-t from-primary to-secondary"
                            style={{ animationDelay: `${i * 100}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
