import { batchResolveTrackImages } from '@/lib/imageResolver';
import { SongCard } from '@/components/ui/SongCard';
import { Sparkles, Shuffle, Youtube, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

// ── Mood of the Day Configuration ──
const MOOD_MAP: Record<number, { mood: string; emoji: string; tag: string; gradient: string }> = {
    0: { mood: 'Soulful Sunday', emoji: '🎵', tag: 'soul', gradient: 'from-primary/10 to-card' },
    1: { mood: 'Melancholy Monday', emoji: '🌧️', tag: 'sad', gradient: 'from-blue-500/10 to-card' },
    2: { mood: 'Turbo Tuesday', emoji: '🔥', tag: 'rock', gradient: 'from-orange-500/10 to-card' },
    3: { mood: 'Wavy Wednesday', emoji: '🌊', tag: 'chillwave', gradient: 'from-teal-500/10 to-card' },
    4: { mood: 'Throwback Thursday', emoji: '📻', tag: '80s', gradient: 'from-fuchsia-500/10 to-card' },
    5: { mood: 'Feel-Good Friday', emoji: '🎉', tag: 'happy', gradient: 'from-primary/20 to-card' },
    6: { mood: 'Chill Saturday', emoji: '☕', tag: 'chill', gradient: 'from-purple-500/10 to-card' },
};

// ── Random Genre Pool ──
const RANDOM_GENRES = [
    'rock', 'pop', 'jazz', 'hip-hop', 'electronic', 'r&b', 'country', 'classical',
    'metal', 'folk', 'reggae', 'blues', 'punk', 'latin', 'soul', 'disco',
    'ambient', 'indie', 'grunge', 'funk', 'gospel', 'house', 'techno', 'trap',
    'lo-fi', 'shoegaze', 'post-punk', 'synthwave', 'ska', 'afrobeats',
    'bossa nova', 'new wave', 'psychedelic', 'progressive rock', 'dream pop',
    'emo', 'garage rock', 'k-pop', 'dancehall', 'trip-hop',
];

async function fetchTagTracks(tag: string, limit = 50) {
    try {
        const res = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&limit=${limit}&api_key=${LASTFM_API_KEY}&format=json`,
            { next: { revalidate: 43200 } }
        );
        const data = await res.json();
        return data?.tracks?.track || [];
    } catch {
        return [];
    }
}

function getDaySeed(): number {
    const now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

export default async function DiscoverPage() {
    const dayOfWeek = new Date().getDay();
    const moodConfig = MOOD_MAP[dayOfWeek];
    const seed = getDaySeed();
    const randomGenre = RANDOM_GENRES[seed % RANDOM_GENRES.length];

    // Fetch both in parallel
    const [moodTracks, randomTracks] = await Promise.all([
        fetchTagTracks(moodConfig.tag, 50),
        fetchTagTracks(randomGenre, 50),
    ]);

    // Batch resolve images for both lists concurrently
    const moodPrepared = moodTracks.slice(0, 50).map((t: any) => ({
        name: t.name, artist: t.artist?.name || 'Unknown', image: t.image,
    }));
    const randomPrepared = randomTracks.slice(0, 50).map((t: any) => ({
        name: t.name, artist: t.artist?.name || 'Unknown', image: t.image,
    }));

    const [moodImages, randomImages] = await Promise.all([
        batchResolveTrackImages(moodPrepared, 10),
        batchResolveTrackImages(randomPrepared, 10),
    ]);

    const enrichedMood = moodPrepared.map((track: { name: string, artist: string, image: any }, i: number) => ({
        id: encodeURIComponent(track.name), title: track.name,
        artist: track.artist, coverArt: moodImages[i], rank: i + 1,
    }));

    const enrichedRandom = randomPrepared.map((track: { name: string, artist: string, image: any }, i: number) => ({
        id: encodeURIComponent(track.name), title: track.name,
        artist: track.artist, coverArt: randomImages[i], rank: i + 1,
    }));

    const ytUrl = (t: string, a: string) =>
        `https://www.youtube.com/results?search_query=${encodeURIComponent(`${t} ${a} official`)}`;

    return (
        <div className="w-full min-h-screen pb-24 pt-24 px-4 md:px-8 max-w-7xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Home
            </Link>

            {/* ═══ MOOD OF THE DAY ═══ */}
            <section className="mb-16 animate-fade-up">
                <div className={`rounded-3xl p-8 md:p-10 mb-8 bg-gradient-to-br ${moodConfig.gradient} border border-white/5 relative overflow-hidden`}>
                    <div className="absolute top-4 right-6 text-6xl opacity-20 select-none">{moodConfig.emoji}</div>
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Today&apos;s Vibe</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                        {moodConfig.emoji} {moodConfig.mood}
                    </h1>
                    <p className="text-muted-foreground text-sm max-w-xl">
                        Curated for today&apos;s energy. Top 50 <span className="text-primary font-semibold capitalize">{moodConfig.tag}</span> tracks —
                        refreshes daily with a new mood.
                    </p>
                </div>

                <div className="glass rounded-xl overflow-hidden border border-white/5">
                    <div className="grid grid-cols-[40px_1fr_1fr_50px] gap-3 px-4 py-3 border-b border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>#</span>
                        <span>Title</span>
                        <span>Artist</span>
                        <span></span>
                    </div>
                    {enrichedMood.map((track: any) => (
                        <div
                            key={'mood-' + track.id + track.rank}
                            className="grid grid-cols-[40px_1fr_1fr_50px] gap-3 px-4 py-3 items-center border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
                        >
                            <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                {track.rank}
                            </span>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-md overflow-hidden bg-muted shrink-0 relative">
                                    {track.coverArt ? (
                                        <img src={track.coverArt} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center text-[10px] font-bold text-primary">♪</div>
                                    )}
                                </div>
                                <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                    {track.title}
                                </span>
                            </div>
                            <Link href={`/artist/${encodeURIComponent(track.artist)}`} className="text-sm text-muted-foreground truncate hover:text-primary transition-colors">
                                {track.artist}
                            </Link>
                            <a
                                href={ytUrl(track.title, track.artist)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Play on YouTube"
                            >
                                <Youtube className="w-4 h-4" />
                            </a>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══ RANDOM GENRE DISCOVERY ═══ */}
            <section className="animate-fade-up">
                <div className="rounded-3xl p-8 md:p-10 mb-8 bg-gradient-to-br from-primary/5 to-card border border-white/5 relative overflow-hidden">
                    <div className="absolute top-4 right-6 text-5xl opacity-20 select-none">🎲</div>
                    <div className="flex items-center gap-3 mb-2">
                        <Shuffle className="w-5 h-5 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Random Discovery</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
                        Top 50 in <span className="capitalize text-primary">{randomGenre}</span>
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-xl">
                        Don&apos;t know what to listen to? Here are the top songs in <span className="text-primary font-semibold capitalize">{randomGenre}</span> —
                        a new genre is picked every day.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {enrichedRandom.map((track: any) => (
                        <SongCard
                            key={'rand-' + track.id + track.rank}
                            id={track.id}
                            title={track.title}
                            artist={track.artist}
                            coverArt={track.coverArt}
                            rank={track.rank}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}
