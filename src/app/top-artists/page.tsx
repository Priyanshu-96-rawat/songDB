import { fetchTopArtists, type LastFmImageEntry } from '@/lib/lastfm';
import { batchResolveArtistImages } from '@/lib/imageResolver';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/** Last.fm chart.gettopartists artist shape */
type RawChartArtist = { name?: string; image?: LastFmImageEntry[]; listeners?: string };

type PreparedArtist = {
    name: string;
    image?: LastFmImageEntry[];
    listeners?: number | string;
};

export const revalidate = 86400;

export default async function TopArtistsPage() {
    const artists = (await fetchTopArtists(50)) as RawChartArtist[] | undefined;
    const prepared: PreparedArtist[] = (artists || []).map((a: RawChartArtist) => ({
        name: a.name ?? '',
        image: a.image,
        listeners: a.listeners,
    }));

    const images = await batchResolveArtistImages(prepared, 10);

    const enriched = prepared.map((artist, i) => ({
        id: artist.name,
        name: artist.name,
        image: images[i],
        listeners: artist.listeners,
        rank: i + 1,
    }));

    return (
        <div className="w-full min-h-screen pb-24 pt-24 px-4 md:px-8 max-w-7xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Home
            </Link>

            <div className="mb-10 animate-fade-up">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-1 h-8 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
                    <Users className="w-6 h-6 text-cyan-400" />
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
                    Top Artists
                </h1>
                <p className="text-muted-foreground">The 50 most listened-to artists globally.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 animate-fade-up">
                {enriched.map((artist) => (
                    <ArtistCard
                        key={artist.id}
                        id={artist.id}
                        name={artist.name}
                        image={artist.image}
                        listeners={artist.listeners}
                        rank={artist.rank}
                    />
                ))}
            </div>
        </div>
    );
}
