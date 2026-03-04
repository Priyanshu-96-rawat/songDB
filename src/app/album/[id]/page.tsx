import { getAlbumTracklistAction } from '@/app/actions';
import Image from 'next/image';
import Link from 'next/link';
import { getGradientClass } from '@/lib/colors';
import { Disc3, Clock, Youtube, Music } from 'lucide-react';

function youtubeSearchUrl(track: string, artist: string) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track} ${artist} official`)}`;
}

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const album = await getAlbumTracklistAction(id);

    if (!album) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Disc3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Album Not Found</h1>
                    <p className="text-muted-foreground">We couldn't find this album.</p>
                    <Link href="/" className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:scale-105 transition-transform">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    const totalDuration = album.tracks?.reduce((acc: number, track: any) =>
        acc + (parseInt(track.duration || "0", 10)), 0
    ) || 0;

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className="w-full min-h-screen pb-24">
            {/* ── Hero ── */}
            <section className="relative w-full h-[45vh] min-h-[360px] flex items-end overflow-hidden">
                <div className="absolute inset-0 bg-background z-[1]" />
                {album.image && (
                    <img
                        src={album.image}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110 z-[2]"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent z-[3]" />

                <div className="container relative z-10 pb-12 flex gap-8 items-end">
                    <div className="hidden md:block w-48 h-48 lg:w-56 lg:h-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 shrink-0">
                        {album.image ? (
                            <img src={album.image} alt={album.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradientClass(album.name)}`}>
                                <Disc3 className="w-16 h-16 text-white/30" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <span className="inline-block py-1 px-3 rounded-full bg-primary/15 text-primary text-[11px] font-bold uppercase tracking-[0.15em] border border-primary/20 mb-3">
                            Album
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[0.95] mb-3">
                            {album.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <Link
                                href={`/artist/${encodeURIComponent(album.artist)}`}
                                className="font-bold text-foreground hover:text-primary transition-colors"
                            >
                                {album.artist}
                            </Link>
                            {album.year && (
                                <>
                                    <span className="text-white/20">•</span>
                                    <span>{album.year}</span>
                                </>
                            )}
                            {album.tracks && (
                                <>
                                    <span className="text-white/20">•</span>
                                    <span>{album.tracks.length} tracks</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Tracklist ── */}
            <div className="container mt-8 max-w-4xl">
                <div className="bg-card/50 rounded-xl border border-white/5 overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-[32px_1fr_40px_40px] gap-3 px-4 py-3 border-b border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span className="text-right">#</span>
                        <span>Title</span>
                        <span><Clock className="w-3.5 h-3.5" /></span>
                        <span></span>
                    </div>

                    {album.tracks && album.tracks.length > 0 ? (
                        <div className="flex flex-col">
                            {album.tracks.map((track: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-[32px_1fr_40px_40px] gap-3 px-4 py-3 items-center border-b border-white/[0.03] last:border-0 hover:bg-white/[0.03] transition-colors group">
                                    <span className="text-right text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors tabular-nums">
                                        {idx + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <span className="text-sm font-semibold text-foreground truncate block group-hover:text-primary transition-colors">
                                            {track.name}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {track.duration ? formatTime(parseInt(track.duration, 10)) : '--:--'}
                                    </span>
                                    <a
                                        href={youtubeSearchUrl(track.name, album.artist)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-full text-muted-foreground hover:text-red-500 transition-colors"
                                        title="Play on YouTube"
                                    >
                                        <Youtube className="w-4 h-4" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            No tracklist available for this album.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
