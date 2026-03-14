export default function Loading() {
    return (
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center animate-fade-in">
            {/* Ambient glow */}
            <div
                className="absolute h-48 w-48 animate-pulse rounded-full blur-[80px]"
                style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)" }}
            />

            <div className="relative flex flex-col items-center gap-6">
                {/* Logo */}
                <div
                    className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent"
                    style={{ boxShadow: "0 0 40px color-mix(in srgb, var(--color-primary) 25%, transparent)" }}
                >
                    <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect className="splash-bar" x="4" y="16" width="4" height="8" rx="2" fill="white" style={{ animationDelay: '0ms' }} />
                        <rect className="splash-bar" x="11" y="10" width="4" height="20" rx="2" fill="white" style={{ animationDelay: '120ms' }} />
                        <rect className="splash-bar" x="18" y="6" width="4" height="28" rx="2" fill="white" style={{ animationDelay: '240ms' }} />
                        <rect className="splash-bar" x="25" y="12" width="4" height="16" rx="2" fill="white" style={{ animationDelay: '360ms' }} />
                        <rect className="splash-bar" x="32" y="14" width="4" height="12" rx="2" fill="white" style={{ animationDelay: '480ms' }} />
                    </svg>
                </div>

                {/* Text */}
                <h2 className="text-sm font-semibold tracking-wide text-white/50 uppercase">
                    Loading
                    <span className="loading-ellipsis" />
                </h2>
            </div>
        </div>
    );
}
