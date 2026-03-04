export async function fetchNewsAbout(query: string) {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
        console.warn("News API Key missing");
        return [];
    }

    try {
        const res = await fetch(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&apiKey=${apiKey}`,
            { next: { revalidate: 86400 } } // Cache for 1 day to save the 100/day limit
        );

        if (!res.ok) {
            throw new Error(`News API returned ${res.status}`);
        }

        const data = await res.json();
        return data.articles?.slice(0, 3) || [];
    } catch (error) {
        console.error("Error fetching news:", error);
        return [];
    }
}
