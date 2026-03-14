"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, MessageCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createReviewAction, getReviewsAction } from "@/app/actions";
import type { Review } from "@/schemas/reviewSchema";

interface ReviewSectionProps {
    songId: string;
    songName: string;
    artistName: string;
    itemType?: "song" | "artist";
}

function StarPicker({
    value,
    onChange,
    interactive = true,
}: {
    value: number;
    onChange?: (v: number) => void;
    interactive?: boolean;
}) {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    className={`transition-all duration-150 ${interactive ? "cursor-pointer hover:scale-125" : "cursor-default"}`}
                    onMouseEnter={() => interactive && setHover(star)}
                    onMouseLeave={() => interactive && setHover(0)}
                    onClick={() => onChange?.(star)}
                >
                    <Star
                        className={`w-5 h-5 transition-colors ${star <= (hover || value)
                            ? "text-amber-400 fill-amber-400"
                            : "text-white/15"
                            }`}
                    />
                </button>
            ))}
        </div>
    );
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function ReviewCard({ review, index }: { review: Review; index: number }) {

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="bg-card/50 rounded-xl p-5 border border-white/5 hover:border-white/10 transition-colors"
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-sm font-bold text-primary ring-1 ring-white/10">
                        {review.user_display_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            {review.user_display_name || "Anonymous"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            {review.created_at ? timeAgo(review.created_at) : ""}
                        </p>
                    </div>
                </div>
                <StarPicker value={review.rating} interactive={false} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
                {review.review_text}
            </p>
        </motion.div>
    );
}

export function ReviewSection({
    songId,
    songName,
    artistName,
    itemType = "song",
}: ReviewSectionProps) {
    const { user, loading: authLoading } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Form state
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Load reviews
    useEffect(() => {
        let cancelled = false;
        getReviewsAction(songId)
            .then((data) => {
                if (!cancelled) setReviews(data);
            })
            .catch(() => {
                if (!cancelled) setReviews([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingReviews(false);
            });
        return () => {
            cancelled = true;
        };
    }, [songId]);

    const handleSubmit = () => {
        if (rating === 0) {
            setError("Please select a rating.");
            return;
        }
        if (reviewText.trim().length < 5) {
            setError("Review must be at least 5 characters.");
            return;
        }
        if (reviewText.length > 500) {
            setError("Review cannot exceed 500 characters.");
            return;
        }
        setError("");
        setSuccess(false);

        startTransition(async () => {
            try {
                const idToken = await user!.getIdToken();
                const result = await createReviewAction(
                    {
                        song_id: songId,
                        song_name: songName,
                        artist_name: artistName,
                        item_type: itemType,
                        rating,
                        review_text: reviewText.trim(),
                    },
                    idToken
                );
                // Add new review to the top
                setReviews((prev) => [result, ...prev]);
                setRating(0);
                setReviewText("");
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to submit review.");
            }
        });
    };

    const avgRating =
        reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

    return (
        <section className="mt-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-7 rounded-full bg-primary" />
                <MessageCircle className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Reviews</h2>
                {reviews.length > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                        <StarPicker
                            value={Math.round(avgRating)}
                            interactive={false}
                        />
                        <span className="text-sm font-bold text-foreground">
                            {avgRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            ({reviews.length})
                        </span>
                    </div>
                )}
            </div>

            {/* ── Write a Review (auth only) ── */}
            {!authLoading && user ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card/50 rounded-xl p-5 border border-white/5 mb-6"
                >
                    <p className="text-sm font-semibold mb-3 text-foreground">
                        Leave a review
                    </p>

                    <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1.5">Your rating</p>
                        <StarPicker value={rating} onChange={setRating} />
                    </div>

                    <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder={itemType === "artist" ? "What do you think of this artist?" : "What did you think of this track?"}
                        maxLength={500}
                        rows={3}
                        className="w-full bg-background/60 border border-white/10 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                    />

                    <div className="flex items-center justify-between mt-3">
                        <span className="text-[11px] text-muted-foreground">
                            {reviewText.length}/500
                        </span>
                        <button
                            onClick={handleSubmit}
                            disabled={isPending || rating === 0}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-semibold text-sm hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Submit
                        </button>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-xs text-red-400 mt-2"
                            >
                                {error}
                            </motion.p>
                        )}
                        {success && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-xs text-emerald-400 mt-2"
                            >
                                ✓ Review submitted!
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>
            ) : !authLoading ? (
                <div className="bg-card/30 rounded-xl p-5 border border-white/5 mb-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        <a
                            href="/auth/login"
                            className="text-primary font-semibold hover:underline"
                        >
                            Log in
                        </a>{" "}
                        to leave a review.
                    </p>
                </div>
            ) : null}

            {/* ── Reviews List ── */}
            {loadingReviews ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-card/30 rounded-xl p-5 border border-white/5 animate-pulse"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-full bg-muted/50" />
                                <div className="space-y-1.5">
                                    <div className="w-24 h-3 bg-muted/50 rounded" />
                                    <div className="w-16 h-2 bg-muted/30 rounded" />
                                </div>
                            </div>
                            <div className="w-full h-3 bg-muted/30 rounded mb-2" />
                            <div className="w-3/4 h-3 bg-muted/20 rounded" />
                        </div>
                    ))}
                </div>
            ) : reviews.length > 0 ? (
                <div className="space-y-4">
                    {reviews.map((review, i) => (
                        <ReviewCard key={review.id} review={review} index={i} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10">
                    <MessageCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                        No reviews yet. Be the first!
                    </p>
                </div>
            )}
        </section>
    );
}
