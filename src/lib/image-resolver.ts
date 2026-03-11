import { fetchArtistInfo, fetchSongInfo } from "./lastfm";
import { fetchImageFromDeezer } from "./musicbrainz";

interface LastFmImage {
    '#text': string;
    size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega';
}

export async function resolveArtistImage(artistName: string): Promise<string | null> {
    try {
        // 1. Try LastFM
        const lastfmData = await fetchArtistInfo(artistName);
        if (lastfmData?.image) {
            const img = lastfmData.image.find((i: LastFmImage) => i.size === 'extralarge' || i.size === 'mega');
            if (img && img['#text']) return img['#text'];
        }

        // 2. Try Deezer
        const deezerImage = await fetchImageFromDeezer(artistName, 'artist');
        if (deezerImage) return deezerImage;

        return null;
    } catch {
        return null;
    }
}

export async function resolveSongImage(trackName: string, artistName: string): Promise<string | null> {
    try {
        // 1. Try LastFM
        const lastfmData = await fetchSongInfo(artistName, trackName);
        if (lastfmData?.album?.image) {
            const img = lastfmData.album.image.find((i: LastFmImage) => i.size === 'extralarge');
            if (img && img['#text']) return img['#text'];
        }

        // 2. Try Deezer
        const deezerImage = await fetchImageFromDeezer(trackName, 'track', artistName);
        if (deezerImage) return deezerImage;

        return null;
    } catch {
        return null;
    }
}
