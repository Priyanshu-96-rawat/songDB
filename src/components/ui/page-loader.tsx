"use client";

import { motion } from "framer-motion";

export function PageLoader() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
            <motion.div
                className="relative flex items-center justify-center w-16 h-16"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
            >
                {/* Outer Ring */}
                <motion.div
                    className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary/30"
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
                {/* Inner Ring */}
                <motion.div
                    className="absolute inset-2 rounded-full border-b-2 border-l-2 border-primary"
                    animate={{ rotate: -360 }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            </motion.div>
        </div>
    );
}
