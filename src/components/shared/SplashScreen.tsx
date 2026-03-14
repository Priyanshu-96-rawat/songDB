"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLibraryStore } from "@/store/library";
import { installConsoleSuppression } from "@/lib/suppressConsoleNoise";

export function SplashScreen() {
    const { loading: authLoading } = useAuth();
    const hasHydrated = useLibraryStore((state) => state.hasHydrated);
    const isLoading = authLoading || !hasHydrated;

    // Start visible immediately — no flash of content behind
    const [isLeaving, setIsLeaving] = useState(false);
    const [shouldRender, setShouldRender] = useState(true);

    // Install console suppression as early as possible
    useEffect(() => {
        installConsoleSuppression();
    }, []);

    // Safety timeout: dismiss after 5s no matter what
    useEffect(() => {
        const safetyTimer = setTimeout(() => {
            setIsLeaving(true);
            setTimeout(() => setShouldRender(false), 600);
        }, 5000);
        return () => clearTimeout(safetyTimer);
    }, []);

    // Dismiss when loading finishes
    useEffect(() => {
        if (isLoading) return;

        const timer = setTimeout(() => {
            setIsLeaving(true);
            setTimeout(() => setShouldRender(false), 600);
        }, 200);

        return () => clearTimeout(timer);
    }, [isLoading]);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050508] transition-all duration-500 ease-[cubic-bezier(0.85,0,0.15,1)] ${
                isLeaving ? "opacity-0 scale-[1.03] pointer-events-none" : "opacity-100 scale-100"
            }`}
            style={{
                /* Ensure splash is ALWAYS on top and blocks interaction */
                willChange: "opacity, transform",
            }}
        >
            {/* Subtle ambient gradient — no heavy orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        background: `
                            radial-gradient(ellipse 600px 500px at 50% 45%, rgba(120, 80, 255, 0.18) 0%, transparent 70%),
                            radial-gradient(ellipse 400px 300px at 35% 55%, rgba(0, 200, 255, 0.10) 0%, transparent 60%),
                            radial-gradient(ellipse 300px 250px at 65% 40%, rgba(255, 60, 170, 0.08) 0%, transparent 60%)
                        `,
                    }}
                />
            </div>

            <div className="relative flex flex-col items-center gap-6">
                {/* Logo mark */}
                <div className="splash-logo-container">
                    {/* Pulse ring */}
                    <div className="splash-ring-v2" />
                    <div className="splash-ring-v2 splash-ring-v2-delay" />

                    {/* Logo icon — vinyl disc with note */}
                    <div
                        className="relative flex h-[100px] w-[100px] items-center justify-center rounded-[30px] splash-logo-icon overflow-hidden"
                        style={{
                            background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 40%, #06B6D4 100%)",
                            boxShadow: "0 0 80px rgba(120, 80, 255, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)",
                        }}
                    >
                        {/* Inner glow overlay */}
                        <div
                            className="absolute inset-0 opacity-30"
                            style={{
                                background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 50%)",
                            }}
                        />

                        {/* Music note SVG */}
                        <svg
                            width="44"
                            height="44"
                            viewBox="0 0 44 44"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="relative z-10"
                        >
                            {/* Vinyl disc outer ring */}
                            <circle cx="22" cy="22" r="18" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
                            <circle cx="22" cy="22" r="13" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none" />
                            {/* Center dot */}
                            <circle cx="22" cy="22" r="3" fill="white" opacity="0.9" />
                            {/* Music note overlay */}
                            <path
                                d="M26 14V28.5C26 30.433 24.433 32 22.5 32C20.567 32 19 30.433 19 28.5C19 26.567 20.567 25 22.5 25C23.163 25 23.785 25.167 24.331 25.462V14L30 12V17L26 14Z"
                                fill="white"
                                opacity="0.95"
                            />
                        </svg>
                    </div>
                </div>

                {/* Wordmark */}
                <div className="flex flex-col items-center gap-2">
                    <h1 className="splash-wordmark-v2 font-extrabold text-[2.5rem] tracking-tight leading-none">
                        SongDB
                    </h1>
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-white/20 text-[10px] tracking-[0.5em] uppercase font-medium">
                            Music Streaming
                        </p>
                    </div>
                </div>

                {/* Minimal loading indicator — 3 dots */}
                <div className="flex items-center gap-1.5 mt-1">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-white/30 splash-dot"
                            style={{ animationDelay: `${i * 200}ms` }}
                        />
                    ))}
                </div>

                {/* Credit */}
                <p className="text-white/15 text-[9px] tracking-[0.2em] uppercase font-bold mt-4">
                    Made by Priyanshu
                </p>
            </div>
        </div>
    );
}
