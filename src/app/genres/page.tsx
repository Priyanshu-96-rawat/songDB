import { getTopTagsAction } from '@/app/actions';
import { Tag, ArrowRight } from 'lucide-react';
import Link from 'next/link';

/** Tag shape from getTopTagsAction (Last.fm chart.gettoptags) */
type GenreTag = { name: string };

export const revalidate = 43200; // Refresh every 12 hours

const GENRE_COLORS = [
    'from-primary/30 to-secondary/10',
    'from-indigo-500/30 to-purple-500/10',
    'from-rose-500/30 to-pink-500/10',
    'from-violet-500/30 to-fuchsia-500/10',
    'from-blue-500/30 to-cyan-500/10',
    'from-fuchsia-500/30 to-primary/10',
    'from-purple-500/30 to-indigo-500/10',
    'from-pink-500/30 to-rose-500/10',
];

export default async function GenresPage() {
    const rawTags = await getTopTagsAction(60).catch(() => []);
    const tags = (rawTags ?? []) as GenreTag[];

    return (
        <div className="w-full min-h-screen pb-24 pt-24 px-4 md:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-12 animate-fade-up">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-8 rounded-full bg-primary" />
                    <Tag className="w-6 h-6 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Music Discovery</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
                    Explore Genres
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl">
                    Dive into our comprehensive collection of music genres and discover new sounds from around the world.
                </p>
            </div>

            {tags && tags.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {tags.map((tag: GenreTag, i: number) => {
                        const colorClass = GENRE_COLORS[i % GENRE_COLORS.length];
                        return (
                            <Link
                                key={tag.name}
                                href={`/genres/${encodeURIComponent(tag.name)}`}
                                className="group relative h-28 rounded-2xl overflow-hidden border border-white/5 hover:border-primary/40 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(108,99,255,0.2)] animate-fade-up"
                                style={{ animationDelay: `${(i % 12) * 0.04}s` }}
                            >
                                {/* Gradient bg */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} />
                                <div className="absolute inset-0 bg-card/80" />

                                {/* Decorative circle */}
                                <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/5 group-hover:scale-150 transition-transform duration-500" />

                                <div className="relative z-10 h-full flex flex-col items-start justify-between p-4">
                                    <h3 className="text-sm font-bold text-white/90 group-hover:text-white transition-colors capitalize line-clamp-2 leading-tight">
                                        {tag.name}
                                    </h3>
                                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary/70 group-hover:text-primary transition-colors">
                                        Explore <ArrowRight className="w-3 h-3 ml-0.5 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="py-20 text-center glass rounded-3xl mx-auto max-w-2xl">
                    <Tag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Genres Found</h3>
                    <p className="text-muted-foreground">Check back later for genre exploration.</p>
                </div>
            )}
        </div>
    );
}
