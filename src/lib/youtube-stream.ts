
import Innertube from 'youtubei.js';
import { createEstimatedLyrics, createUnsyncedLyrics, type TrackLyrics } from '@/lib/lyrics';
import { resolveCaptionTranscript } from '@/lib/yt-dlp';

// ─── Types ───────────────────────────────────────────────────────────
export interface YouTubeSearchResult {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    durationSeconds: number;
}

export interface YouTubeMusicTrack {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    durationSeconds: number;
    album?: string;
    albumId?: string;
    artistId?: string;
    isExplicit?: boolean;
}

export interface YouTubeMusicArtist {
    artistId: string;
    name: string;
    thumbnail: string;
    subscribers?: string;
}

export interface YouTubeMusicAlbum {
    albumId: string;
    title: string;
    artist: string;
    thumbnail: string;
    year?: string;
    trackCount?: number;
}

export interface YouTubeMusicPlaylist {
    playlistId: string;
    title: string;
    thumbnail: string;
    trackCount?: number;
    author?: string;
}

export type MusicFlowDimension = 'genre' | 'language' | 'country' | 'time' | 'artist' | 'category';

export interface YouTubeMusicFlowItem {
    id: string;
    dimension: MusicFlowDimension;
    label: string;
    context: string;
    hint: string;
    track: YouTubeMusicTrack;
}

// ─── Singleton Client ────────────────────────────────────────────────
let innertubeClient: Innertube | null = null;

