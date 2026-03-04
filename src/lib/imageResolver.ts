import { extractLastFmImage, type LastFmImageEntry } from './lastfm';
import { fetchImageFromDeezer, fetchImageFromiTunes } from './musicbrainz';

/**
 * Unified image resolver with 3-tier fallback:
 * Last.fm image array → iTunes → Deezer
 * 
 * Use this everywhere instead of calling each individually.
 */
export async function resolveTrackImage(
    trackName: string,
    artistName: string,
    lastfmImages?: LastFmImageEntry[]
): Promise<string | null> {
    // 1. Try Last.fm image array first (free, already fetched)
    if (lastfmImages) {
        const lfm = extractLastFmImage(lastfmImages, 'large');
        if (lfm) return lfm;
    }

    // 2. iTunes (fastest, no rate limits)
    try {
        const itunes = await fetchImageFromiTunes(trackName, artistName);
        if (itunes) return itunes;
    } catch { }

    // 3. Deezer (slower but sometimes has what iTunes doesn't)
    try {
        const deezer = await fetchImageFromDeezer(trackName, 'track', artistName);
        if (deezer) return deezer;
    } catch { }

    return null;
}

export async function resolveArtistImage(
    artistName: string,
    lastfmImages?: LastFmImageEntry[]
): Promise<string | null> {
    // 1. Last.fm
    if (lastfmImages) {
        const lfm = extractLastFmImage(lastfmImages, 'extralarge');
        if (lfm) return lfm;
    }

    // 2. Deezer (best for artist portraits)
    try {
        const deezer = await fetchImageFromDeezer(artistName, 'artist');
        if (deezer) return deezer;
    } catch { }

    // 3. iTunes album art as fallback for artist
    try {
        const albumRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&limit=1`,
            { next: { revalidate: 86400 } }
        );
        const albumData = await albumRes.json();
        if (albumData.results?.[0]?.artworkUrl100) {
            return albumData.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
    } catch { }

    return null;
}

/**
 * Batch resolve images with concurrency limit to avoid hammering APIs.
 * This is MUCH faster than sequential Promise.all for 50 items.
 */
export async function batchResolveTrackImages<T extends { name: string; artist: string; image?: LastFmImageEntry[] }>(
    tracks: T[],
    concurrency = 8
): Promise<(string | null)[]> {
    const results: (string | null)[] = new Array(tracks.length).fill(null);
    let index = 0;

    async function worker() {
        while (index < tracks.length) {
            const i = index++;
            const track = tracks[i];
            results[i] = await resolveTrackImage(
                track.name,
                track.artist,
                track.image
            );
        }
    }

    // Spawn `concurrency` workers
    const workers = Array.from({ length: Math.min(concurrency, tracks.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

export async function batchResolveArtistImages<T extends { name: string; image?: LastFmImageEntry[] }>(
    artists: T[],
    concurrency = 8
): Promise<(string | null)[]> {
    const results: (string | null)[] = new Array(artists.length).fill(null);
    let index = 0;

    async function worker() {
        while (index < artists.length) {
            const i = index++;
            const artist = artists[i];
            results[i] = await resolveArtistImage(artist.name, artist.image);
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, artists.length) }, () => worker());
    await Promise.all(workers);
    return results;
}
