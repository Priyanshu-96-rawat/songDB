import { unstable_cache } from "next/cache";
import { getYTMusicExplore, getYTMusicFlowFeed, getYTMusicHomeFeed } from "@/lib/youtube-stream";

const HOME_FEED_REVALIDATE_SECONDS = 15 * 60;
const EXPLORE_FEED_REVALIDATE_SECONDS = 15 * 60;
const FLOW_FEED_REVALIDATE_SECONDS = 15 * 60;

export const getCachedYTMusicHomeFeed = unstable_cache(
  async () => getYTMusicHomeFeed(),
  ["ytmusic-home-feed-v2"],
  { revalidate: HOME_FEED_REVALIDATE_SECONDS }
);

export const getCachedYTMusicExplore = unstable_cache(
  async () => getYTMusicExplore(),
  ["ytmusic-explore-feed-v2"],
  { revalidate: EXPLORE_FEED_REVALIDATE_SECONDS }
);

export const getCachedYTMusicFlowFeed = unstable_cache(
  async () => getYTMusicFlowFeed(),
  ["ytmusic-flow-feed-v1"],
  { revalidate: FLOW_FEED_REVALIDATE_SECONDS }
);
