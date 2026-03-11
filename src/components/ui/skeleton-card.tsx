"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
    className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
                "flex flex-col gap-3 rounded-xl bg-white/5 p-3 overflow-hidden",
                className
            )}
        >
            {/* Image Skeleton */}
            <div className="relative aspect-square w-full rounded-md overflow-hidden bg-white/10 shrink-0">
                <motion.div
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ translateX: ["-100%", "200%"] }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "linear",
                    }}
                />
            </div>

            {/* Text Skeletons */}
            <div className="flex flex-col gap-2">
                <div className="h-4 w-3/4 rounded-full bg-white/10 overflow-hidden relative">
                    <motion.div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{ translateX: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                </div>
                <div className="h-3 w-1/2 rounded-full bg-white/5 overflow-hidden relative">
                    <motion.div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{ translateX: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                </div>
            </div>
        </motion.div>
    );
}
