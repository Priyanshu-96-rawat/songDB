import { searchArtistMBAction, getTrendingSongsAction } from '@/app/actions';
import { fetchArtistTopTracks, fetchArtistInfo, extractLastFmImage } from '@/lib/lastfm';
import { batchResolveTrackImages, batchResolveArtistImages, resolveArtistImage } from '@/lib/imageResolver';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { SongCard } from '@/components/ui/SongCard';
import { DiscographySearch } from '@/components/ui/DiscographySearch';
import { Search, TrendingUp, Users, Music2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q: query = '' } = await searchParams;

    const [artists, topSongsFallback] = await Promise.all([
        query ? searchArtistMBAction(query) : Promise.resolve(null),
        !query ? getTrendingSongsAction(10) : Promise.resolve(null)
    ]);

    // Enrich artist results with batch resolver
    let enrichedArtists: any[] | null = null;
    if (artists && (artists as any[]).length > 0) {
        const sliced = (artists as any[]).slice(0, 12);
        const prepared = sliced.map((a: any) => ({ name: a.name, image: undefined }));
        const images = await batchResolveArtistImages(prepared, 6);
        enrichedArtists = sliced.map((a: any, i: number) => ({ ...a, image: images[i] }));
    }

    // Enrich trending songs with batch resolver
    let enrichedSongs: any[] | null = null;
    if (topSongsFallback && (topSongsFallback as any[]).length > 0) {
        const songList = (topSongsFallback as any[]).slice(0, 10);
        const prepared = songList.map((s: any) => ({ name: s.name, artist: s.artist?.name || 'Unknown', image: s.image }));
        const images = await batchResolveTrackImages(prepared, 6);
        enrichedSongs = songList.map((song: any, i: number) => ({
            id: encodeURIComponent(song.name), title: song.name,
            artist: song.artist?.name || 'Unknown', coverArt: images[i],
            playCount: parseInt(song.playcount) || 0, listeners: parseInt(song.listeners) || 0, rank: i + 1,
        }));
    }

    // Artist discography
    let discographyTracks: any[] = [];
    let artistInfo: any = null;
    let artistImage: string | null = null;
    const topArtistName = enrichedArtists?.[0]?.name ?? null;

    if (query && enrichedArtists && enrichedArtists.length > 0) {
        const topArtist = enrichedArtists[0];
        const [rawTracks, info] = await Promise.all([
            fetchArtistTopTracks(topArtist.name, 50),
            fetchArtistInfo(topArtist.name),
        ]);
        artistInfo = info;
        artistImage = topArtist.image || extractLastFmImage(info?.image, 'extralarge');
        if (!artistImage) {
            artistImage = await resolveArtistImage(topArtist.name);
        }

        // Batch resolve discography images
        const discPrepared = rawTracks.map((t: any) => ({ name: t.name, artist: topArtist.name, image: t.image }));
        const discImages = await batchResolveTrackImages(discPrepared, 10);

        // Get years from iTunes in a batch (limited concurrency)
        const years: (string | null)[] = new Array(rawTracks.length).fill(null);
        let yearIdx = 0;
        async function yearWorker() {
            while (yearIdx < rawTracks.length) {
                const i = yearIdx++;
                try {
                    const itRes = await fetch(
                        `https://itunes.apple.com/search?term=${encodeURIComponent(`${rawTracks[i].name} ${topArtist.name}`)}&entity=song&limit=1`,
                        { next: { revalidate: 86400 } }
                    );
                    const itData = await itRes.json();
                    if (itData.results?.[0]?.releaseDate) {
                        years[i] = new Date(itData.results[0].releaseDate).getFullYear().toString();
                    }
                } catch { }
            }
        }
        await Promise.all(Array.from({ length: Math.min(8, rawTracks.length) }, () => yearWorker()));

        discographyTracks = rawTracks.map((track: any, i: number) => ({
            id: encodeURIComponent(track.name),
            title: track.name,
            artist: topArtist.name,
            coverArt: discImages[i],
            listeners: parseInt(track.listeners) || 0,
            year: years[i],
            rank: i + 1,
        }));
    }

    // Short bio
    const bio = artistInfo?.bio?.summary
        ?.replace(/<[^>]+>/g, '')
        ?.split('\n')[0]
        ?.trim()
        ?.slice(0, 300);

    return (
        <div className="w-full min-h-screen pb-24 pt-24 px-4 md:px-8 max-w-7xl mx-auto relative">
            {/* Ambient gradient background */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {query && (
                    <>
                        <div className="absolute top-[10%] right-[5%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
                    </>
                )}
            </div>

            <div className="relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {query ? (
                            <>Results for <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">&quot;{query}&quot;</span></>
                        ) : 'Discover Music'}
                    </h1>
                    <p className="text-muted-foreground">
                        {query ? 'Click an artist to see their full profile.' : 'Search for any artist to explore their music.'}
                    </p>
                </div>

                {/* Artist Results */}
                {query && enrichedArtists && enrichedArtists.length > 0 && (
                    <section className="mb-12 animate-fade-up">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500" />
                            <Users className="w-5 h-5 text-cyan-400" />
                            <h2 className="text-xl font-bold tracking-tight">Artists</h2>
                            <span className="text-xs text-muted-foreground ml-2">{enrichedArtists.length} found</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {enrichedArtists.map((artist: any) => (
                                <ArtistCard key={artist.id} id={artist.name} name={artist.name} image={artist.image} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Artist Profile + Discography */}
                {query && topArtistName && discographyTracks.length > 0 && (
                    <section className="mb-12 animate-fade-up">
                        <div className="rounded-2xl p-6 mb-8 flex gap-6 items-center border border-white/5 bg-gradient-to-r from-purple-500/10 via-card to-blue-500/10">
                            <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-purple-400/30 shrink-0 bg-card">
                                {artistImage ? (
                                    <img src={artistImage} alt={topArtistName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-3xl font-black text-purple-400">
                                        {topArtistName[0]}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Top Match</p>
                                <h2 className="text-2xl font-black text-white truncate">{topArtistName}</h2>
                                {artistInfo?.stats && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        <span className="text-purple-400 font-semibold">{parseInt(artistInfo.stats.listeners).toLocaleString()}</span> listeners
                                        {' · '}
                                        <span className="text-blue-400 font-semibold">{parseInt(artistInfo.stats.playcount).toLocaleString()}</span> plays
                                    </p>
                                )}
                                {bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{bio}</p>}
                            </div>
                            <Link
                                href={`/artist/${encodeURIComponent(topArtistName)}`}
                                className="shrink-0 flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold transition-colors border border-purple-500/20"
                            >
                                Full Profile <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-pink-400 to-rose-600" />
                            <Music2 className="w-5 h-5 text-pink-400" />
                            <h2 className="text-xl font-bold tracking-tight">All Songs by {topArtistName}</h2>
                            <span className="text-xs text-muted-foreground ml-2">{discographyTracks.length} tracks</span>
                        </div>

                        <DiscographySearch tracks={discographyTracks} artistName={topArtistName} />
                    </section>
                )}

                {/* No Results */}
                {query && (!enrichedArtists || enrichedArtists.length === 0) && (
                    <div className="py-20 text-center flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-card via-card to-purple-500/5 border border-white/5">
                        <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No results for &quot;{query}&quot;</h3>
                        <p className="text-muted-foreground">Try adjusting your search terms.</p>
                    </div>
                )}

                {/* Trending Fallback */}
                {!query && enrichedSongs && (
                    <section>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-rose-400 to-amber-500" />
                            <TrendingUp className="w-5 h-5 text-rose-400" />
                            <h2 className="text-xl font-bold tracking-tight">Trending Right Now</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {enrichedSongs.map((song) => (
                                <SongCard key={song.id + song.rank} id={song.id} title={song.title} artist={song.artist} coverArt={song.coverArt} playCount={song.playCount} listeners={song.listeners} rank={song.rank} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
