import { getFeaturedSongAction, getTrendingSongsAction, getTopArtistsAction, getTopTagsAction, getNewsAction } from "@/app/actions";
import { resolveTrackImage, batchResolveTrackImages, batchResolveArtistImages } from "@/lib/imageResolver";
import { type LastFmImageEntry } from "@/lib/lastfm";
import { SongCard } from "@/components/ui/SongCard";
import { ArtistCard } from "@/components/ui/ArtistCard";
import { ChevronRight, Disc3, Youtube } from "lucide-react";
import Link from "next/link";

import { getDynamicGradientStyle } from "@/lib/colors";

type RawChartTrack = { name?: string; artist?: { name?: string }; image?: LastFmImageEntry[]; playcount?: string; listeners?: string };
type RawChartArtist = { name?: string; image?: LastFmImageEntry[]; listeners?: string };
type GenreTag = { name: string };
type EnrichedTrack = { id: string; title: string; artist: string; coverArt: string | null; playCount: number; listeners: number; rank: number };
type EnrichedArtist = { id: string; name: string; image: string | null; listeners?: string; rank: number };
type NewsArticle = { url: string; urlToImage?: string; title?: string; source?: { name?: string }; publishedAt?: string };

export default async function Home() {
  // Fetch all data from real APIs in parallel
  const [featuredDay, trending, topArtistsRaw, topTags, newsArticles] = await Promise.all([
    getFeaturedSongAction().catch(() => null),
    getTrendingSongsAction(12).catch(() => []),
    getTopArtistsAction(10).catch(() => []),
    getTopTagsAction(15).catch(() => []),
    getNewsAction().catch(() => []),
  ]);

  // Resolve featured image using the unified resolver
  let heroImage: string | null = null;
  if (featuredDay) {
    heroImage = await resolveTrackImage(
      featuredDay.name,
      featuredDay.artist?.name,
      featuredDay.image
    );
  }

  const trendingList = (trending || []) as RawChartTrack[];
  const trendingPrepared = trendingList.map((track: RawChartTrack) => ({
    name: track.name ?? '',
    artist: track.artist?.name ?? 'Unknown',
    image: track.image,
  }));
  const trendingImages = await batchResolveTrackImages(trendingPrepared, 10);

  const enrichedTrending: EnrichedTrack[] = trendingPrepared.map((track, i: number) => ({
    id: encodeURIComponent(track.name),
    title: track.name,
    artist: track.artist,
    coverArt: trendingImages[i] ?? null,
    playCount: parseInt(trendingList[i]?.playcount ?? '', 10) || 0,
    listeners: parseInt(trendingList[i]?.listeners ?? '', 10) || 0,
    rank: i + 1,
  }));

  const artistsList = (topArtistsRaw || []) as RawChartArtist[];
  const artistsPrepared = artistsList.map((artist: RawChartArtist) => ({
    name: artist.name ?? '',
    image: artist.image,
  }));
  const artistImages = await batchResolveArtistImages(artistsPrepared, 10);

  const enrichedArtists: EnrichedArtist[] = artistsPrepared.map((artist, i: number) => ({
    id: artist.name,
    name: artist.name,
    image: artistImages[i] ?? null,
    listeners: artistsList[i]?.listeners,
    rank: i + 1,
  }));

  // YouTube search helper
  const ytUrl = (track: string, artist: string) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track} ${artist} official`)}`;

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero / Featured — Spotify-style */}
      <section className="relative w-full min-h-[340px] flex items-end overflow-hidden bg-gradient-to-b from-primary/20 via-background to-background">
        {featuredDay ? (
          <>
            <div className="absolute inset-0 z-[1]" />
            {heroImage && (
              <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl scale-110 z-[2]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-[3]" />

            <div className="container relative z-10 pb-8 pt-6 flex gap-6 items-end animate-fade-up">
              <div className="hidden md:block w-48 h-48 rounded-lg overflow-hidden shadow-2xl shrink-0">
                {heroImage ? (
                  <img src={heroImage} alt={featuredDay.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-card flex items-center justify-center">
                    <Disc3 className="w-16 h-16 text-muted-foreground/20" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Song of the week</span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mt-1 mb-2 tracking-tight">
                  {featuredDay.name}
                </h1>
                <p className="text-lg text-muted-foreground font-medium mb-4">
                  {featuredDay.artist?.name}
                </p>
                {featuredDay.playcount && (
                  <p className="text-sm text-white/30 font-medium mb-6">
                    <span className="text-primary font-bold">{parseInt(featuredDay.playcount).toLocaleString()}</span> total plays
                  </p>
                )}
                <div className="flex gap-3">
                  <a
                    href={ytUrl(featuredDay.name, featuredDay.artist?.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Youtube className="h-4 w-4" /> Play
                  </a>
                  <Link
                    href={`/artist/${encodeURIComponent(featuredDay.artist?.name)}`}
                    className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-foreground hover:border-white/40 transition-colors"
                  >
                    View Artist
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="container relative z-10 pb-14">
            <div className="w-48 h-6 bg-muted/50 rounded-full animate-shimmer mb-4" />
            <div className="w-96 h-16 bg-muted/30 rounded-xl animate-shimmer mb-3" />
            <div className="w-64 h-6 bg-muted/20 rounded-lg animate-shimmer" />
          </div>
        )}
      </section>

      {/* Content */}
      <div className="container w-full px-6 py-8 space-y-10">

        {topTags && topTags.length > 0 && (
          <section className="animate-fade-up stagger-1">
            <h2 className="text-2xl font-bold text-foreground mb-4">Browse by genre</h2>
            <div className="flex flex-wrap gap-2">
              {(topTags as GenreTag[]).map((tag: GenreTag) => (
                <Link
                  key={tag.name}
                  href={`/genres/${encodeURIComponent(tag.name)}`}
                  className="rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {(() => {
          const moods: Record<number, { mood: string; emoji: string; gradient: string }> = {
            0: { mood: 'Soulful Sunday', emoji: '🎵', gradient: 'from-amber-500/20 to-orange-600/20' },
            1: { mood: 'Melancholy Monday', emoji: '🌧️', gradient: 'from-blue-500/20 to-indigo-600/20' },
            2: { mood: 'Turbo Tuesday', emoji: '🔥', gradient: 'from-red-500/20 to-rose-600/20' },
            3: { mood: 'Wavy Wednesday', emoji: '🌊', gradient: 'from-teal-500/20 to-cyan-600/20' },
            4: { mood: 'Throwback Thursday', emoji: '📻', gradient: 'from-pink-500/20 to-fuchsia-600/20' },
            5: { mood: 'Feel-Good Friday', emoji: '🎉', gradient: 'from-emerald-500/20 to-green-600/20' },
            6: { mood: 'Chill Saturday', emoji: '☕', gradient: 'from-violet-500/20 to-purple-600/20' },
          };
          const m = moods[new Date().getDay()];
          return (
            <Link href="/discover" className="block animate-fade-up stagger-1">
              <div className={`rounded-lg p-5 bg-gradient-to-r ${m.gradient} bg-card hover:bg-card/90 transition-colors group relative overflow-hidden`}>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-4xl opacity-20">{m.emoji}</div>
                <span className="text-xs font-medium text-muted-foreground">Today&apos;s vibe</span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">{m.emoji} {m.mood}</h3>
                <p className="text-sm text-muted-foreground mt-1">Discover 50 songs for today →</p>
              </div>
            </Link>
          );
        })()}
        <section className="animate-fade-up stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Trending now</h2>
            <Link href="/trending" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Show all <ChevronRight className="inline h-4 w-4" />
            </Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
            {enrichedTrending.map((track: EnrichedTrack) => (
              <div key={track.id + track.rank} className="snap-start">
                <SongCard
                  id={track.id}
                  title={track.title}
                  artist={track.artist}
                  coverArt={track.coverArt}
                  playCount={track.playCount}
                  listeners={track.listeners}
                  rank={track.rank}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="animate-fade-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Top artists</h2>
            <Link href="/top-artists" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Show all <ChevronRight className="inline h-4 w-4" />
            </Link>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
            {enrichedArtists.map((artist: EnrichedArtist) => (
              <div key={artist.id} className="snap-start pt-1">
                <ArtistCard
                  id={artist.id}
                  name={artist.name}
                  image={artist.image}
                  listeners={artist.listeners}
                  rank={artist.rank}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="animate-fade-up stagger-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">Top charts</h2>
          <div className="rounded-lg bg-card overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_1fr_50px_100px] md:grid-cols-[50px_1fr_1fr_50px_120px_120px] gap-3 px-4 py-3 border-b border-white/5 text-xs font-medium text-muted-foreground">
              <span>#</span>
              <span>Title</span>
              <span>Artist</span>
              <span></span>
              <span className="hidden md:block text-right">Listeners</span>
              <span className="text-right">Plays</span>
            </div>
            {enrichedTrending.slice(0, 10).map((track: EnrichedTrack, i: number) => (
              <div
                key={track.id + '-table-' + i}
                className="row-hover grid grid-cols-[40px_1fr_1fr_50px_100px] md:grid-cols-[50px_1fr_1fr_50px_120px_120px] gap-3 px-4 py-2.5 items-center rounded-md group"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {track.rank}
                </span>
                <Link href={`/song/${track.id}`} className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                    {track.coverArt ? (
                      <img src={track.coverArt} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={getDynamicGradientStyle(track.title)}>
                        <span className="text-xs font-bold text-white/40">{track.title?.charAt(0)?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {track.title}
                  </span>
                </Link>
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
                <span className="hidden md:block text-xs text-muted-foreground text-right font-medium tabular-nums">
                  {track.listeners?.toLocaleString() || '—'}
                </span>
                <span className="text-xs text-muted-foreground text-right font-medium tabular-nums">
                  {track.playCount?.toLocaleString() || '—'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {newsArticles && newsArticles.length > 0 && (
          <section className="animate-fade-up stagger-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">Music news</h2>
              <Link href="/news" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Show all <ChevronRight className="inline h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(newsArticles as NewsArticle[]).slice(0, 3).map((article: NewsArticle, i: number) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-lg bg-card overflow-hidden card-hover"
                >
                  <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden">
                    {article.urlToImage ? (
                      <img src={article.urlToImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={getDynamicGradientStyle(article.title)}>
                        <span className="text-xs font-bold text-white/40">{article.title?.charAt(0)?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
                      {article.title}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-medium">{article.source?.name || 'News'}</span>
                      <span>{new Date(article.publishedAt ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
