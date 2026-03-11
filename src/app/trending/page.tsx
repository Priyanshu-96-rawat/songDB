
import { fetchTrendingSongs, type LastFmImageEntry } from '@/lib/lastfm';
import { batchResolveTrackImages } from '@/lib/imageResolver';
import { getGradientClass } from '@/lib/colors';
import { TrendingUp, ArrowLeft, Youtube } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

/** Last.fm chart.gettoptracks track shape */
type RawChartTrack = {
    name?: string;
    artist?: { name?: string };
    image?: LastFmImageEntry[];
    playcount?: string;
    listeners?: string;
};

type PreparedTrack = {
    name: string;
    artist: string;
    image?: LastFmImageEntry[];
};

export const revalidate = 43200; // Refresh every 12 hours

export default async function TrendingPage() {
    const tracks = (await fetchTrendingSongs(50)) as RawChartTrack[];
    const prepared: PreparedTrack[] = (tracks || []).map((t: RawChartTrack) => ({
        name: t.name ?? '',
        artist: t.artist?.name ?? 'Unknown',
        image: t.image,
    }));

    const images = await batchResolveTrackImages(prepared, 10);

    const enriched = prepared.map((track, i) => ({
        id: encodeURIComponent(track.name),
        title: track.name,
        artist: track.artist,
        coverArt: images[i],
        playCount: parseInt(tracks[i]?.playcount ?? '', 10) || 0,
        listeners: parseInt(tracks[i]?.listeners ?? '', 10) || 0,
        rank: i + 1,
    }));

    const ytUrl = (t: string, a: string) =>
        `https://www.youtube.com/results?search_query=${encodeURIComponent(`${t} ${a} official`)}`;

    return (
        <div className="w-full min-h-screen pb-24 pt-24 px-4 md:px-8 max-w-7xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Home
            </Link>

            <div className="mb-10 animate-fade-up">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-1 h-8 rounded-full bg-gradient-to-b from-rose-500 to-amber-500" />
                    <TrendingUp className="w-6 h-6 text-rose-400" />
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
                    Trending Now
                </h1>
                <p className="text-muted-foreground">Top 50 most played songs globally right now.</p>
            </div>

            <div className="glass rounded-xl overflow-hidden border border-white/5 animate-fade-up">
                <div className="grid grid-cols-[40px_1fr_1fr_50px_100px] md:grid-cols-[50px_1fr_1fr_50px_120px_120px] gap-3 px-4 py-3 border-b border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>#</span>
                    <span>Title</span>
                    <span>Artist</span>
                    <span></span>
                    <span className="hidden md:block text-right">Listeners</span>
                    <span className="text-right">Plays</span>
                </div>
                {enriched.map((track) => (
                    <div
                        key={track.id + '-' + track.rank}
                        className="grid grid-cols-[40px_1fr_1fr_50px_100px] md:grid-cols-[50px_1fr_1fr_50px_120px_120px] gap-3 px-4 py-3 items-center border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
                    >
                        <span className="text-sm font-bold text-muted-foreground group-hover:text-rose-400 transition-colors">
                            {track.rank}
                        </span>
                        <Link href={`/song/${track.id}`} className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 relative">
                                {track.coverArt ? (
                                    <Image src={track.coverArt} alt="" fill className="object-cover" unoptimized />
                                ) : (
                                    <div className={`w-full h-full bg-gradient-to-br ${getGradientClass(track.title)} flex items-center justify-center`}>
                                        <span className="text-xs font-bold text-white/40">{track.title?.charAt(0)?.toUpperCase()}</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-sm font-semibold text-foreground truncate group-hover:text-rose-400 transition-colors">
                                {track.title}
                            </span>
                        </Link>
                        <Link href={`/artist/${encodeURIComponent(track.artist)}`} className="text-sm text-muted-foreground truncate hover:text-rose-400 transition-colors">
                            {track.artist}
                        </Link>
                        <a
                            href={ytUrl(track.title, track.artist)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            title="Play on YouTube"
                        >
                            <Youtube className="w-4 h-4" />
                        </a>
                        <span className="hidden md:block text-xs text-muted-foreground text-right font-medium tabular-nums">
                            {track.listeners?.toLocaleString() || '—'}
                        </span>
                        <span className="text-xs text-rose-400/70 text-right font-medium tabular-nums">
                            {track.playCount?.toLocaleString() || '—'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
