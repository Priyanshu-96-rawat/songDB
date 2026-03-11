import { getArtistDetailsAction, getArtistTopTracksAction, getArtistDiscographyAction } from '@/app/actions';
import Link from 'next/link';
import { fetchImageFromDeezer, fetchImageFromiTunes } from '@/lib/musicbrainz';
import { extractLastFmImage } from '@/lib/lastfm';
import { getGradientClass } from '@/lib/colors';
import { Play, Youtube, Users, Disc3, Tag, ChevronRight, Music, Calendar } from 'lucide-react';
import Image from 'next/image';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { ReviewSection } from '@/components/ui/ReviewSection';



function youtubeSearchUrl(track: string, artist: string) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track} ${artist} official`)}`;
}

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const artistName = decodeURIComponent(id);

    const [artist, topTracks, discography] = await Promise.all([
        getArtistDetailsAction(artistName).catch(() => null),
        getArtistTopTracksAction(artistName, 50).catch(() => []),
        getArtistDiscographyAction(artistName).catch(() => [])
    ]);

    if (!artist) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Disc3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Artist Not Found</h1>
                    <p className="text-muted-foreground">We couldn&apos;t find any artist matching &quot;{artistName}&quot;.</p>
                    <Link href="/" className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:scale-105 transition-transform">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    // Resolve artist image
    let artistImage = extractLastFmImage(artist.image, 'extralarge');
    if (!artistImage) {
        try { artistImage = await fetchImageFromDeezer(artist.name, 'artist'); } catch { }
    }

    // Enrich top tracks with images (all 50)
    const enrichedTracks = await Promise.all(
        (topTracks || []).map(async (track: { image: { "#text": string; size: string }[]; name: string }) => {
            let image = extractLastFmImage(track.image, 'large');
            if (!image) {
                try { image = await fetchImageFromiTunes(track.name, artist.name); } catch { }
            }
            return { ...track, resolvedImage: image };
        })
    );

    // Enrich discography with album art via iTunes
    const enrichedDiscography = await Promise.all(
        (discography || []).slice(0, 20).map(async (album: { title: string }) => {
            let image: string | null = null;
            try { image = await fetchImageFromiTunes(album.title, artist.name); } catch { }
            return { ...album, resolvedImage: image };
        })
    );

    // Bio — artist.bio is { summary, content } object from Last.fm
    const rawBio = typeof artist.bio === 'string' ? artist.bio : (artist.bio?.content || artist.bio?.summary || '');
    const bio = rawBio
        ? rawBio.replace(/<a\b[^>]*>.*?<\/a>/gi, '').replace(/\n\n+/g, '\n\n').trim()
        : null;

    return (
        <div className="w-full min-h-screen pb-24">
            {/* ── Hero Banner ── */}
            <section className="relative w-full h-[55vh] min-h-[420px] flex items-end overflow-hidden">
                <div className="absolute inset-0 bg-background z-[1]" />
                {artistImage && (
                    <Image
                        src={artistImage}
                        alt=""
                        fill
                        className="object-cover opacity-30 blur-2xl scale-110 z-[2]"
                    />
                )}
                {/* Animated orbs */}
                <div className="absolute top-10 right-[15%] w-60 h-60 rounded-full bg-primary/10 blur-3xl animate-orb z-[2]" />
                <div className="absolute bottom-10 left-[5%] w-80 h-80 rounded-full bg-purple-500/8 blur-3xl animate-orb-delay z-[2]" />

                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent z-[3]" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent z-[3]" />

                <div className="container relative z-10 pb-12 flex gap-8 items-end animate-fade-up">
                    {/* Avatar */}
                    <div className="hidden md:block w-48 h-48 lg:w-56 lg:h-56 rounded-full overflow-hidden shadow-2xl shadow-black/60 ring-2 ring-primary/20 shrink-0 animate-float">
                        {artistImage ? (
                            <Image src={artistImage} alt={artist.name} fill className="object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradientClass(artist.name)}`}>
                                <span className="text-5xl font-black text-white/40">{artist.name.charAt(0)}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <span className="inline-block py-1 px-3 rounded-full bg-primary/15 text-primary text-[11px] font-bold uppercase tracking-[0.15em] border border-primary/20 mb-3 animate-glow">
                            Artist
                        </span>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[0.95] mb-3">
                            {artist.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {artist.stats?.listeners && (
                                <span className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-primary" />
                                    <strong className="text-foreground">{Number(artist.stats.listeners).toLocaleString()}</strong> listeners
                                </span>
                            )}
                            {artist.stats?.playcount && (
                                <span className="flex items-center gap-1.5">
                                    <Play className="w-4 h-4 text-primary fill-current" />
                                    <strong className="text-foreground">{Number(artist.stats.playcount).toLocaleString()}</strong> plays
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                            <FavoriteButton
                                itemId={artistName}
                                itemType="artist"
                                itemName={artist.name}
                                imageUrl={artistImage || undefined}
                                size="lg"
                            />
                            <span className="text-xs text-muted-foreground">Add to favorites</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Content Grid ── */}
            <div className="container mt-10 grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* ── Main Content ── */}
                <div className="lg:col-span-2 space-y-12">

                    {/* ── About (Bio ABOVE tracks) ── */}
                    <section className="animate-fade-up">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-1 h-7 rounded-full bg-primary" />
                            <h2 className="text-xl font-bold tracking-tight">About</h2>
                        </div>
                        {bio ? (
                            <div className="glass rounded-xl p-6">
                                <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line line-clamp-[12]">
                                    {bio}
                                </p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground italic">No biography available for this artist.</p>
                        )}
                    </section>

                    {/* ── All Released Songs (Top Tracks) ── */}
                    <section className="animate-fade-up stagger-1">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-1 h-7 rounded-full bg-primary" />
                            <Music className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold tracking-tight">All Songs</h2>
                            <span className="ml-auto text-xs text-muted-foreground font-medium">{enrichedTracks.length} tracks</span>
                        </div>
                        {enrichedTracks.length > 0 ? (
                            <div className="glass rounded-xl overflow-hidden">
                                {enrichedTracks.map((track: { name: string; resolvedImage?: string | null; listeners?: string | number; playcount?: string | number }, idx: number) => (
                                    <div key={idx} className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.03] transition-colors group">
                                        <span className="w-6 text-right text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors tabular-nums">
                                            {idx + 1}
                                        </span>
                                        <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 relative">
                                            {track.resolvedImage ? (
                                                <Image src={track.resolvedImage} alt="" fill className="object-cover" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradientClass(track.name)}`}>
                                                    <span className="text-xs font-bold text-white/40">{track.name?.charAt(0)?.toUpperCase()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                href={`/song/${encodeURIComponent(track.name)}?artist=${encodeURIComponent(artist.name)}`}
                                                className="text-sm font-semibold text-foreground truncate block group-hover:text-primary transition-colors"
                                            >
                                                {track.name}
                                            </Link>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {Number(track.listeners || 0).toLocaleString()} listeners
                                                {track.playcount && ` · ${Number(track.playcount).toLocaleString()} plays`}
                                            </p>
                                        </div>
                                        <a
                                            href={youtubeSearchUrl(track.name, artist.name)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                            title="Play on YouTube"
                                        >
                                            <Youtube className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground italic">No songs found for this artist.</p>
                        )}
                    </section>

                    {/* ── Discography (Albums with images) ── */}
                    {enrichedDiscography && enrichedDiscography.length > 0 && (
                        <section className="animate-fade-up stagger-2">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-1 h-7 rounded-full bg-primary" />
                                <Disc3 className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-bold tracking-tight">Discography</h2>
                                <span className="ml-auto text-xs text-muted-foreground font-medium">{discography.length} releases</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {enrichedDiscography.map((album: { id: string; title: string; resolvedImage: string | null; date?: string }) => (
                                    <Link
                                        key={album.id}
                                        href={`/album/${album.id}`}
                                        className="group glass rounded-xl overflow-hidden card-hover"
                                    >
                                        <div className="relative aspect-square w-full bg-muted overflow-hidden">
                                            {album.resolvedImage ? (
                                                <Image src={album.resolvedImage} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${getGradientClass(album.title || '')}`}>
                                                    <span className="text-2xl font-black text-white/30">{(album.title || 'A').charAt(0).toUpperCase()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{album.title}</h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                {album.date && (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {album.date.substring(0, 4)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Reviews ── */}
                    <ReviewSection
                        songId={artistName}
                        songName={artist.name}
                        artistName={artist.name}
                        itemType="artist"
                    />

                </div>

                {/* ── Sidebar ── */}
                <div className="space-y-8">
                    {/* Tags */}
                    {artist.tags?.tag && artist.tags.tag.length > 0 && (
                        <section className="glass p-6 rounded-xl animate-fade-up stagger-1">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                <Tag className="w-4 h-4" /> Genres & Tags
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {artist.tags.tag.map((tag: { name: string }) => (
                                    <Link
                                        key={tag.name}
                                        href={`/search?q=${encodeURIComponent(tag.name)}`}
                                        className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                    >
                                        {tag.name}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Quick Actions */}
                    <section className="glass p-6 rounded-xl animate-fade-up stagger-2">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Listen on</h3>
                        <div className="space-y-2">
                            <a
                                href={youtubeSearchUrl(artist.name, 'music')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors w-full"
                            >
                                <Youtube className="w-5 h-5" />
                                <span className="text-sm font-medium">YouTube</span>
                                <ChevronRight className="w-4 h-4 ml-auto" />
                            </a>
                        </div>
                    </section>

                    {/* Similar Artists */}
                    {artist.similar?.artist && artist.similar.artist.length > 0 && (
                        <section className="glass p-6 rounded-xl animate-fade-up stagger-3">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Similar Artists</h3>
                            <div className="space-y-2">
                                {artist.similar.artist.slice(0, 5).map((sim: { name: string }) => (
                                    <Link
                                        key={sim.name}
                                        href={`/artist/${encodeURIComponent(sim.name)}`}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${getGradientClass(sim.name)}`}>
                                            <span className="text-xs font-bold text-white/60">{sim.name.charAt(0)}</span>
                                        </div>
                                        <span className="text-sm text-foreground font-medium truncate">{sim.name}</span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
