"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserReviewsAction, getUserFavoritesAction } from "@/app/actions";
import type { Review } from "@/schemas/reviewSchema";
import type { Favorite } from "@/schemas/favoriteSchema";
import { Star, Heart, MessageCircle, Music, User, BarChart3, Loader2 } from "lucide-react";
import Link from "next/link";
import { getGradientClass } from "@/lib/colors";
import { redirect } from "next/navigation";

type Tab = "reviews" | "favorites" | "stats";

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>("reviews");
    const [reviews, setReviews] = useState<Review[]>([]);
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            redirect("/auth/login");
            return;
        }

        let cancelled = false;
        setLoadingData(true);

        user.getIdToken().then(async (token) => {
            try {
                const [revs, favs] = await Promise.all([
                    getUserReviewsAction(token),
                    getUserFavoritesAction(token),
                ]);
                if (!cancelled) {
                    setReviews(revs);
                    setFavorites(favs);
                }
            } catch {
                // silently handle
            } finally {
                if (!cancelled) setLoadingData(false);
            }
        });

        return () => { cancelled = true; };
    }, [user, authLoading]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const songFavs = favorites.filter((f) => f.item_type === "song");
    const artistFavs = favorites.filter((f) => f.item_type === "artist");

    const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
        { key: "reviews", label: "My Reviews", icon: <MessageCircle className="w-4 h-4" />, count: reviews.length },
        { key: "favorites", label: "Favorites", icon: <Heart className="w-4 h-4" />, count: favorites.length },
        { key: "stats", label: "Stats", icon: <BarChart3 className="w-4 h-4" />, count: 0 },
    ];

    return (
        <div className="w-full min-h-screen pb-24 pt-24 px-4 md:px-8 max-w-5xl mx-auto">
            {/* ── Profile Header ── */}
            <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-3xl font-black text-primary ring-2 ring-white/10 shrink-0">
                    {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">{user.displayName || "Music Fan"}</h1>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span><strong className="text-foreground">{reviews.length}</strong> reviews</span>
                        <span><strong className="text-foreground">{favorites.length}</strong> favorites</span>
                        {avgRating > 0 && (
                            <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <strong className="text-foreground">{avgRating.toFixed(1)}</strong> avg
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 mb-6 bg-card/30 rounded-xl p-1 border border-white/5 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                ? "bg-primary/15 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            {loadingData ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-card/30 rounded-xl p-5 border border-white/5 animate-pulse">
                            <div className="w-40 h-4 bg-muted/50 rounded mb-3" />
                            <div className="w-full h-3 bg-muted/20 rounded" />
                        </div>
                    ))}
                </div>
            ) : activeTab === "reviews" ? (
                reviews.length > 0 ? (
                    <div className="space-y-3">
                        {reviews.map((review) => (
                            <Link
                                key={review.id}
                                href={`/song/${encodeURIComponent(`${review.artist_name} - ${review.song_name}`)}`}
                                className="block bg-card/50 rounded-xl p-5 border border-white/5 hover:border-white/10 transition-colors group"
                            >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div>
                                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                            {review.song_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{review.artist_name}</p>
                                    </div>
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "text-amber-400 fill-amber-400" : "text-white/10"}`} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{review.review_text}</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-2">
                                    {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <MessageCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground">No reviews yet. Rate a song to get started!</p>
                    </div>
                )
            ) : activeTab === "favorites" ? (
                favorites.length > 0 ? (
                    <div>
                        {songFavs.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                                    <Music className="w-4 h-4 text-primary" /> Songs ({songFavs.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {songFavs.map((fav) => (
                                        <Link
                                            key={fav.id}
                                            href={`/song/${encodeURIComponent(`${fav.artist_name} - ${fav.item_name}`)}`}
                                            className="flex items-center gap-3 bg-card/50 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors group"
                                        >
                                            <div className={`w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-gradient-to-br ${getGradientClass(fav.item_name)} flex items-center justify-center`}>
                                                {fav.image_url ? (
                                                    <img src={fav.image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Music className="w-4 h-4 text-white/40" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{fav.item_name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{fav.artist_name}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                        {artistFavs.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                                    <User className="w-4 h-4 text-primary" /> Artists ({artistFavs.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {artistFavs.map((fav) => (
                                        <Link
                                            key={fav.id}
                                            href={`/artist/${encodeURIComponent(fav.item_name)}`}
                                            className="flex items-center gap-3 bg-card/50 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors group"
                                        >
                                            <div className={`w-10 h-10 rounded-full shrink-0 overflow-hidden bg-gradient-to-br ${getGradientClass(fav.item_name)} flex items-center justify-center`}>
                                                {fav.image_url ? (
                                                    <img src={fav.image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-sm font-bold text-white/40">{fav.item_name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{fav.item_name}</p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Heart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground">No favorites yet. Heart a song or artist to save it!</p>
                    </div>
                )
            ) : (
                /* Stats Tab */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-card/50 rounded-xl p-6 border border-white/5 text-center">
                        <MessageCircle className="w-8 h-8 text-primary/60 mx-auto mb-2" />
                        <p className="text-3xl font-black text-foreground">{reviews.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total Reviews</p>
                    </div>
                    <div className="bg-card/50 rounded-xl p-6 border border-white/5 text-center">
                        <Star className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
                        <p className="text-3xl font-black text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
                        <p className="text-xs text-muted-foreground mt-1">Average Rating Given</p>
                    </div>
                    <div className="bg-card/50 rounded-xl p-6 border border-white/5 text-center">
                        <Heart className="w-8 h-8 text-red-400/60 mx-auto mb-2" />
                        <p className="text-3xl font-black text-foreground">{favorites.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Favorites Saved</p>
                    </div>
                    {reviews.length > 0 && (
                        <>
                            <div className="bg-card/50 rounded-xl p-6 border border-white/5 text-center">
                                <p className="text-3xl font-black text-foreground">{songFavs.length}</p>
                                <p className="text-xs text-muted-foreground mt-1">Favorite Songs</p>
                            </div>
                            <div className="bg-card/50 rounded-xl p-6 border border-white/5 text-center">
                                <p className="text-3xl font-black text-foreground">{artistFavs.length}</p>
                                <p className="text-xs text-muted-foreground mt-1">Favorite Artists</p>
                            </div>
                            <div className="bg-card/50 rounded-xl p-6 border border-white/5 text-center">
                                <p className="text-3xl font-black text-foreground">
                                    {[...new Set(reviews.map((r) => r.artist_name))].length}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Artists Reviewed</p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
