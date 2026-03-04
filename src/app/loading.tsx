import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="fixed inset-0 min-h-screen bg-zinc-950 flex flex-col items-center justify-center z-50">
            <div className="relative flex flex-col items-center justify-center">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full w-32 h-32 animate-pulse" />

                {/* Animated 3D-like Icon container */}
                <div className="relative z-10 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm shadow-2xl flex items-center justify-center animate-in fade-in duration-500 zoom-in-95">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                </div>

                {/* Text loading animation */}
                <h2 className="mt-8 text-xl font-medium tracking-tight text-zinc-300 animate-pulse">
                    Loading SongDB...
                </h2>
                <div className="mt-2 flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
            </div>
        </div>
    );
}
