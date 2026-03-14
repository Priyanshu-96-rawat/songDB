"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Disc3,
  ListMusic,
  Play,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { MusicShelf } from "@/components/ui/MusicShelf";
import { getDynamicGradientStyle } from "@/lib/colors";
import type { MusicFlowDimension, YouTubeMusicFlowItem } from "@/lib/youtube-stream";
import { useLibraryStore } from "@/store/library";
import { useYouTubePlayerStore, type YouTubeTrack } from "@/store/youtubePlayer";

type HomeFeedShelf = {
  title: string;
  tracks: YouTubeTrack[];
};

interface HomeViewProps {
  greeting: string;
  shelves: HomeFeedShelf[];
  exploreShelves: HomeFeedShelf[];
  flowFeed: YouTubeMusicFlowItem[];
}

type TimeSegment = "morning" | "afternoon" | "evening" | "late-night";

type FeedCandidate = {
  track: YouTubeTrack;
  shelfTitle: string;
  source: "recent" | "liked" | "home" | "explore";
  position: number;
};

function TrackThumb({ track }: { track: YouTubeTrack }) {
  if (!track.thumbnail) {
    return (
      <div
        className="h-12 w-12 rounded-2xl"
        style={getDynamicGradientStyle(track.title)}
      />
    );
  }

  return (
    <Image
      src={track.thumbnail}
      alt=""
      width={48}
      height={48}
      unoptimized
      className="h-12 w-12 rounded-2xl object-cover"
    />
  );
}

function getTimeSegment(date = new Date()): TimeSegment {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "late-night";
}


function getGreetingForSegment(segment: TimeSegment) {
  if (segment === "morning") return "Good morning";
  if (segment === "afternoon") return "Good afternoon";
  return "Good evening";
}

function normalizeText(value: string) {
  return value.toLowerCase();
}

function getMoodKeywords(segment: TimeSegment) {
  if (segment === "morning") {
    return ["chill", "indie", "soul", "new", "focus", "fresh"];
  }
  if (segment === "afternoon") {
    return ["trending", "pop", "charts", "hip hop", "hits", "viral"];
  }
  if (segment === "evening") {
    return ["r&b", "dance", "edm", "global", "bollywood", "pop"];
  }
  return ["chill", "indie", "soul", "late", "night", "alternative"];
}

function getMoodCopy(segment: TimeSegment) {
  if (segment === "morning") {
    return {
      label: "Morning Lift",
      title: "Ease in with something brighter.",
      copy: "This start row leans toward lighter shelves and steady tracks that work better at the top of the day.",
      quickTitle: "Fresh picks for the morning.",
      quickCopy: "Quick picks lean toward smoother shelves first, then widen into the freshest feed results.",
      primaryAction: "Start Morning Mix",
      queueAction: "Queue Morning Run",
    };
  }
  if (segment === "afternoon") {
    return {
      label: "Midday Charge",
      title: "Keep the day moving.",
      copy: "The hero shifts toward punchier shelves and repeat-friendly tracks that fit an active afternoon session.",
      quickTitle: "Momentum picks for right now.",
      quickCopy: "Quick picks now favor higher-energy shelves and familiar artists before broadening into discovery.",
      primaryAction: "Start Midday Mix",
      queueAction: "Queue Momentum",
    };
  }
  if (segment === "evening") {
    return {
      label: "Evening Blend",
      title: "Lean into what hits after dark.",
      copy: "The opening mix tilts toward richer, more replayable lanes for evening listening without losing the live feed.",
      quickTitle: "Evening picks worth staying with.",
      quickCopy: "Quick picks blend your known artists with stronger evening shelves from home and discovery.",
      primaryAction: "Start Evening Mix",
      queueAction: "Queue Evening Set",
    };
  }
  return {
    label: "After Hours",
    title: "Let the room slow down cleanly.",
    copy: "Late-night ranking now pulls calmer shelves and familiar artists first, then layers in deeper discovery picks.",
    quickTitle: "After-hours picks worth keeping on.",
    quickCopy: "Quick picks prioritize calmer lanes and familiar artists before opening into wider discovery.",
    primaryAction: "Start After Hours",
    queueAction: "Queue Night Set",
  };
}

function getArtistDrivenTitle(segment: TimeSegment, artist: string) {
  if (segment === "morning") return `Start the morning with ${artist}.`;
  if (segment === "afternoon") return `Keep the afternoon moving with ${artist}.`;
  if (segment === "evening") return `Settle into the evening with ${artist}.`;
  return `Stay in the room with ${artist}.`;
}

function getDimensionLabel(value: MusicFlowDimension | "all") {
  if (value === "all") return "All";
  if (value === "genre") return "Genre";
  if (value === "language") return "Language";
  if (value === "country") return "Country";
  if (value === "time") return "Time";
  if (value === "artist") return "Artist";
  return "Category";
}

