import { getFeaturedSongAction, getTrendingSongsAction, getTopArtistsAction, getTopTagsAction, getNewsAction, extractLastFmImage } from "@/app/actions";
import { resolveTrackImage, batchResolveTrackImages, batchResolveArtistImages } from "@/lib/imageResolver";
import { SongCard } from "@/components/ui/SongCard";
import { ArtistCard } from "@/components/ui/ArtistCard";
import { Play, TrendingUp, Users, Disc3, Sparkles, ChevronRight, Newspaper, Tag, Youtube, ExternalLink } from "lucide-react";
import Link from "next/link";

const GRADIENTS = [
  'from-violet-600 via-purple-500 to-indigo-600',
  'from-rose-600 via-pink-500 to-fuchsia-600',
  'from-amber-600 via-orange-500 to-red-500',
  'from-emerald-600 via-teal-500 to-cyan-600',
  'from-blue-600 via-indigo-500 to-violet-600',
  'from-pink-500 via-rose-500 to-orange-500',
  'from-teal-500 via-emerald-500 to-lime-500',
  'from-sky-600 via-blue-500 to-indigo-500',
  'from-fuchsia-600 via-purple-600 to-blue-600',
  'from-orange-500 via-amber-500 to-yellow-500',
];
function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default async function Home() {
  // Fetch all data from real APIs in parallel
  const [featuredDay, trending, topArtistsRaw, topTags, newsArticles] = await Promise.all([
    getFeaturedSongAction(),
    getTrendingSongsAction(12),
    getTopArtistsAction(10),
    getTopTagsAction(15),
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

  // Batch-resolve trending song images (10 concurrent workers)
  const trendingPrepared = (trending || []).map((track: any) => ({
    name: track.name,
    artist: track.artist?.name || 'Unknown',
    image: track.image,
  }));
  const trendingImages = await batchResolveTrackImages(trendingPrepared, 10);

  const enrichedTrending = trendingPrepared.map((track, i: number) => ({
    id: encodeURIComponent(track.name),
    title: track.name,
    artist: track.artist,
    coverArt: trendingImages[i],
    playCount: parseInt((trending as any[])[i]?.playcount) || 0,
    listeners: parseInt((trending as any[])[i]?.listeners) || 0,
    rank: i + 1,
  }));

  // Batch-resolve top artist images (10 concurrent workers — all 3 fallbacks)
  const artistsPrepared = (topArtistsRaw || []).map((artist: any) => ({
    name: artist.name,
    image: artist.image,
  }));
  const artistImages = await batchResolveArtistImages(artistsPrepared, 10);

  const enrichedArtists = artistsPrepared.map((artist, i: number) => ({
    id: artist.name,
    name: artist.name,
    image: artistImages[i],
    listeners: (topArtistsRaw as any[])[i]?.listeners,
    rank: i + 1,
  }));

  // YouTube search helper
  const ytUrl = (track: string, artist: string) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track} ${artist} official`)}`;

  return (
    <main className="flex min-h-screen flex-col">
      {/* ========== CINEMATIC HERO with QClay orbs ========== */}
      <section className="relative w-full h-[65vh] min-h-[520px] flex items-end overflow-hidden">
        {featuredDay ? (
          <>
            <div className="absolute inset-0 bg-background z-[1]" />
            {heroImage && (
              <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-110 z-[2]" />
            )}
            {/* Animated gradient orbs */}
            <div className="absolute top-10 right-[20%] w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-orb z-[2]" />
            <div className="absolute bottom-20 left-[10%] w-96 h-96 rounded-full bg-purple-500/8 blur-3xl animate-orb-delay z-[2]" />

            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent z-[3]" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent z-[3]" />

            <div className="container relative z-10 pb-14 flex gap-8 items-end animate-fade-up">
              <div className="hidden md:block w-56 h-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 shrink-0 animate-float">
                {heroImage ? (
                  <img src={heroImage} alt={featuredDay.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-card flex items-center justify-center">
                    <Disc3 className="w-16 h-16 text-muted-foreground/20" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="inline-block py-1 px-3 rounded-full bg-primary/15 text-primary text-[11px] font-bold uppercase tracking-[0.15em] border border-primary/20 animate-glow">
                    Song of the Week
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-2 tracking-tight leading-[0.95]">
                  {featuredDay.name}
                </h1>
                <p className="text-lg md:text-xl text-white/60 font-medium mb-6">
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
                    className="flex items-center gap-2.5 bg-red-600 text-white px-7 py-3.5 rounded-full font-bold text-sm hover:scale-105 transition-all hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-95"
                  >
                    <Youtube className="h-4 w-4" /> Play on YouTube
                  </a>
                  <Link
                    href={`/artist/${encodeURIComponent(featuredDay.artist?.name)}`}
                    className="flex items-center gap-2 glass text-white/80 hover:bg-white/15 px-7 py-3.5 rounded-full font-medium text-sm transition-all hover:border-white/15"
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

      {/* ========== CONTENT ROWS ========== */}
      <div className="container w-full py-10 space-y-14">

        {/* ── Genre Tags ── */}
        {topTags && topTags.length > 0 && (
          <section className="animate-fade-up stagger-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-7 rounded-full bg-primary" />
              <Tag className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight">Browse by Genre</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {topTags.map((tag: any) => (
                <Link
                  key={tag.name}
                  href={`/genres/${encodeURIComponent(tag.name)}`}
                  className="px-4 py-2 rounded-full glass text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all hover:scale-105"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Mood of the Day Teaser ── */}
        {(() => {
          const moods: Record<number, { mood: string; emoji: string; gradient: string }> = {
            0: { mood: 'Soulful Sunday', emoji: '🎵', gradient: 'from-amber-500/15 to-orange-600/15' },
            1: { mood: 'Melancholy Monday', emoji: '🌧️', gradient: 'from-blue-500/15 to-indigo-600/15' },
            2: { mood: 'Turbo Tuesday', emoji: '🔥', gradient: 'from-red-500/15 to-rose-600/15' },
            3: { mood: 'Wavy Wednesday', emoji: '🌊', gradient: 'from-teal-500/15 to-cyan-600/15' },
            4: { mood: 'Throwback Thursday', emoji: '📻', gradient: 'from-pink-500/15 to-fuchsia-600/15' },
            5: { mood: 'Feel-Good Friday', emoji: '🎉', gradient: 'from-emerald-500/15 to-green-600/15' },
            6: { mood: 'Chill Saturday', emoji: '☕', gradient: 'from-violet-500/15 to-purple-600/15' },
          };
          const m = moods[new Date().getDay()];
          return (
            <Link href="/discover" className="block animate-fade-up stagger-1">
              <div className={`rounded-2xl p-6 bg-gradient-to-r ${m.gradient} border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden`}>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-5xl opacity-15 select-none group-hover:opacity-25 transition-opacity">{m.emoji}</div>
                <div className="flex items-center gap-3 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Today&apos;s Vibe</span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors">{m.emoji} {m.mood}</h3>
                <p className="text-xs text-muted-foreground mt-1">Tap to discover 50 curated songs for today&apos;s energy →</p>
              </div>
            </Link>
          );
        })()}
        <section className="animate-fade-up stagger-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 rounded-full bg-primary" />
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight">Trending Now</h2>
            </div>
            <Link
              href="/trending"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
            {enrichedTrending.map((track) => (
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

        {/* ── Top Artists ── */}
        <section className="animate-fade-up stagger-3">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 rounded-full bg-primary" />
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight">Top Artists</h2>
            </div>
            <Link
              href="/top-artists"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
            {enrichedArtists.map((artist) => (
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

        {/* ── Top Charts Table ── */}
        <section className="animate-fade-up stagger-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 rounded-full bg-primary" />
              <Disc3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight">Top Charts</h2>
            </div>
          </div>
          <div className="glass rounded-xl overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_1fr_50px_100px] md:grid-cols-[50px_1fr_1fr_50px_120px_120px] gap-3 px-4 py-3 border-b border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>#</span>
              <span>Title</span>
              <span>Artist</span>
              <span></span>
              <span className="hidden md:block text-right">Listeners</span>
              <span className="text-right">Plays</span>
            </div>
            {enrichedTrending.slice(0, 10).map((track, i) => (
              <div
                key={track.id + '-table-' + i}
                className="grid grid-cols-[40px_1fr_1fr_50px_100px] md:grid-cols-[50px_1fr_1fr_50px_120px_120px] gap-3 px-4 py-3 items-center border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
              >
                <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
                  {track.rank}
                </span>
                <Link href={`/song/${track.id}`} className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                    {track.coverArt ? (
                      <img src={track.coverArt} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradient(track.title)}`}>
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
                <span className="text-xs text-primary/70 text-right font-medium tabular-nums">
                  {track.playCount?.toLocaleString() || '—'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Music News ── */}
        {newsArticles && newsArticles.length > 0 && (
          <section className="animate-fade-up stagger-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-1 h-7 rounded-full bg-primary" />
                <Newspaper className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Music News</h2>
              </div>
              <Link
                href="/news"
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
              >
                See all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {newsArticles.slice(0, 3).map((article: any, i: number) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group glass rounded-xl overflow-hidden card-hover"
                >
                  <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden">
                    {article.urlToImage ? (
                      <img src={article.urlToImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradient(article.title)}`}>
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
                      <span>{new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