async function getClient(): Promise<Innertube> {
    if (!innertubeClient) {
        innertubeClient = await Innertube.create({
            lang: 'en',
            location: 'US',
            retrieve_player: false,
        });
    }
    return innertubeClient;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function toStr(obj: unknown): string {
    if (typeof obj === 'string') return obj;
    if (obj && typeof obj === 'object') {
        const o = obj as Record<string, unknown>;
        if (typeof o.text === 'string') return o.text;
        if (typeof o.toString === 'function') {
            const s = o.toString();
            if (s !== '[object Object]') return s;
        }
    }
    return '';
}

function bestThumb(item: Record<string, unknown>, fallbackId?: string): string {
    // Direct thumbnails array (regular search results)
    const thumbs = item.thumbnails as Array<{ url: string; width?: number }> | undefined;
    if (thumbs && thumbs.length > 0) {
        return thumbs[thumbs.length - 1].url;
    }
    // Nested thumbnail object
    const thumb = item.thumbnail as Record<string, unknown> | undefined;
    if (thumb) {
        const inner = thumb.contents as Array<{ url: string }> | undefined;
        if (inner && inner.length > 0) return inner[inner.length - 1].url;
        if (typeof thumb.url === 'string') return thumb.url;
        // Sometimes thumbnails are nested deeper
        const innerThumbs = thumb.thumbnails as Array<{ url: string }> | undefined;
        if (innerThumbs && innerThumbs.length > 0) return innerThumbs[innerThumbs.length - 1].url;
    }
    if (fallbackId) return `https://i.ytimg.com/vi/${fallbackId}/hqdefault.jpg`;
    return '';
}

function getDur(item: Record<string, unknown>): { text: string; seconds: number } {
    const d = item.duration as { text?: string; seconds?: number } | undefined;
    if (d) return { text: d.text ?? '0:00', seconds: d.seconds ?? 0 };
    return { text: '0:00', seconds: 0 };
}

function parseDurationToSeconds(duration: unknown): number {
    const durationText = toStr(duration);
    if (!durationText) return 0;

    if (!duration) return 0;

    const parts = durationText
        .split(':')
        .map((part) => Number.parseInt(part, 10))
        .filter((part) => !Number.isNaN(part));

    if (parts.length === 0) return 0;

    return parts.reduce((total, part) => total * 60 + part, 0);
}

function getMusicThumbnail(item: Record<string, unknown>, fallbackId?: string): string {
    const thumbnail = item.thumbnail as { contents?: Array<{ url?: string }> } | undefined;
    const thumbs = thumbnail?.contents
        ?.map((entry) => entry.url)
        .filter((url): url is string => Boolean(url));

    if (thumbs && thumbs.length > 0) {
        return thumbs[0];
    }

    return bestThumb(item, fallbackId);
}

function getItemTitle(item: Record<string, unknown>): string {
    return toStr(item.title ?? item.name ?? (item.flex_columns as Array<Record<string, unknown>> | undefined)?.[0]?.title);
}

function getItemSubtitle(item: Record<string, unknown>): string {
    return toStr(item.subtitle ?? (item.flex_columns as Array<Record<string, unknown>> | undefined)?.[1]?.title);
}

function getItemId(item: Record<string, unknown>): string {
    const endpoint = item.endpoint as { payload?: { videoId?: string; browseId?: string } } | undefined;
    const primaryColumn = (item.flex_columns as Array<Record<string, unknown>> | undefined)?.[0];
    const primaryTitle = primaryColumn?.title as { endpoint?: { payload?: { videoId?: string; browseId?: string } } } | undefined;

    return (item.id as string) ?? primaryTitle?.endpoint?.payload?.videoId ?? primaryTitle?.endpoint?.payload?.browseId ?? endpoint?.payload?.videoId ?? endpoint?.payload?.browseId ?? '';
}

function mapMusicSearchTrack(item: Record<string, unknown>): YouTubeMusicTrack | null {
    const videoId = getItemId(item);
    if (!videoId) return null;

    const subtitle = getItemSubtitle(item);
    const parts = subtitle.split(' • ').map((part) => part.trim()).filter(Boolean);
    const duration = toStr(item.duration) || parts.at(-1) || '0:00';

    return {
        videoId,
        title: getItemTitle(item),
        artist: toStr(item.author) || parts[0] || 'Unknown',
        thumbnail: getMusicThumbnail(item, videoId),
        duration,
        durationSeconds: parseDurationToSeconds(duration),
        album: parts.length > 2 ? parts[1] : undefined,
        albumId: parts.length > 2 ? parts[1] : undefined,
    };
}

function mapMusicSearchArtist(item: Record<string, unknown>): YouTubeMusicArtist | null {
    const artistId = getItemId(item);
    if (!artistId) return null;

    const subtitle = getItemSubtitle(item);
    const subscribers = subtitle
        .split(' • ')
        .map((part) => part.trim())
        .find((part) => part !== 'Artist');

    return {
        artistId,
        name: getItemTitle(item),
        thumbnail: getMusicThumbnail(item, artistId),
        subscribers,
    };
}

function mapMusicSearchAlbum(item: Record<string, unknown>): YouTubeMusicAlbum | null {
    const albumId = getItemId(item);
    if (!albumId) return null;

    const subtitle = getItemSubtitle(item);
    const parts = subtitle.split(' • ').map((part) => part.trim()).filter(Boolean);

    return {
        albumId,
        title: getItemTitle(item),
        artist: (item.author as string) || parts[1] || 'Unknown',
        thumbnail: getMusicThumbnail(item, albumId),
        year: (item.year as string) || parts[2],
    };
}

function mapMusicSearchPlaylist(item: Record<string, unknown>): YouTubeMusicPlaylist | null {
    const playlistId = getItemId(item);
    if (!playlistId) return null;

    const subtitle = getItemSubtitle(item);
    const parts = subtitle.split(' • ').map((part) => part.trim()).filter(Boolean);
    const rawTrackCount = Number.parseInt(String(item.item_count ?? ''), 10);

    return {
        playlistId,
        title: getItemTitle(item),
        thumbnail: getMusicThumbnail(item, playlistId),
        author: (item.author as string) || parts[0],
        trackCount: Number.isNaN(rawTrackCount) ? undefined : rawTrackCount,
    };
}

async function searchMusicSection(
    query: string,
    type: 'song' | 'video' | 'artist' | 'album' | 'playlist',
    maxResults: number
) {
    const yt = await getClient();
    const results = await yt.music.search(query, { type });
    const shelves = (results as { contents?: Array<{ contents?: unknown[] }> }).contents ?? [];
    const firstShelf = shelves[0];
    const items = (firstShelf?.contents ?? []) as Array<Record<string, unknown>>;
    return items.slice(0, maxResults);
}

function dedupeTracks(tracks: YouTubeMusicTrack[]) {
    const seen = new Set<string>();
    return tracks.filter((track) => {
        const key = track.videoId || `${track.title}-${track.artist}`.toLowerCase();
        if (!key || seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

async function buildCuratedSongShelf(title: string, query: string, maxResults = 10) {
    const songResults = (await searchMusicSection(query, 'song', maxResults * 3))
        .map(mapMusicSearchTrack)
        .filter((item): item is YouTubeMusicTrack => Boolean(item))
        .filter((track) => track.durationSeconds >= 90 && track.durationSeconds <= 480);

    const dedupedSongs = dedupeTracks(songResults);
    if (dedupedSongs.length >= maxResults) {
        return { title, tracks: dedupedSongs.slice(0, maxResults) };
    }

    const fallbackVideos = (await searchMusicSection(query, 'video', maxResults * 2))
        .map(mapMusicSearchTrack)
        .filter((item): item is YouTubeMusicTrack => Boolean(item))
        .filter((track) => track.durationSeconds >= 90 && track.durationSeconds <= 480);

    return {
        title,
        tracks: dedupeTracks([...dedupedSongs, ...fallbackVideos]).slice(0, maxResults),
    };
}

type FlowQuery = {
    dimension: MusicFlowDimension;
    label: string;
    context: string;
    hint: string;
    query: string;
};

const FLOW_QUERY_GROUPS: Record<MusicFlowDimension, FlowQuery[]> = {
    genre: [
        { dimension: 'genre', label: 'Afrobeats Rush', context: 'Genre', hint: 'Warm percussion and high-motion hooks.', query: 'afrobeats essentials songs' },
        { dimension: 'genre', label: 'Indie Nightfall', context: 'Genre', hint: 'Alternative and indie cuts for slower stretches.', query: 'indie alternative essentials songs' },
        { dimension: 'genre', label: 'EDM Lift', context: 'Genre', hint: 'Festival-weight dance tracks and club momentum.', query: 'electronic dance floor hits songs' },
        { dimension: 'genre', label: 'Desi Rap', context: 'Genre', hint: 'Punjabi and Hindi rap rotation.', query: 'desi rap hits songs' },
    ],
    language: [
        { dimension: 'language', label: 'Hindi Pulse', context: 'Language', hint: 'Current Hindi songs with strong replay value.', query: 'latest hindi songs' },
        { dimension: 'language', label: 'Tamil Heat', context: 'Language', hint: 'Tamil tracks built for energy and hooks.', query: 'tamil hits songs' },
        { dimension: 'language', label: 'K-Pop Flash', context: 'Language', hint: 'Korean pop tracks with tighter rhythm and pop shine.', query: 'k-pop hits songs' },
        { dimension: 'language', label: 'Latin Motion', context: 'Language', hint: 'Spanish-language pop and reggaeton crossover.', query: 'latin pop reggaeton songs' },
    ],
    country: [
        { dimension: 'country', label: 'India Now', context: 'Country', hint: 'Fast-moving tracks trending across India.', query: 'india top songs' },
        { dimension: 'country', label: 'US Rotation', context: 'Country', hint: 'Current US-facing chart and crossover picks.', query: 'usa top songs' },
        { dimension: 'country', label: 'Brazil Bounce', context: 'Country', hint: 'Brazilian pop and funk-friendly energy.', query: 'brazil pop hits songs' },
        { dimension: 'country', label: 'Nigeria Select', context: 'Country', hint: 'Afropop and Nigerian chart movement.', query: 'nigeria afrobeats chart songs' },
    ],
    time: [
        { dimension: 'time', label: 'Morning Start', context: 'Time', hint: 'Lighter, cleaner songs for the first hour.', query: 'morning chill songs' },
        { dimension: 'time', label: 'Golden Hour', context: 'Time', hint: 'Drive-ready tracks for evening transition.', query: 'sunset drive songs' },
        { dimension: 'time', label: 'After Hours', context: 'Time', hint: 'Night listening with slower edges and mood.', query: 'late night songs' },
        { dimension: 'time', label: 'Workout Run', context: 'Time', hint: 'Peak-energy tracks for movement and pace.', query: 'workout songs playlist songs' },
    ],
    artist: [
        { dimension: 'artist', label: 'Weeknd Orbit', context: 'Artist', hint: 'Polished pop darkness and replay hooks.', query: 'the weeknd essentials songs' },
        { dimension: 'artist', label: 'Arijit Signal', context: 'Artist', hint: 'High-familiarity romantic and melodic leads.', query: 'arijit singh hits songs' },
        { dimension: 'artist', label: 'Bad Bunny Lift', context: 'Artist', hint: 'Latin crossover movement and tempo.', query: 'bad bunny essentials songs' },
        { dimension: 'artist', label: 'Dua Energy', context: 'Artist', hint: 'Crisp dance-pop pressure from a known anchor.', query: 'dua lipa essentials songs' },
    ],
    category: [
        { dimension: 'category', label: 'Viral Right Now', context: 'Category', hint: 'Short-form-friendly songs currently spreading fastest.', query: 'viral chart toppers songs' },
        { dimension: 'category', label: 'New Release Wave', context: 'Category', hint: 'Recent songs with high first-play value.', query: 'new music friday songs' },
        { dimension: 'category', label: 'Drive Core', context: 'Category', hint: 'Road-trip friendly cuts with stronger pacing.', query: 'night drive songs' },
        { dimension: 'category', label: 'Lo-Fi Thread', context: 'Category', hint: 'Soft loopable songs for work and focus.', query: 'lofi chill songs' },
    ],
};

function hashSeed(value: string) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
}

function pickRotatingQueries() {
    const bucket = new Date().toISOString().slice(0, 13);
    const dimensions = Object.keys(FLOW_QUERY_GROUPS) as MusicFlowDimension[];
    const selected: FlowQuery[] = [];

    for (const dimension of dimensions) {
        const candidates = FLOW_QUERY_GROUPS[dimension];
        const startIndex = hashSeed(`${bucket}-${dimension}`) % candidates.length;
        const takeCount = dimension === 'genre' || dimension === 'language' ? 2 : 1;

        for (let offset = 0; offset < takeCount; offset += 1) {
            selected.push(candidates[(startIndex + offset) % candidates.length]);
        }
    }

    return selected;
}

export async function getYTMusicFlowFeed(): Promise<YouTubeMusicFlowItem[]> {
    const selectedQueries = pickRotatingQueries();
    const shelves = await Promise.allSettled(
        selectedQueries.map(async (query) => {
            const shelf = await buildCuratedSongShelf(query.label, query.query, 3);
            return shelf.tracks.map((track, index) => ({
                id: `${query.dimension}-${track.videoId}-${index}`,
                dimension: query.dimension,
                label: query.label,
                context: query.context,
                hint: query.hint,
                track,
            }));
        })
    );

    const items: YouTubeMusicFlowItem[] = [];
    const seen = new Set<string>();

    for (const result of shelves) {
        if (result.status !== 'fulfilled') continue;
        for (const item of result.value) {
            if (seen.has(item.track.videoId)) continue;
            seen.add(item.track.videoId);
            items.push(item);
        }
    }

    return items;
}

// ─── Search (uses reliable yt.search, works 100%) ────────────────────
export async function searchYouTubeMusic(
    query: string,
    filter?: 'songs' | 'videos' | 'artists' | 'albums' | 'playlists',
    maxResults: number = 20
): Promise<{
    tracks: YouTubeMusicTrack[];
    artists: YouTubeMusicArtist[];
    albums: YouTubeMusicAlbum[];
    playlists: YouTubeMusicPlaylist[];
}> {
    const tracks: YouTubeMusicTrack[] = [];
    const artists: YouTubeMusicArtist[] = [];
    const albums: YouTubeMusicAlbum[] = [];
    const playlists: YouTubeMusicPlaylist[] = [];

    try {
        const activeFilters = filter
            ? [filter]
            : ['songs', 'videos', 'artists', 'albums', 'playlists'];

        if (activeFilters.includes('songs')) {
            tracks.push(
                ...(await searchMusicSection(query, 'song', maxResults))
                    .map(mapMusicSearchTrack)
                    .filter((item): item is YouTubeMusicTrack => Boolean(item))
            );
        }

        if (activeFilters.includes('videos')) {
            tracks.push(
                ...(await searchMusicSection(query, 'video', maxResults))
                    .map(mapMusicSearchTrack)
                    .filter((item): item is YouTubeMusicTrack => Boolean(item))
            );
        }

        if (activeFilters.includes('artists')) {
            artists.push(
                ...(await searchMusicSection(query, 'artist', maxResults))
                    .map(mapMusicSearchArtist)
                    .filter((item): item is YouTubeMusicArtist => Boolean(item))
            );
        }

        if (activeFilters.includes('albums')) {
            albums.push(
                ...(await searchMusicSection(query, 'album', maxResults))
                    .map(mapMusicSearchAlbum)
                    .filter((item): item is YouTubeMusicAlbum => Boolean(item))
            );
        }

        if (activeFilters.includes('playlists')) {
            playlists.push(
                ...(await searchMusicSection(query, 'playlist', maxResults))
                    .map(mapMusicSearchPlaylist)
                    .filter((item): item is YouTubeMusicPlaylist => Boolean(item))
            );
        }
    } catch (err) {
        console.error('[search] Error:', err);
    }

    return { tracks, artists, albums, playlists };
}

// Legacy search alias
export async function searchYouTube(query: string, maxResults = 20): Promise<YouTubeSearchResult[]> {
    const { tracks } = await searchYouTubeMusic(query, 'songs', maxResults);
    return tracks.map(t => ({
        videoId: t.videoId,
        title: t.title,
        artist: t.artist,
        thumbnail: t.thumbnail,
        duration: t.duration,
        durationSeconds: t.durationSeconds,
    }));
}

// ─── Search Suggestions ──────────────────────────────────────────────
export async function getMusicSearchSuggestions(query: string): Promise<string[]> {
    const yt = await getClient();
    try {
        // yt.getSearchSuggestions returns string[] directly
        const suggestions = await yt.getSearchSuggestions(query);
        return Array.isArray(suggestions) ? suggestions.slice(0, 10) : [];
    } catch (err) {
        console.error('[suggestions] Error:', err);
        return [];
    }
}

// ─── Trending / Home Feed ────────────────────────────────────────────
export async function getYTMusicHomeFeed(): Promise<Array<{ title: string; tracks: YouTubeMusicTrack[] }>> {
    const shelves: Array<{ title: string; tracks: YouTubeMusicTrack[] }> = [];

    const categories = [
        { title: 'Trending Now', query: 'viral chart toppers' },
        { title: 'Pop Hits', query: 'essential pop anthems' },
        { title: 'Bollywood Hits', query: 'latest hindi songs' },
        { title: 'Hip Hop', query: 'rap rotation essentials' },
        { title: 'Chill Vibes', query: 'indie chill late night songs' },
    ];

    const results = await Promise.allSettled(
        categories.map((category) => buildCuratedSongShelf(category.title, category.query))
    );

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.tracks.length > 0) {
            shelves.push(result.value);
        }
    }

    return shelves;
}

// ─── Explore (Charts / New Releases) ─────────────────────────────────
export async function getYTMusicExplore(): Promise<Array<{ title: string; tracks: YouTubeMusicTrack[] }>> {
    const shelves: Array<{ title: string; tracks: YouTubeMusicTrack[] }> = [];

    const categories = [
        { title: 'Global Top Charts', query: 'global top songs' },
        { title: 'New Releases', query: 'new music friday songs' },
        { title: 'EDM & Dance', query: 'electronic dance floor hits' },
        { title: 'Indie & Alternative', query: 'indie alternative essentials' },
        { title: 'R&B Soul', query: 'modern r&b soul essentials' },
    ];

    const results = await Promise.allSettled(
        categories.map((category) => buildCuratedSongShelf(category.title, category.query))
    );

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.tracks.length > 0) {
            shelves.push(result.value);
        }
    }

    return shelves;
}