function getArtistAffinity(tracks: YouTubeTrack[]) {
  const counts = new Map<string, number>();

  for (const track of tracks) {
    if (!track.artist) continue;
    counts.set(track.artist, (counts.get(track.artist) ?? 0) + 1);
  }

  let topArtist = "";
  let topScore = 0;

  for (const [artist, score] of counts.entries()) {
    if (score > topScore) {
      topArtist = artist;
      topScore = score;
    }
  }

  return topArtist;
}

function buildCandidates(
  recentlyPlayed: YouTubeTrack[],
  likedSongs: YouTubeTrack[],
  shelves: HomeFeedShelf[],
  exploreShelves: HomeFeedShelf[]
) {
  const candidates: FeedCandidate[] = [];

  recentlyPlayed.slice(0, 8).forEach((track, position) => {
    candidates.push({ track, shelfTitle: "Recently Played", source: "recent", position });
  });

  likedSongs.slice(0, 8).forEach((track, position) => {
    candidates.push({ track, shelfTitle: "Liked Songs", source: "liked", position });
  });

  shelves.forEach((shelf) => {
    shelf.tracks.slice(0, 10).forEach((track, position) => {
      candidates.push({ track, shelfTitle: shelf.title, source: "home", position });
    });
  });

  exploreShelves.forEach((shelf) => {
    shelf.tracks.slice(0, 10).forEach((track, position) => {
      candidates.push({ track, shelfTitle: shelf.title, source: "explore", position });
    });
  });

  return candidates;
}

