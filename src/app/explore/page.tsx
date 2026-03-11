import { Music2, Sparkles, TrendingUp } from "lucide-react";
import { MusicShelf } from "@/components/ui/MusicShelf";
import { getCachedYTMusicExplore } from "@/lib/youtube-feed";

export default async function ExplorePage() {
  const shelves = await getCachedYTMusicExplore();

  return (
    <div className="px-6 py-6">
      <div className="mb-10 rounded-[32px] shell-panel px-6 py-7 md:px-8 md:py-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl text-white md:text-5xl">Explore</h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-white/45">
          <Sparkles className="h-4 w-4 text-primary" />
          Charts, new releases, moods and genre runs without the client-side loading stall.
        </p>
      </div>

      <div className="grid gap-6">
        {shelves.map((shelf, index) => (
          <div key={`explore-${index}`} className="rounded-[30px] shell-panel-soft p-5 md:p-6">
            <MusicShelf
              title={shelf.title}
              tracks={shelf.tracks}
              layout={index === 0 ? "grid" : "scroll"}
              maxItems={index === 0 ? 12 : 10}
            />
          </div>
        ))}
      </div>

      {shelves.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24">
          <Music2 className="mb-4 h-16 w-16 text-white/10" />
          <p className="text-lg font-semibold text-white/35">No explore data available</p>
          <p className="mt-1 text-sm text-white/20">
            Charts and new releases will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
