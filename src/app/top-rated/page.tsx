import { getTopRatedSongsAction } from "@/app/actions";
import { Trophy, Star, ArrowLeft, Music } from "lucide-react";
import { getGradientClass } from "@/lib/colors";
import Link from "next/link";

export const revalidate = 3600; // 1 hour

export default async function TopRatedPage() {
    const songs = await getTopRatedSongsAction().catch(() => []);

    return (
        <div className="w-full min-h-screen pb-24 pt-24 px-4 md:px-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 rounded-full hover:bg-white/5 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-amber-400" />
                        <h1 className="text-3xl font-bold text-white">Top Rated</h1>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">Songs ranked by community ratings</p>
                </div>
            </div>

            {songs.length > 0 ? (
                <div className="bg-card/50 rounded-xl border border-white/5 overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-[40px_1fr_80px_60px] gap-3 px-4 py-3 border-b border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span className="text-right">#</span>
                        <span>Song</span>
                        <span>Rating</span>
                        <span className="text-right">Votes</span>
                    </div>

                    {songs.map((song, idx) => (
                        <Link
                            key={song.song_id}
                            href={`/song/${encodeURIComponent(song.song_id)}`}
                            className="grid grid-cols-[40px_1fr_80px_60px] gap-3 px-4 py-3.5 items-center border-b border-white/[0.03] last:border-0 hover:bg-white/[0.03] transition-colors group"
                        >
                            <span className={`text-right text-sm font-bold tabular-nums ${idx < 3 ? "text-amber-400" : "text-muted-foreground"
                                }`}>
                                {idx + 1}
                            </span>

                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-gradient-to-br ${getGradientClass(song.song_name)} flex items-center justify-center`}>
                                    <Music className="w-4 h-4 text-white/40" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                        {song.song_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{song.artist_name}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="text-sm font-bold text-foreground tabular-nums">{song.average.toFixed(1)}</span>
                            </div>

                            <span className="text-right text-xs text-muted-foreground tabular-nums">
                                {song.count}
                            </span>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center glass rounded-2xl">
                    <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Ratings Yet</h3>
                    <p className="text-muted-foreground">Be the first to rate a song and it will appear here!</p>
                </div>
            )}
        </div>
    );
}
