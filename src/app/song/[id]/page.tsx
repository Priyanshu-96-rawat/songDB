import { getSongInfoAction } from '@/app/actions';
import Image from 'next/image';
import Link from 'next/link';
import { fetchImageFromiTunes } from '@/lib/musicbrainz';
import { extractLastFmImage } from '@/lib/lastfm';
import { getGradientClass } from '@/lib/colors';
import { Play, Youtube, Disc3, Tag, Sparkles, User } from 'lucide-react';
import { ReviewSection } from '@/components/ui/ReviewSection';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { RatingBreakdown } from '@/components/ui/RatingBreakdown';

function youtubeSearchUrl(track: string, artist: string) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track} ${artist} official`)}`;
}

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const decoded = decodeURIComponent(id);
    const parts = decoded.split('-');
    const artistName = parts[0] || '';
    const trackName = parts.slice(1).join('-') || decoded;

    const song = await getSongInfoAction(artistName, trackName);

    if (!song) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Disc3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Song Not Found</h1>
                    <p className="text-muted-foreground">We couldn't find this track.</p>
                    <Link href="/" className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:scale-105 transition-transform">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    // Safely extract artist name (Last.fm returns {name, url} or a string)
    const songArtist = typeof song.artist === 'object' ? song.artist?.name || '' : String(song.artist || '');
    const songAlbum = typeof song.album === 'object' ? (song.album as any)?.title || (song.album as any)?.name || '' : String(song.album || '');

    // Resolve image
    let songImage = extractLastFmImage(song.image, 'extralarge');
    if (!songImage) {
        try { songImage = await fetchImageFromiTunes(song.name, songArtist); } catch { }
    }

    return (
        <div className="w-full min-h-screen pb-24">
            {/* ── Hero ── */}
            <section className="relative w-full h-[55vh] min-h-[420px] flex items-end overflow-hidden">
                <div className="absolute inset-0 bg-background z-[1]" />
                {songImage && (
                    <img
                        src={songImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110 z-[2]"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent z-[3]" />

                <div className="container relative z-10 pb-12 flex gap-8 items-end">
                    {/* Cover Art */}
                    <div className="hidden md:block w-56 h-56 lg:w-64 lg:h-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 shrink-0">
                        {songImage ? (
                            <img src={songImage} alt={song.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradientClass(song.name)}`}>
                                <span className="text-5xl font-black text-white/30">{song.name.charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <span className="inline-block py-1 px-3 rounded-full bg-primary/15 text-primary text-[11px] font-bold uppercase tracking-[0.15em] border border-primary/20 mb-3">
                            Song
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tight leading-[0.95] mb-3">
                            {song.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                            <Link
                                href={`/artist/${encodeURIComponent(songArtist)}`}
                                className="text-lg font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                            >
                                <User className="w-4 h-4" /> {songArtist}
                            </Link>
                            {songAlbum && (
                                <>
                                    <span className="text-white/20">•</span>
                                    <span className="text-sm">{songAlbum}</span>
                                </>
                            )}
                        </div>
                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                            <a
                                href={youtubeSearchUrl(song.name, songArtist)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 bg-red-600 text-white px-6 py-3 rounded-full font-bold text-sm hover:scale-105 hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
                            >
                                <Youtube className="w-5 h-5" /> Watch on YouTube
                            </a>
                            <Link
                                href={`/artist/${encodeURIComponent(songArtist)}`}
                                className="flex items-center gap-2 bg-white/8 text-white/80 hover:bg-white/15 px-6 py-3 rounded-full font-medium text-sm transition-all backdrop-blur-md border border-white/8 hover:border-white/15"
                            >
                                View Artist
                            </Link>
                            <FavoriteButton
                                itemId={id}
                                itemType="song"
                                itemName={song.name}
                                artistName={songArtist}
                                imageUrl={songImage || undefined}
                                size="lg"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Content ── */}
            <div className="container mt-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    {/* AI Summary */}
                    <section className="bg-card/50 p-6 rounded-xl border border-white/5">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" /> AI Song Insights
                        </h2>
                        {song.summary ? (
                            <p className="text-muted-foreground leading-relaxed">{song.summary}</p>
                        ) : (
                            <p className="text-muted-foreground italic">AI summary not available for this track.</p>
                        )}
                    </section>

                    {/* ── Reviews ── */}
                    <ReviewSection
                        songId={id}
                        songName={song.name}
                        artistName={songArtist}
                    />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Rating Breakdown */}
                    <RatingBreakdown songId={id} />
                    {/* Tags */}
                    {song.toptags?.tag && song.toptags.tag.length > 0 && (
                        <section className="bg-card/50 p-6 rounded-xl border border-white/5">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                <Tag className="w-4 h-4" /> Genre & Tags
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {song.toptags.tag.map((tag: any) => (
                                    <span key={tag.name} className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Stats */}
                    <section className="bg-card/50 p-6 rounded-xl border border-white/5">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Stats</h3>
                        <div className="space-y-3">
                            {song.listeners && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Listeners</span>
                                    <span className="font-bold text-foreground">{Number(song.listeners).toLocaleString()}</span>
                                </div>
                            )}
                            {song.playcount && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Play Count</span>
                                    <span className="font-bold text-primary">{Number(song.playcount).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
