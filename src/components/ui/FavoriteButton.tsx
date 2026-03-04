"use client";

import { useState, useEffect, useTransition } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { addFavoriteAction, removeFavoriteAction, checkFavoriteAction } from "@/app/actions";

interface FavoriteButtonProps {
    itemId: string;
    itemType: "song" | "artist";
    itemName: string;
    artistName?: string;
    imageUrl?: string;
    size?: "sm" | "md" | "lg";
}

export function FavoriteButton({
    itemId,
    itemType,
    itemName,
    artistName,
    imageUrl,
    size = "md",
}: FavoriteButtonProps) {
    const { user, loading: authLoading } = useAuth();
    const [isFavorited, setIsFavorited] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [checked, setChecked] = useState(false);

    // Check if already favorited
    useEffect(() => {
        if (!user || authLoading) return;
        let cancelled = false;
        user.getIdToken().then((token) => {
            checkFavoriteAction(itemId, itemType, token)
                .then((result) => {
                    if (!cancelled) {
                        setIsFavorited(result);
                        setChecked(true);
                    }
                })
                .catch(() => {
                    if (!cancelled) setChecked(true);
                });
        });
        return () => { cancelled = true; };
    }, [user, authLoading, itemId, itemType]);

    const handleToggle = () => {
        if (!user || isPending) return;
        const newState = !isFavorited;
        setIsFavorited(newState); // optimistic

        startTransition(async () => {
            try {
                const token = await user.getIdToken();
                if (newState) {
                    await addFavoriteAction(
                        { item_id: itemId, item_type: itemType, item_name: itemName, artist_name: artistName, image_url: imageUrl },
                        token
                    );
                } else {
                    await removeFavoriteAction(itemId, itemType, token);
                }
            } catch {
                setIsFavorited(!newState); // rollback
            }
        });
    };

    if (authLoading || !user) return null;

    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-12 h-12",
    };

    const iconSizes = {
        sm: "w-4 h-4",
        md: "w-5 h-5",
        lg: "w-6 h-6",
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending || !checked}
            title={isFavorited ? "Remove from favorites" : "Add to favorites"}
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-200
                ${isFavorited
                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 ring-1 ring-red-500/30"
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/10"
                }
                ${isPending ? "opacity-50" : "hover:scale-110"}
                disabled:cursor-not-allowed`}
        >
            {isPending ? (
                <Loader2 className={`${iconSizes[size]} animate-spin`} />
            ) : (
                <Heart className={`${iconSizes[size]} transition-all ${isFavorited ? "fill-red-500" : ""}`} />
            )}
        </button>
    );
}
