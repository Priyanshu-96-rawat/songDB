"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Download, Smartphone, Monitor, QrCode, Check, Share2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function DownloadPage() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [justInstalled, setJustInstalled] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string>("");

    useEffect(() => {
        setHasMounted(true);
        const matchMedia = window.matchMedia("(display-mode: standalone)");
        if (matchMedia.matches) {
            setIsInstalled(true);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const appUrl = useMemo(() => {
        if (!hasMounted) return "";
        return window.location.origin;
    }, [hasMounted]);

    useEffect(() => {
        if (appUrl) {
            QRCode.toDataURL(appUrl, {
                margin: 2,
                scale: 10,
                color: {
                    dark: "#06080d",
                    light: "#ffffff"
                }
            })
            .then(url => setQrDataUrl(url))
            .catch(() => {/* Silenced for production */});
        }
    }, [appUrl]);

    const isMobile = useMemo(() => {
        if (!hasMounted) return false;
        return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }, [hasMounted]);

    const handleInstall = useCallback(async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const result = await installPrompt.userChoice;
        if (result.outcome === "accepted") {
            setIsInstalled(true);
            setJustInstalled(true);
        }
        setInstallPrompt(null);
    }, [installPrompt]);

    const handleShare = useCallback(async () => {
        if (navigator.share) {
            await navigator.share({
                title: "SongDB — Music Streaming",
                text: "Stream unlimited music for free",
                url: appUrl,
            });
        } else {
            await navigator.clipboard.writeText(appUrl);
        }
    }, [appUrl]);

    return (
        <div className="px-6 py-6 pb-28 max-w-3xl mx-auto">
            {/* Back */}
            <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors mb-8">
                <ArrowLeft className="w-4 h-4" />
                Back to music
            </Link>

            {/* Hero */}
            <div className="text-center mb-12">
                {/* Logo */}
                <div className="mx-auto w-20 h-20 rounded-[24px] bg-gradient-to-br from-[#ff6a3d] via-[#ff835c] to-[#ffd29f] flex items-center justify-center shadow-[0_0_60px_rgba(255,106,61,0.3)] mb-6">
                    <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                        <rect x="4" y="16" width="4" height="8" rx="2" fill="white" />
                        <rect x="11" y="10" width="4" height="20" rx="2" fill="white" />
                        <rect x="18" y="6" width="4" height="28" rx="2" fill="white" />
                        <rect x="25" y="12" width="4" height="16" rx="2" fill="white" />
                        <rect x="32" y="14" width="4" height="12" rx="2" fill="white" />
                    </svg>
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
                    Get <span className="splash-wordmark">SongDB</span>
                </h1>
                <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
                    Install SongDB on your device for a native app experience — offline support, instant launch, and background playback.
                </p>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2">

                {/* Install Card */}
                <div className="glass rounded-2xl p-6 flex flex-col items-center text-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff6a3d]/20 to-[#ffd29f]/10 flex items-center justify-center">
                        {isMobile ? (
                            <Smartphone className="w-6 h-6 text-[#ff6a3d]" />
                        ) : (
                            <Monitor className="w-6 h-6 text-[#ff6a3d]" />
                        )}
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-white mb-1">
                            {isInstalled ? "Already Installed" : "Install App"}
                        </h2>
                        <p className="text-white/30 text-xs leading-relaxed">
                            {isInstalled
                                ? "SongDB is installed on this device. Open it from your home screen."
                                : isMobile
                                    ? "Add to your home screen for instant access."
                                    : "Install as a desktop app for a seamless experience."
                            }
                        </p>
                    </div>

                    {justInstalled ? (
                        <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-green-500/10 text-green-400 text-sm font-semibold">
                            <Check className="w-4 h-4" />
                            Installed Successfully!
                        </div>
                    ) : isInstalled ? (
                        <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 text-white/40 text-sm font-medium">
                            <Check className="w-4 h-4" />
                            Already installed
                        </div>
                    ) : installPrompt ? (
                        <button
                            onClick={handleInstall}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#ff6a3d] to-[#ff835c] text-white text-sm font-bold shadow-[0_4px_20px_rgba(255,106,61,0.3)] hover:shadow-[0_4px_30px_rgba(255,106,61,0.5)] hover:scale-105 active:scale-95 transition-all"
                        >
                            <Download className="w-4 h-4" />
                            Install Now
                        </button>
                    ) : (
                        <div className="text-xs text-white/20 px-4 py-2 rounded-lg bg-white/[0.02]">
                            {isMobile
                                ? "Use your browser's \"Add to Home Screen\" option"
                                : "Use Chrome or Edge for install support"
                            }
                        </div>
                    )}
                </div>

                {/* QR Code Card */}
                <div className="glass rounded-2xl p-6 flex flex-col items-center text-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ffd29f]/20 to-[#ff6a3d]/10 flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-[#ffd29f]" />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-white mb-1">Scan to Install</h2>
                        <p className="text-white/30 text-xs leading-relaxed">
                            Scan this QR code with your phone to open SongDB on mobile.
                        </p>
                    </div>

                    {/* QR Code */}
                    <div className="p-3 rounded-2xl bg-white shadow-[0_0_40px_rgba(255,255,255,0.05)] overflow-hidden">
                        {qrDataUrl ? (
                            <Image 
                                src={qrDataUrl} 
                                width={180} 
                                height={180} 
                                unoptimized 
                                alt={`QR code for ${appUrl}`} 
                                className="w-[180px] h-[180px]"
                            />
                        ) : (
                            <div className="w-[180px] h-[180px] animate-pulse rounded-xl bg-black/5" />
                        )}
                    </div>

                    <p className="text-[10px] text-white/15 font-mono truncate max-w-full">
                        {appUrl}
                    </p>
                </div>
            </div>

            {/* Share Link */}
            <div className="mt-8 flex justify-center">
                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] transition-all"
                >
                    <Share2 className="w-4 h-4" />
                    Share App Link
                </button>
            </div>

            {/* Features */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Offline Ready", desc: "Works without internet" },
                    { label: "Background Play", desc: "Music keeps playing" },
                    { label: "Instant Launch", desc: "From your home screen" },
                ].map((f, i) => (
                    <div key={i} className="text-center p-4 rounded-xl bg-white/[0.02]">
                        <p className="text-sm font-semibold text-white/70 mb-0.5">{f.label}</p>
                        <p className="text-[11px] text-white/25">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
