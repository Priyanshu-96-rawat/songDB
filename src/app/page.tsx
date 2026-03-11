import { HomeView } from "@/components/home/HomeView";
import { getCachedYTMusicExplore, getCachedYTMusicFlowFeed, getCachedYTMusicHomeFeed } from "@/lib/youtube-feed";

function getGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const [shelves, exploreShelves, flowFeed] = await Promise.all([
    getCachedYTMusicHomeFeed(),
    getCachedYTMusicExplore(),
    getCachedYTMusicFlowFeed(),
  ]);

  return (
    <HomeView
      greeting={getGreeting()}
      shelves={shelves}
      exploreShelves={exploreShelves}
      flowFeed={flowFeed}
    />
  );
}
