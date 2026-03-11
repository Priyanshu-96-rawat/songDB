"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { getRatingBreakdownAction } from "@/app/actions";

interface RatingBreakdownProps {
    songId: string;
}

export function RatingBreakdown({ songId }: RatingBreakdownProps) {
    const [data, setData] = useState<{ distribution: number[]; total: number; average: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getRatingBreakdownAction(songId)
            .then((result) => {
                if (!cancelled) setData(result);
            })
            .catch(() => {
                if (!cancelled) setData(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [songId]);

    if (loading) {
        return (
            <div className="bg-card/50 rounded-xl p-5 border border-white/5 animate-pulse">
                <div className="w-32 h-4 bg-muted/50 rounded mb-4" />
                <div className="space-y-2.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-6 h-3 bg-muted/30 rounded" />
                            <div className="flex-1 h-3 bg-muted/20 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data || data.total === 0) return null;

    const max = Math.max(...data.distribution, 1);

    return (
        <div className="bg-card/50 rounded-xl p-5 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="text-2xl font-black text-foreground">{data.average.toFixed(1)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{data.total}</span> {data.total === 1 ? "rating" : "ratings"}
                </div>
            </div>

            <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                    const count = data.distribution[star - 1];
                    const pct = data.total > 0 ? (count / data.total) * 100 : 0;
                    const barWidth = (count / max) * 100;
                    return (
                        <div key={star} className="flex items-center gap-2 group">
                            <span className="text-xs text-muted-foreground w-3 text-right font-mono">{star}</span>
                            <Star className="w-3 h-3 text-amber-400/60" />
                            <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-amber-400"
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                                {pct > 0 ? `${Math.round(pct)}%` : "—"}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
