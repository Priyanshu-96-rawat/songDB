"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const minDisplayTime = 1500;
        const timer1 = setTimeout(() => setIsLeaving(true), minDisplayTime);
        const timer2 = setTimeout(() => setIsVisible(false), minDisplayTime + 500);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.85,0,0.15,1)] ${isLeaving ? '-translate-y-full' : 'translate-y-0'}`}
        >
            <div className="flex flex-col items-center gap-6 animate-scale-in">
                {/* Logo */}
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/20">
                    <span className="font-extrabold text-white text-4xl transform -rotate-12">S</span>
                </div>
                {/* Wordmark */}
                <h1 className="font-extrabold text-4xl tracking-tighter gradient-text">
                    SongDB
                </h1>
                {/* Dots */}
                <div className="flex items-center gap-2 mt-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}
