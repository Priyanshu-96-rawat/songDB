import Parser from 'rss-parser';

type CustomItem = {
    title?: string;
    link?: string;
    contentSnippet?: string;
    isoDate?: string;
    pubDate?: string;
    content?: string;
    enclosure?: { url?: string; type?: string };
    'media:content'?: { $?: { url?: string } };
    'media:thumbnail'?: { $?: { url?: string } };
};

const parser = new Parser<any, CustomItem>({
    customFields: {
        item: [
            ['media:content', 'media:content'],
            ['media:thumbnail', 'media:thumbnail'],
            ['enclosure', 'enclosure'],
        ],
    },
});

// Multiple music news RSS feeds (URLs updated to current endpoints)
const RSS_FEEDS = [
    { url: 'https://www.billboard.com/c/music/music-news/feed/', source: 'Billboard' },
    { url: 'https://pitchfork.com/feed/feed-news/rss', source: 'Pitchfork' },
    { url: 'https://www.nme.com/feed', source: 'NME' },
    { url: 'https://consequence.net/category/music/feed/', source: 'Consequence' },
];

function extractImage(item: CustomItem): string | null {
    // 1. media:content
    const mc = (item as any)['media:content'];
    if (mc?.$?.url) return mc.$.url;

    // 2. media:thumbnail
    const mt = (item as any)['media:thumbnail'];
    if (mt?.$?.url) return mt.$.url;

    // 3. enclosure
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
        return item.enclosure.url;
    }

    // 4. scrape <img src="..."> from content or summary
    const html = (item as any).content || (item as any)['content:encoded'] || (item as any).summary || '';
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) return imgMatch[1];

    return null;
}

export async function fetchRssNews(maxPerFeed = 8) {
    const allItems: any[] = [];

    await Promise.allSettled(
        RSS_FEEDS.map(async ({ url, source }) => {
            try {
                const feed = await parser.parseURL(url);
                const items = feed.items.slice(0, maxPerFeed).map((item: CustomItem) => ({
                    title: item.title || 'Untitled',
                    description: item.contentSnippet || '',
                    url: item.link || '#',
                    urlToImage: extractImage(item),
                    publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
                    source: { name: source },
                }));
                allItems.push(...items);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                const isExpectedFailure =
                    msg.includes('404') ||
                    msg.includes('Feed not recognized') ||
                    msg.includes('Attribute without value') ||
                    (err as { statusCode?: number }).statusCode === 404;
                if (!isExpectedFailure) console.warn(`RSS error for ${source}:`, msg);
            }
        })
    );

    // Sort by date, newest first
    return allItems.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
}
