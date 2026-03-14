import 'server-only';
const API_KEY = process.env.LASTFM_API_KEY;
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

/** Last.fm API image entry (size + url) */
export type LastFmImageEntry = { size?: string; "#text"?: string };

/** Get ISO week number for weekly rotation */
function getISOWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
}

export async function fetchFeaturedDay() {
    if (!API_KEY) return null;
    // Fetch a larger pool, rotate based on ISO week number
    const pool = await fetchTrendingSongs(50);
    if (!pool || pool.length === 0) return null;
    const weekIndex = getISOWeekNumber() % pool.length;
    return pool[weekIndex] || pool[0];
}

export async function fetchTrendingSongs(limit = 10) {
    if (!API_KEY) return [];
    try {
        const res = await fetch(
            `${BASE_URL}?method=chart.gettoptracks&api_key=${API_KEY}&format=json&limit=${limit}`,
            { next: { revalidate: 86400 } }
        );
        const data = await res.json();
        return data.tracks?.track || [];
    } catch (err) {
        // Silenced for production
        return [];
    }
}

export async function fetchTopArtists(limit = 10) {
    if (!API_KEY) return [];
    try {
        const res = await fetch(
            `${BASE_URL}?method=chart.gettopartists&api_key=${API_KEY}&format=json&limit=${limit}`,
            { next: { revalidate: 86400 } }
        );
        const data = await res.json();
        return data.artists?.artist || [];
    } catch (err) {
        // Silenced for production
        return [];
    }
}

export async function fetchTopAlbums(limit = 10) {
    if (!API_KEY) return [];
    try {
        const res = await fetch(
            `${BASE_URL}?method=tag.gettopalbums&tag=all&api_key=${API_KEY}&format=json&limit=${limit}`,
            { next: { revalidate: 86400 } }
        );
        const data = await res.json();
        return data.albums?.album || [];
    } catch (err) {
        // Silenced for production
        return [];
    }
}

export async function fetchArtistInfo(artistName: string) {
    if (!API_KEY) return null;
    try {
        const res = await fetch(
            `${BASE_URL}?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${API_KEY}&format=json`,
            { next: { revalidate: 86400 } }
        );
        const data = await res.json();
        return data.artist || null;
    } catch (err) {
        // Silenced for production
        return null;
    }
}

export async function fetchArtistTopTracks(artistName: string, limit = 5) {
    if (!API_KEY) return [];
    try {
        const res = await fetch(
            `${BASE_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(artistName)}&api_key=${API_KEY}&format=json&limit=${limit}`,
            { next: { revalidate: 86400 } }
        );
        const data = await res.json();
        return data.toptracks?.track || [];
    } catch (err) {
        // Silenced for production
        return [];
    }
}

export async function fetchSongInfo(artistName: string, trackName: string) {
    if (!API_KEY) return null;
    try {
        const res = await fetch(
            `${BASE_URL}?method=track.getInfo&api_key=${API_KEY}&artist=${encodeURIComponent(artistName)}&track=${encodeURIComponent(trackName)}&format=json`,
            { next: { revalidate: 86400 } }
        );
        const data = await res.json();
        return data.track || null;
    } catch (err) {
        // Silenced for production
        return null;
    }
}

export async function fetchTopTags(limit = 15) {
    if (!API_KEY) return [];
    try {
        const res = await fetch(
            `${BASE_URL}?method=chart.gettoptags&api_key=${API_KEY}&format=json&limit=${limit}`,
            { next: { revalidate: 86400 } }
        );
        const data = await res.json();
        return data.tags?.tag || [];
    } catch (err) {
        // Silenced for production
        return [];
    }
}

/** 
 * Known Last.fm placeholder image hashes — these are NOT real images,
 * just their default star/silhouette placeholders.
 */
const LASTFM_PLACEHOLDER_HASHES = [
    '2a96cbd8b46e442fc41c2b86b821562f',
    'c6f59c1e5e7240a4c0d427abd71f3dbb',
    '818148bf682d429dc215c1705c0cd9f0',
];

function isLastFmPlaceholder(url: string): boolean {
    return LASTFM_PLACEHOLDER_HASHES.some(hash => url.includes(hash));
}

/** Utility: extract best available image from Last.fm image array, skipping known placeholders */
export function extractLastFmImage(images: LastFmImageEntry[] | undefined, preferredSize = 'extralarge'): string | null {
    if (!images || !Array.isArray(images)) return null;
    const sizes = [preferredSize, 'mega', 'extralarge', 'large', 'medium', 'small'];
    for (const size of sizes) {
        const img = images.find((i: LastFmImageEntry) => i.size === size);
        if (img && img['#text'] && img['#text'].trim() !== '' && !isLastFmPlaceholder(img['#text'])) {
            return img['#text'];
        }
    }
    return null;
}
