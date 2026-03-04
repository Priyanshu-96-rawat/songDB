// We don't have a specific API key for YouTube in the prompt, so I will add a placeholder or use an alternative if needed.
// YouTube Data API v3 requires an API key. 
export async function fetchYouTubeEmbed(query: string) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.warn("YouTube API Key missing");
        return null;
    }

    try {
        const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}&maxResults=1`,
            { next: { revalidate: 86400 } }
        );
        const data = await res.json();
        const videoId = data.items?.[0]?.id?.videoId;
        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
        return null;
    } catch (error) {
        console.error("YouTube fetch error:", error);
        return null;
    }
}