// ─── Lyrics ──────────────────────────────────────────────────────────
export async function getYTMusicLyrics(videoId: string, durationSeconds?: number): Promise<TrackLyrics | null> {
    let captionLyrics: TrackLyrics | null = null;

    try {
        captionLyrics = await resolveCaptionTranscript(videoId, ['en', 'en-US', 'en-GB', 'hi', 'hi-IN']);
        if (captionLyrics?.synced) {
            return captionLyrics;
        }
    } catch (err) {
        console.error('[lyrics-fallback] Error:', err);
    }

    const yt = await getClient();
    try {
        const lyrics = await yt.music.getLyrics(videoId);
        if (!lyrics) return null;
        const raw = lyrics as unknown as Record<string, unknown>;
        const desc = raw.description ?? raw.text;
        const officialLyrics = toStr(desc);
        if (officialLyrics) {
            if (durationSeconds && durationSeconds > 0) {
                const estimatedLyrics = createEstimatedLyrics(officialLyrics, durationSeconds, 'official');
                if (estimatedLyrics) {
                    return estimatedLyrics;
                }
            }
            return createUnsyncedLyrics(officialLyrics, 'official');
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (!message.toLowerCase().includes('lyrics not available')) {
            console.error('[lyrics] Error:', err);
        }
    }

    return captionLyrics;
}

// ─── Up Next / Radio ─────────────────────────────────────────────────
export async function getYTMusicUpNext(videoId: string, automix = true): Promise<YouTubeMusicTrack[]> {
    const yt = await getClient();
    try {
        const upNext = await yt.music.getUpNext(videoId, automix) as unknown as Record<string, unknown>;
        const tracks: YouTubeMusicTrack[] = [];
        const contents = (upNext?.contents ?? upNext?.items ?? []) as Array<Record<string, unknown>>;

        for (const raw of contents) {
            const item = raw as Record<string, unknown>;
            const id = (item.video_id as string) ?? (item.id as string) ?? '';
            if (!id || id === videoId) continue;
            const dur = getDur(item);
            tracks.push({
                videoId: id,
                title: toStr(item.title ?? item.name),
                artist: toStr(item.author ?? item.artists ?? item.subtitle),
                thumbnail: bestThumb(item, id),
                duration: dur.text,
                durationSeconds: dur.seconds,
            });
        }

        // Fallback: if we got nothing, search for related videos
        if (tracks.length === 0) {
            const search = await yt.search(`${videoId} mix`, { type: 'video' });
            for (const raw of (search.results ?? []).slice(0, 15)) {
                const item = raw as unknown as Record<string, unknown>;
                const vid = (item.video_id as string) ?? '';
                if (!vid || vid === videoId) continue;
                const authorObj = item.author as { name?: string } | undefined;
                const dur = getDur(item);
                tracks.push({
                    videoId: vid,
                    title: toStr(item.title),
                    artist: authorObj?.name ?? 'Unknown',
                    thumbnail: bestThumb(item, vid),
                    duration: dur.text,
                    durationSeconds: dur.seconds,
                });
            }
        }

        return tracks;
    } catch (err) {
        console.error('[upnext] Error:', err);
        return [];
    }
}

// ─── Related Tracks ──────────────────────────────────────────────────
export async function getYTMusicRelated(videoId: string): Promise<Array<{ title: string; tracks: YouTubeMusicTrack[] }>> {
    const yt = await getClient();
    try {
        const related = await yt.music.getRelated(videoId) as unknown as Record<string, unknown>;
        const shelves: Array<{ title: string; tracks: YouTubeMusicTrack[] }> = [];
        const sections = (Array.isArray(related) ? related : (related?.contents ?? related?.items ?? [related])) as Array<Record<string, unknown>>;

        for (const section of sections) {
            const raw = section as Record<string, unknown>;
            const title = toStr(raw.title ?? raw.header ?? 'Related');
            const contents = (raw.contents ?? raw.items ?? []) as Array<Record<string, unknown>>;
            const tracks: YouTubeMusicTrack[] = [];

            for (const item of contents) {
                const id = (item.video_id as string) ?? (item.id as string) ?? '';
                if (id) {
                    const dur = getDur(item);
                    tracks.push({
                        videoId: id,
                        title: toStr(item.title ?? item.name),
                        artist: toStr(item.author ?? item.subtitle),
                        thumbnail: bestThumb(item, id),
                        duration: dur.text,
                        durationSeconds: dur.seconds,
                    });
                }
            }

            if (tracks.length > 0) shelves.push({ title, tracks });
        }

        return shelves;
    } catch (err) {
        console.error('[related] Error:', err);
        return [];
    }
}

// ─── Artist Info ─────────────────────────────────────────────────────
export async function getYTMusicArtist(artistId: string) {
    const yt = await getClient();
    try {
        const artist = await yt.music.getArtist(artistId) as unknown as Record<string, unknown>;
        return artist;
    } catch (err) {
        console.error('[artist] Error:', err);
        return null;
    }
}

// ─── Album Info ──────────────────────────────────────────────────────
export async function getYTMusicAlbum(albumId: string) {
    const yt = await getClient();
    try {
        const album = await yt.music.getAlbum(albumId) as unknown as Record<string, unknown>;
        return album;
    } catch (err) {
        console.error('[album] Error:', err);
        return null;
    }
}

// ─── Playlist Info ───────────────────────────────────────────────────
export async function getYTMusicPlaylist(playlistId: string) {
    const yt = await getClient();
    try {
        const playlist = await yt.music.getPlaylist(playlistId) as unknown as Record<string, unknown>;
        return playlist;
    } catch (err) {
        console.error('[playlist] Error:', err);
        return null;
    }
}