export function HomeView({ shelves, exploreShelves, flowFeed }: HomeViewProps) {
  const { recentlyPlayed, likedSongs, hasHydrated } = useLibraryStore();
  const { playTrack, addToQueue } = useYouTubePlayerStore();
  const [timeSegment] = useState<TimeSegment>(() => getTimeSegment(new Date()));
  const [displayGreeting] = useState(() => getGreetingForSegment(getTimeSegment(new Date())));
  const [activeFlowFilter, setActiveFlowFilter] = useState<MusicFlowDimension | "all">("all");

  const personalizedSeedTracks = hasHydrated ? [...recentlyPlayed, ...likedSongs.slice(0, 6)] : [];
  const recentAnchor = personalizedSeedTracks[0] ?? null;
  const preferredArtists = new Set(personalizedSeedTracks.map((track) => track.artist).filter(Boolean));
  const artistAffinity = getArtistAffinity(personalizedSeedTracks);
  const moodKeywords = getMoodKeywords(timeSegment);
  const moodCopy = getMoodCopy(timeSegment);

  const scoredCandidates = buildCandidates(recentlyPlayed, likedSongs, shelves, exploreShelves)
    .map((candidate) => {
      let score = 0;
      const shelfTitle = normalizeText(candidate.shelfTitle);

      if (candidate.source === "recent") score += 80 - candidate.position * 6;
      if (candidate.source === "liked") score += 52 - candidate.position * 4;
      if (candidate.source === "home") score += 28 - candidate.position * 2;
      if (candidate.source === "explore") score += 22 - candidate.position * 2;
      if (candidate.track.videoId === recentAnchor?.videoId) score += 18;
      if (artistAffinity && candidate.track.artist === artistAffinity) score += 20;
      if (preferredArtists.has(candidate.track.artist)) score += 8;
      if (moodKeywords.some((keyword) => shelfTitle.includes(keyword))) score += 16;

      return { ...candidate, score };
    })
    .sort((left, right) => right.score - left.score);

  const rankedTracks: YouTubeTrack[] = [];
  const seen = new Set<string>();

  for (const candidate of scoredCandidates) {
    if (seen.has(candidate.track.videoId)) continue;
    seen.add(candidate.track.videoId);
    rankedTracks.push(candidate.track);
  }

  const featuredTrack =
    rankedTracks[0] ??
    recentAnchor ??
    shelves[0]?.tracks[0] ??
    exploreShelves[0]?.tracks[0] ??
    null;

  const spotlightTracks = rankedTracks
    .filter((track) => track.videoId !== featuredTrack?.videoId)
    .slice(0, 4);

  const heroLabel = artistAffinity
    ? `${moodCopy.label} for ${artistAffinity}`
    : recentAnchor
      ? "Resume your lane"
      : moodCopy.label;
  const heroTitle = recentAnchor && artistAffinity
    ? getArtistDrivenTitle(timeSegment, artistAffinity)
    : recentAnchor
      ? `Pick up with ${recentAnchor.title}.`
      : moodCopy.title;
  const heroCopy = artistAffinity
    ? `Your start row is now weighted toward ${artistAffinity}, your recent listens, and ${moodCopy.label.toLowerCase()} shelves from the live feed.`
    : recentAnchor
      ? "Your start row now adapts to recent listens, liked songs, and the latest feed refresh so the first tap feels personal instead of generic."
      : moodCopy.copy;
  const quickPickTitle = artistAffinity
    ? `More from ${artistAffinity} and nearby lanes.`
    : recentAnchor
      ? "Keep this session moving."
      : moodCopy.quickTitle;
  const quickPickCopy = artistAffinity
    ? "Quick picks now prioritize your strongest artist streak, then widen into matching shelves from home and discovery."
    : recentAnchor
      ? "Quick picks now prioritize your recent artists first, then blend in fresh discovery from the live home and explore feeds."
      : moodCopy.quickCopy;
  const primaryButtonLabel = recentAnchor ? "Resume Featured" : moodCopy.primaryAction;
  const queueButtonLabel = recentAnchor ? "Queue Session" : moodCopy.queueAction;
  const flowFilters: Array<MusicFlowDimension | "all"> = ["all", "genre", "language", "country", "time", "artist", "category"];
  const visibleFlowFeed = flowFeed.filter((item) => activeFlowFilter === "all" || item.dimension === activeFlowFilter);

  const handlePlayFeatured = () => {
    if (!featuredTrack) return;
    playTrack(featuredTrack);
    spotlightTracks.forEach((track) => addToQueue(track));
  };

  const handleQueueSpotlight = () => {
    spotlightTracks.forEach((track) => addToQueue(track));
  };

  const playFlowFeed = (startIndex = 0) => {
    const selectedFeed = visibleFlowFeed.length > 0 ? visibleFlowFeed : flowFeed;
    const startItem = selectedFeed[startIndex];
    if (!startItem) return;

    playTrack(startItem.track);
    selectedFeed
      .filter((_, index) => index !== startIndex)
      .slice(0, 24)
      .forEach((item) => addToQueue(item.track));
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-8">
      <div className="mb-8">

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="shell-panel relative overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 sm:py-10"
        >
          {featuredTrack && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(${featuredTrack.thumbnail})` }}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,rgba(4,8,14,0.18),rgba(4,8,14,0.88)_50%,rgba(4,8,14,0.96))]" />
            </>
          )}

          <div className="relative z-10">
            <span className="premium-pill mb-4">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {heroLabel}
            </span>
            <p className="mb-3 text-fluid-sm font-medium text-white/45">{displayGreeting}</p>
            <h1 className="font-display max-w-3xl text-fluid-hero leading-[0.94] text-white">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-fluid-sm leading-6 text-white/60">
              {heroCopy}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="premium-pill">
                <ListMusic className="h-3.5 w-3.5 text-primary" />
                {shelves.length} home mixes
              </span>
              <span className="premium-pill">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                {exploreShelves.length} discovery lanes
              </span>
              {featuredTrack && (
                <span className="premium-pill">
                  <Disc3 className="h-3.5 w-3.5 text-primary" />
                  {featuredTrack.duration} spotlight
                </span>
              )}
            </div>

            {featuredTrack && (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePlayFeatured}
                  className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:opacity-95"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {primaryButtonLabel}
                </button>
                <button
                  type="button"
                  onClick={handleQueueSpotlight}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/20 hover:bg-white/8"
                >
                  <ListMusic className="h-4 w-4" />
                  {queueButtonLabel}
                </button>
                <Link
                  href="/explore"
                  className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white/70 transition hover:text-white"
                >
                  Explore all lanes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {featuredTrack && (
              <div className="mt-8 grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {[featuredTrack, ...spotlightTracks.slice(0, 2)].map((track, index) => (
                  <button
                    key={track.videoId}
                    type="button"
                    onClick={() => playTrack(track)}
                    className="shell-panel-soft flex items-center gap-3 rounded-[24px] p-3 text-left transition hover:-translate-y-0.5"
                  >
                    <TrackThumb track={track} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                        {index === 0 ? "Featured" : `Next ${index}`}
                      </p>
                      <p className="truncate pt-1 text-sm font-semibold text-white">
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-white/45">
                        {track.artist}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-white/35">
                      {track.duration}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* Quick Dial Section */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="premium-pill">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Quick Dial
            </span>
          </div>
          <p className="text-fluid-xs font-medium text-white/35 uppercase tracking-widest">
            Based on your activity
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {rankedTracks.slice(0, 8).map((track, index) => (
            <motion.button
              key={track.videoId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => playTrack(track)}
              className="flex items-center gap-3 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.07] hover:border-white/[0.1] transition-all group text-left"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                <TrackThumb track={track} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-5 w-5 fill-current text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
                  {track.title}
                </p>
                <p className="text-xs text-white/45 truncate">
                  {track.artist}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Recommended for You Section */}
      <section className="mb-10 rounded-[32px] shell-panel-soft py-6 pl-4 pr-1 sm:p-6">
        <MusicShelf
          title="Recommended for you"
          subtitle="Tuned to your taste"
          tracks={rankedTracks.slice(8, 24)}
          layout="scroll"
          maxItems={16}
        />
      </section>


      {flowFeed.length > 0 && (
        <section className="mb-8 rounded-[32px] shell-panel-soft p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="premium-pill mb-3">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Music Flow
              </span>
              <h2 className="font-display text-fluid-3xl leading-none text-white">
                A mixed stream across genre, language, artist, country, time, and category.
              </h2>
              <p className="mt-3 max-w-3xl text-fluid-sm leading-6 text-white/55">
                This is the Resso-style lane: scrollable variety first, then one-tap playback that keeps the rest of the visible feed queued behind the current song.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => playFlowFeed(0)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:opacity-95"
              >
                <Play className="h-4 w-4 fill-current" />
                Play Flow
              </button>
              <button
                type="button"
                onClick={() => {
                  const selectedFeed = visibleFlowFeed.length > 0 ? visibleFlowFeed : flowFeed;
                  selectedFeed.slice(0, 24).forEach((item) => addToQueue(item.track));
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/78 transition hover:border-white/18 hover:bg-white/[0.07]"
              >
                <ListMusic className="h-4 w-4" />
                Queue Flow
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {flowFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFlowFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  activeFlowFilter === filter
                    ? "text-[var(--color-primary)]"
                    : "bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white"
                }`}
                style={activeFlowFilter === filter ? {
                  backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                  borderColor: "color-mix(in srgb, var(--color-primary) 24%, transparent)",
                } : undefined}
              >
                {getDimensionLabel(filter)}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {(visibleFlowFeed.length > 0 ? visibleFlowFeed : flowFeed).slice(0, 12).map((item, index) => (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.02 }}
                onClick={() => playFlowFeed(index)}
                className="group relative min-h-[14rem] sm:min-h-[18rem] overflow-hidden rounded-[30px] border border-white/10 text-left transition hover:border-white/18 hover:-translate-y-0.5"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                  style={item.track.thumbnail ? { backgroundImage: `url(${item.track.thumbnail})` } : getDynamicGradientStyle(item.track.title)}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,14,0.18),rgba(4,8,14,0.58)_48%,rgba(4,8,14,0.96))]" />
                <div className="relative flex h-full flex-col justify-between p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="premium-pill">
                        <Sparkles className="h-3 w-3 text-primary" />
                        {getDimensionLabel(item.dimension)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                        {item.label}
                      </span>
                    </div>
                    <span className="rounded-full bg-white/[0.08] p-3 text-primary shadow-lg shadow-primary/10">
                      <Play className="h-4 w-4 fill-current" />
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                      {item.context}
                    </p>
                    <h3 className="mt-2 max-w-xl text-fluid-2xl font-semibold tracking-tight text-white">
                      {item.track.title}
                    </h3>
                    <p className="mt-2 text-fluid-sm text-white/58">
                      {item.track.artist} · {item.track.duration}
                    </p>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-white/62">
                      {item.hint}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {recentlyPlayed.length > 0 && (
        <div className="mb-6 rounded-[30px] shell-panel-soft py-5 pl-4 pr-1 sm:p-6">
          <MusicShelf
            title="Recently Played"
            subtitle="Pick up where you left off"
            tracks={recentlyPlayed}
            layout="scroll"
            maxItems={12}
            showMoreHref="/library"
          />
        </div>
      )}

      <div className="space-y-6">
        {shelves.map((shelf, index) => (
          <div key={`home-${index}`} className="rounded-[30px] shell-panel-soft py-5 pl-4 pr-1 sm:p-6">
            <MusicShelf
              title={shelf.title}
              subtitle={index === 0 ? "Fresh from the home feed" : undefined}
              tracks={shelf.tracks}
              layout="scroll"
              maxItems={12}
              cardSize={index === 0 ? "lg" : "md"}
            />
          </div>
        ))}
      </div>

      {exploreShelves.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2 px-1">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-fluid-xl font-bold text-white">Discovery Lanes</h2>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            {exploreShelves.map((shelf, index) => (
              <div key={`explore-${index}`} className="rounded-[30px] shell-panel-soft p-5 md:p-6">
                <MusicShelf
                  title={shelf.title}
                  tracks={shelf.tracks}
                  layout={shelf.tracks.length > 6 ? "scroll" : "list"}
                  maxItems={10}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {shelves.length === 0 && exploreShelves.length === 0 && recentlyPlayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24">
          <Disc3 className="mb-4 h-16 w-16 text-white/10" />
          <p className="text-lg font-semibold text-white/35">No music feed available</p>
          <p className="mt-1 text-sm text-white/20">
            Search for something to warm up the library.
          </p>
        </div>
      )}
    </div>
  );
}
