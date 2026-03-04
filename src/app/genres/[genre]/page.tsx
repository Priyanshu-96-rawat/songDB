import { batchResolveTrackImages } from '@/lib/imageResolver';
import { type LastFmImageEntry } from '@/lib/lastfm';
import { SongCard } from '@/components/ui/SongCard';
import { Tag, ArrowLeft, Music, AlertCircle } from 'lucide-react';
import Link from 'next/link';

/** Last.fm tag.gettoptracks track shape */
type RawTagTrack = { name?: string; artist?: { name?: string }; image?: LastFmImageEntry[] };

/** Last.fm tag.gettopartists artist shape */
type RawTagArtist = { name?: string };

type PreparedTrack = {
    name: string;
    artist: string;
    image?: LastFmImageEntry[];
};

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

async function fetchTagTopTracks(tag: string, limit = 30): Promise<RawTagTrack[]> {
    try {
        const res = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&limit=${limit}&api_key=${LASTFM_API_KEY}&format=json`,
            { next: { revalidate: 43200 } }
        );
        const data = await res.json();
        return (data?.tracks?.track || []) as RawTagTrack[];
    } catch {
        return [];
    }
}

async function fetchTagInfo(tag: string) {
    try {
        const res = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=tag.getinfo&tag=${encodeURIComponent(tag)}&api_key=${LASTFM_API_KEY}&format=json`,
            { next: { revalidate: 43200 } }
        );
        const data = await res.json();
        return data?.tag || null;
    } catch {
        return null;
    }
}

async function fetchTagTopArtists(tag: string, limit = 12): Promise<RawTagArtist[]> {
    try {
        const res = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=tag.gettopartists&tag=${encodeURIComponent(tag)}&limit=${limit}&api_key=${LASTFM_API_KEY}&format=json`,
            { next: { revalidate: 43200 } }
        );
        const data = await res.json();
        return (data?.topartists?.artist || []) as RawTagArtist[];
    } catch {
        return [];
    }
}

// Special genres that Last.fm doesn't have tracks for
const SPECIAL_TAGS = ['seen live', 'favourite', 'favorites', 'favourites', 'loved'];

export default async function GenrePage({ params }: { params: Promise<{ genre: string }> }) {
    const { genre } = await params;
    const decodedGenre = decodeURIComponent(genre);
    const isSpecialTag = SPECIAL_TAGS.some(t => decodedGenre.toLowerCase() === t);

    const [rawTracks, tagInfo, topArtists] = await Promise.all([
        isSpecialTag ? Promise.resolve([]) : fetchTagTopTracks(decodedGenre, 30),
        fetchTagInfo(decodedGenre),
        fetchTagTopArtists(decodedGenre, 12),
    ]);

    // Batch-resolve track images (10 concurrent, 3-tier fallback)
    const tracksPrepared: PreparedTrack[] = rawTracks.map((track: RawTagTrack) => ({
        name: track.name ?? '',
        artist: track.artist?.name ?? 'Unknown',
        image: track.image,
    }));
    const trackImages = await batchResolveTrackImages(tracksPrepared, 10);

    const enrichedTracks = tracksPrepared.map((track, i: number) => ({
        id: encodeURIComponent(track.name),
        title: track.name,
        artist: track.artist,
        coverArt: trackImages[i],
        rank: i + 1,
    }));

    const description = tagInfo?.wiki?.summary
        ?.replace(/<[^>]+>/g, '')
        .split('\n')[0]
        ?.trim()
        .slice(0, 280);

    return (
        <div className="w-full min-h-screen pb-24 pt-24 px-4 md:px-8 max-w-7xl mx-auto">
            {/* Back link */}
            <Link href="/genres" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                All Genres
            </Link>

            {/* Header */}
            <div className="mb-10 animate-fade-up">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-1 h-8 rounded-full bg-primary" />
                    <Tag className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight capitalize">
                    {decodedGenre}
                </h1>
                {description && (
                    <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
                        {description}
                    </p>
                )}
            </div>

            {/* Special tag message */}
            {isSpecialTag && (
                <div className="glass rounded-2xl p-8 flex items-start gap-4 border border-amber-500/20 mb-8">
                    <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-white mb-1">Personal Tag</p>
                        <p className="text-muted-foreground text-sm">
                            "{decodedGenre}" is a personal/social tag on Last.fm used to track concerts or favourites — it doesn't have a standard track listing.
                            Browse the artists below or try a music genre like <Link href="/genres/rock" className="text-primary hover:underline">Rock</Link> or <Link href="/genres/pop" className="text-primary hover:underline">Pop</Link>.
                        </p>
                    </div>
                </div>
            )}

            {/* Top Artists for this genre */}
            {topArtists.length > 0 && (
                <section className="mb-12 animate-fade-up">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-1 h-6 rounded-full bg-primary" />
                        <h2 className="text-lg font-bold uppercase tracking-wider">Top Artists</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {topArtists.map((artist: RawTagArtist) => (
                            <Link
                                key={artist.name ?? ''}
                                href={`/artist/${encodeURIComponent(artist.name ?? '')}`}
                                className="flex items-center gap-2 px-4 py-2 glass rounded-full text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-all hover:scale-105 border border-white/5"
                            >
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                    {(artist.name ?? '')[0]?.toUpperCase()}
                                </div>
                                {artist.name ?? ''}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Top Tracks */}
            {!isSpecialTag && (
                <section className="animate-fade-up">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-1 h-6 rounded-full bg-primary" />
                        <Music className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold uppercase tracking-wider">Top Tracks</h2>
                        <span className="text-xs text-muted-foreground ml-1">{enrichedTracks.length} songs</span>
                    </div>

                    {enrichedTracks.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {enrichedTracks.map((track) => (
                                <SongCard
                                    key={track.id + track.rank}
                                    id={track.id}
                                    title={track.title}
                                    artist={track.artist}
                                    coverArt={track.coverArt}
                                    rank={track.rank}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-16 text-center glass rounded-2xl border border-white/5">
                            <Music className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-muted-foreground">No tracks found for this genre.</p>
                            <Link href="/genres" className="text-primary text-sm mt-3 inline-block hover:underline">
                                Browse all genres →
                            </Link>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
