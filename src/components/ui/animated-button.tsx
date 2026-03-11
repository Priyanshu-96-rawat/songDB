"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "ghost" | "icon";
    size?: "default" | "sm" | "lg" | "icon";
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
    ({ className, variant = "primary", size = "default", children, ...props }, ref) => {

        const variants = {
            primary: "bg-primary text-black hover:bg-primary/90 font-medium shadow-[0_0_15px_rgba(29,185,84,0.3)]",
            secondary: "bg-white/10 text-white hover:bg-white/20",
            ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/10",
            icon: "bg-transparent text-white/70 hover:text-white hover:bg-white/10 rounded-full",
        };

        const sizes = {
            default: "h-10 px-4 py-2 rounded-full",
            sm: "h-8 px-3 text-sm rounded-full",
            lg: "h-12 px-8 text-lg rounded-full",
            icon: "h-10 w-10 flex items-center justify-center p-0",
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap outline-none ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {children}
            </motion.button>
        );
    }
);

AnimatedButton.displayName = "AnimatedButton";
