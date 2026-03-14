const BASE_URL = "https://musicbrainz.org/ws/2";
const HEADERS = {
    "User-Agent": "SongDB/1.0 contact@songdb.local", // Required by MusicBrainz
    "Accept": "application/json"
};

export async function searchArtistsMB(query: string) {
    try {
        const res = await fetch(
            `${BASE_URL}/artist?query=${encodeURIComponent(query)}&fmt=json`,
            { headers: HEADERS, next: { revalidate: 86400 } }
        );
        const data = await res.json();
        return data.artists || [];
    } catch (err) {
        // Silenced for production
        return [];
    }
}

export async function getArtistDiscographyMB(mbid: string) {
    try {
        const res = await fetch(
            `${BASE_URL}/release?artist=${mbid}&fmt=json&limit=100`,
            { headers: HEADERS, next: { revalidate: 86400 } }
        );
        const data = await res.json();
        return data.releases || [];
    } catch (err) {
        // Silenced for production
        return [];
    }
}

export async function getAlbumTracklistMB(releaseMbid: string) {
    try {
        const res = await fetch(
            `${BASE_URL}/recording?release=${releaseMbid}&fmt=json`,
            { headers: HEADERS, next: { revalidate: 86400 } }
        );
        const data = await res.json();
        return data.recordings || [];
    } catch (err) {
        // Silenced for production
        return [];
    }
}

export async function fetchImageFromDeezer(query: string, type: 'artist' | 'track', artistName?: string): Promise<string | null> {
    try {
        let searchQuery = query;
        if (type === 'track' && artistName) {
            searchQuery = `${query} ${artistName}`;
        }
        const res = await fetch(`https://api.deezer.com/search/${type}?q=${encodeURIComponent(searchQuery)}&limit=1`, { next: { revalidate: 86400 } });
        if (!res.ok) return null;
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            if (type === 'artist') {
                return data.data[0].picture_xl || data.data[0].picture_large || data.data[0].picture;
            } else if (type === 'track') {
                return data.data[0].album?.cover_xl || data.data[0].album?.cover_large || data.data[0].album?.cover;
            }
        }
        return null;
    } catch (e) {
        // Silenced for production
        return null;
    }
}

/**
 * iTunes Search API — No API key needed, no geo-restrictions.
 * Reliable fallback for track album art when Deezer is unavailable.
 */
export async function fetchImageFromiTunes(trackName: string, artistName?: string): Promise<string | null> {
    try {
        const query = artistName ? `${trackName} ${artistName}` : trackName;
        const res = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`,
            { next: { revalidate: 86400 } }
        );
        if (!res.ok) return null;
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            // Upscale from 100x100 to 600x600
            const artworkUrl = data.results[0].artworkUrl100;
            if (artworkUrl) {
                return artworkUrl.replace('100x100bb', '600x600bb');
            }
        }
        return null;
    } catch (e) {
        // Silenced for production
        return null;
    }
}
