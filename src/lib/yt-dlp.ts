import Innertube from 'youtubei.js';
import { createUnsyncedLyrics, normalizeLyricText, type LyricLine, type TrackLyrics } from '@/lib/lyrics';

// ─── Types ───────────────────────────────────────────────────────────

export type ResolvedAudioStream = {
    url: string;
    mimeType: string;
    requestHeaders: Record<string, string>;
    expiresAt: number | null;
    bitrateKbps: number | null;
    audioCodec: string | null;
    container: string | null;
};

// ─── Instance Lists (rotated on failure) ─────────────────────────────

const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.in.projectsegfau.lt',
];

const INVIDIOUS_INSTANCES = [
    'https://invidious.jing.rocks',
    'https://inv.tux.digital',
    'https://invidious.nerdvpn.de',
    'https://yewtu.be',
];

let pipedIndex = 0;
let invidiousIndex = 0;

// ─── Caches ──────────────────────────────────────────────────────────

const STREAM_CACHE_TTL_MS = 8 * 60 * 1000;
const streamCache = new Map<string, { value: ResolvedAudioStream; cachedAt: number }>();

// ─── Helpers ─────────────────────────────────────────────────────────

function parseExpiresAt(url: string): number | null {
    try {
        const parsed = new URL(url);
        const expire = parsed.searchParams.get('expire');
        if (!expire) return null;
        const unixMs = Number.parseInt(expire, 10) * 1000;
        return Number.isNaN(unixMs) ? null : unixMs;
    } catch {
        return null;
    }
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            cache: 'no-store',
        });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

// ─── Strategy 1: Piped API ───────────────────────────────────────────

type PipedAudioStream = {
    url: string;
    bitrate: number;
    codec: string;
    format: string;
    mimeType: string;
    quality: string;
    videoOnly: boolean;
};

async function tryPiped(videoId: string): Promise<ResolvedAudioStream | null> {
    for (let attempt = 0; attempt < PIPED_INSTANCES.length; attempt++) {
        const instance = PIPED_INSTANCES[(pipedIndex + attempt) % PIPED_INSTANCES.length];
        const url = `${instance}/streams/${videoId}`;
        try {
            console.log(`[stream] Trying Piped: ${instance}`);
            const res = await fetchWithTimeout(url);
            if (!res.ok) continue;

            const data = await res.json() as { audioStreams?: PipedAudioStream[] };
            const streams = (data.audioStreams ?? []).filter(
                (s) => !s.videoOnly && s.url
            );

            if (streams.length === 0) continue;

            // Pick highest bitrate
            streams.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
            const best = streams[0];

            // Rotate to next instance for load balancing
            pipedIndex = (pipedIndex + attempt + 1) % PIPED_INSTANCES.length;

            const mimeBase = best.mimeType?.split(';')[0] ?? `audio/${(best.format ?? 'webm').toLowerCase()}`;
            return {
                url: best.url,
                mimeType: mimeBase,
                requestHeaders: {},
                expiresAt: parseExpiresAt(best.url),
                bitrateKbps: best.bitrate > 0 ? Math.round(best.bitrate / 1000) : null,
                audioCodec: best.codec ?? null,
                container: (best.format ?? 'webm').toLowerCase(),
            };
        } catch (err) {
            console.warn(`[stream] Piped ${instance} failed:`, err instanceof Error ? err.message : err);
        }
    }
    return null;
}

// ─── Strategy 2: Invidious API ───────────────────────────────────────

type InvidiousFormat = {
    url: string;
    type: string;
    bitrate: string;
    encoding: string;
    itag: string;
    container: string;
    audioQuality?: string;
    audioSampleRate?: number;
    audioChannels?: number;
};

async function tryInvidious(videoId: string): Promise<ResolvedAudioStream | null> {
    for (let attempt = 0; attempt < INVIDIOUS_INSTANCES.length; attempt++) {
        const instance = INVIDIOUS_INSTANCES[(invidiousIndex + attempt) % INVIDIOUS_INSTANCES.length];
        const url = `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`;
        try {
            console.log(`[stream] Trying Invidious: ${instance}`);
            const res = await fetchWithTimeout(url);
            if (!res.ok) continue;

            const data = await res.json() as { adaptiveFormats?: InvidiousFormat[] };
            const audioFormats = (data.adaptiveFormats ?? []).filter(
                (f) => f.type?.startsWith('audio') && f.url
            );

            if (audioFormats.length === 0) continue;

            // Score by bitrate (string → number)
            audioFormats.sort((a, b) => {
                const bitrateA = Number.parseInt(a.bitrate ?? '0', 10);
                const bitrateB = Number.parseInt(b.bitrate ?? '0', 10);
                return bitrateB - bitrateA;
            });
            const best = audioFormats[0];

            invidiousIndex = (invidiousIndex + attempt + 1) % INVIDIOUS_INSTANCES.length;

            const mimeBase = best.type?.split(';')[0] ?? 'audio/webm';
            const codecMatch = best.type?.match(/codecs="?([^"]*)"?/);
            const codec = codecMatch?.[1] ?? best.encoding ?? null;
            const container = best.container ?? mimeBase.split('/')[1] ?? 'webm';

            return {
                url: best.url,
                mimeType: mimeBase,
                requestHeaders: {},
                expiresAt: parseExpiresAt(best.url),
                bitrateKbps: best.bitrate ? Math.round(Number.parseInt(best.bitrate, 10) / 1000) : null,
                audioCodec: codec,
                container,
            };
        } catch (err) {
            console.warn(`[stream] Invidious ${instance} failed:`, err instanceof Error ? err.message : err);
        }
    }
    return null;
}

// ─── Strategy 3: youtubei.js (last resort) ───────────────────────────

let playerClient: Innertube | null = null;

function getYouTubeCookies(): string | undefined {
    const raw = process.env.YT_COOKIES;
    if (!raw) return undefined;

    if (raw.includes('\t')) {
        const pairs: string[] = [];
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const fields = trimmed.split('\t');
            if (fields.length >= 7) {
                const name = fields[5];
                const value = fields[6];
                if (name && value) pairs.push(`${name}=${value}`);
            }
        }
        if (pairs.length > 0) return pairs.join('; ');
    }

    return raw;
}

async function getPlayerClient(): Promise<Innertube> {
    if (!playerClient) {
        const cookies = getYouTubeCookies();
        const options: Parameters<typeof Innertube.create>[0] = {
            lang: 'en',
            location: 'US',
            retrieve_player: true,
            generate_session_locally: true,
        };

        if (cookies) {
            (options as Record<string, unknown>).cookie = cookies;
            console.log('[stream] youtubei.js initialized WITH cookies');
        }

        playerClient = await Innertube.create(options);
    }
    return playerClient;
}

async function tryYoutubeiJs(videoId: string): Promise<ResolvedAudioStream | null> {
    try {
        console.log('[stream] Trying youtubei.js (last resort)');
        const yt = await getPlayerClient();
        const info = await yt.getBasicInfo(videoId);

        const streamingData = info.streaming_data;
        if (!streamingData) {
            playerClient = null;
            return null;
        }

        const adaptiveFormats = streamingData.adaptive_formats ?? [];
        type ScoredFormat = {
            url: string; mimeType: string; bitrate: number;
            codec: string; container: string; sampleRate: number; channels: number;
        };
        const audioFormats: ScoredFormat[] = [];

        for (const fmt of adaptiveFormats) {
            if (fmt.has_video || !fmt.has_audio) continue;
            const fmtRaw = fmt as unknown as Record<string, unknown>;
            const url = fmtRaw.url as string | undefined;
            if (!url) continue;

            const rawMime = (fmtRaw.mime_type as string) ?? 'audio/webm; codecs="opus"';
            const mimeBase = rawMime.split(';')[0] ?? 'audio/webm';
            const codecMatch = rawMime.match(/codecs="?([^"]*)"?/);
            const codec = codecMatch?.[1] ?? 'unknown';

            audioFormats.push({
                url, mimeType: mimeBase,
                bitrate: (fmtRaw.bitrate as number) ?? (fmtRaw.average_bitrate as number) ?? 0,
                codec, container: mimeBase.split('/')[1] ?? 'webm',
                sampleRate: Number.parseInt(String(fmtRaw.audio_sample_rate ?? '0'), 10),
                channels: (fmtRaw.audio_channels as number) ?? 2,
            });
        }

        if (audioFormats.length === 0) return null;

        audioFormats.sort((a, b) => b.bitrate - a.bitrate);
        const best = audioFormats[0];

        return {
            url: best.url,
            mimeType: best.mimeType,
            requestHeaders: {
                'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
                'Origin': 'https://www.youtube.com',
                'Referer': 'https://www.youtube.com/',
            },
            expiresAt: parseExpiresAt(best.url),
            bitrateKbps: best.bitrate > 0 ? Math.round(best.bitrate / 1000) : null,
            audioCodec: best.codec !== 'unknown' ? best.codec : null,
            container: best.container,
        };
    } catch (err) {
        console.error('[stream] youtubei.js failed:', err instanceof Error ? err.message : err);
        playerClient = null;
        return null;
    }
}

// ─── Public API – Fallback Chain ─────────────────────────────────────

export async function resolveAudioStream(videoId: string, forceRefresh = false): Promise<ResolvedAudioStream> {
    const cached = streamCache.get(videoId);
    const now = Date.now();

    if (!forceRefresh && cached) {
        const staleByTime = now - cached.cachedAt > STREAM_CACHE_TTL_MS;
        const staleByExpiry = cached.value.expiresAt !== null && cached.value.expiresAt - now < 60_000;
        if (!staleByTime && !staleByExpiry) return cached.value;
    }

    // 1) Try Piped
    const piped = await tryPiped(videoId);
    if (piped) {
        console.log(`[stream] ✓ Piped resolved for ${videoId}`);
        streamCache.set(videoId, { value: piped, cachedAt: now });
        return piped;
    }

    // 2) Try Invidious
    const invidious = await tryInvidious(videoId);
    if (invidious) {
        console.log(`[stream] ✓ Invidious resolved for ${videoId}`);
        streamCache.set(videoId, { value: invidious, cachedAt: now });
        return invidious;
    }

    // 3) Last resort: youtubei.js with cookies
    const ytjs = await tryYoutubeiJs(videoId);
    if (ytjs) {
        console.log(`[stream] ✓ youtubei.js resolved for ${videoId}`);
        streamCache.set(videoId, { value: ytjs, cachedAt: now });
        return ytjs;
    }

    throw new Error(`All stream sources failed for video ${videoId}`);
}

export function clearResolvedAudioStream(videoId: string) {
    streamCache.delete(videoId);
}

// ─── Caption / Lyrics Extraction ─────────────────────────────────────

const DEFAULT_CAPTION_LANGUAGE_ORDER = ['en', 'en-US', 'en-GB', 'hi', 'hi-IN'];

function sanitizeTimedLine(text: string): string | null {
    const normalized = normalizeLyricText(text);
    if (!normalized || /^\[[^\]]+\]$/.test(normalized)) {
        return null;
    }
    return normalized;
}

function dedupeTimedLines(lines: LyricLine[]): LyricLine[] {
    const deduped: LyricLine[] = [];
    for (const line of lines) {
        if (!line.text) continue;
        const previous = deduped[deduped.length - 1];
        if (previous && previous.text === line.text) {
            previous.endMs = line.endMs ?? previous.endMs;
            continue;
        }
        deduped.push(line);
    }
    return deduped;
}

function buildSyncedLyrics(lines: LyricLine[], language: string): TrackLyrics | null {
    const deduped = dedupeTimedLines(lines);
    if (deduped.length === 0) return null;
    return {
        text: deduped.map((line) => line.text).join('\n'),
        lines: deduped,
        synced: deduped.some((line) => line.startMs !== null),
        source: 'captions',
        language,
        timingMode: 'synced',
    };
}

function parseJson3Transcript(raw: string, language: string): TrackLyrics | null {
    try {
        const payload = JSON.parse(raw) as {
            events?: Array<{
                tStartMs?: number;
                dDurationMs?: number;
                segs?: Array<{ utf8?: string }>;
            }>;
        };

        const lines = (payload.events ?? [])
            .map<LyricLine | null>((event) => {
                const text = sanitizeTimedLine((event.segs ?? []).map((segment) => segment.utf8 ?? '').join(''));
                if (!text) return null;
                const startMs = typeof event.tStartMs === 'number' ? event.tStartMs : null;
                const durationMs = typeof event.dDurationMs === 'number' ? event.dDurationMs : null;
                return {
                    text,
                    startMs,
                    endMs: startMs !== null && durationMs !== null ? startMs + durationMs : null,
                };
            })
            .filter((line): line is LyricLine => line !== null);

        return buildSyncedLyrics(lines, language);
    } catch {
        return null;
    }
}

function parseTimestampMs(value: string): number | null {
    const normalized = value.replace(',', '.');
    const parts = normalized.split(':').map((part) => part.trim());
    if (parts.length < 2 || parts.length > 3) return null;

    const [hours, minutes, seconds] =
        parts.length === 3
            ? [parts[0], parts[1], parts[2]]
            : ['0', parts[0], parts[1]];

    const totalMs =
        Number.parseFloat(seconds) * 1000 +
        Number.parseInt(minutes, 10) * 60_000 +
        Number.parseInt(hours, 10) * 3_600_000;

    return Number.isFinite(totalMs) ? Math.round(totalMs) : null;
}

function parseVttTranscript(raw: string, language: string): TrackLyrics | null {
    const cues = raw
        .split(/\r?\n\r?\n/)
        .map((block) => block.trim())
        .filter(Boolean);

    const lines: LyricLine[] = [];

    for (const cue of cues) {
        const parts = cue
            .split(/\r?\n/)
            .map((part) => part.trim())
            .filter(Boolean);

        const timeLineIndex = parts.findIndex((part) => part.includes('-->'));
        if (timeLineIndex === -1) continue;

        const [startRaw, endRaw] = parts[timeLineIndex].split('-->').map((part) => part.trim().split(' ')[0] ?? '');
        const startMs = parseTimestampMs(startRaw);
        const endMs = parseTimestampMs(endRaw);
        const text = sanitizeTimedLine(parts.slice(timeLineIndex + 1).join(' '));

        if (!text) continue;

        lines.push({ text, startMs, endMs });
    }

    return buildSyncedLyrics(lines, language);
}

type CaptionTrack = {
    baseUrl: string;
    languageCode: string;
    kind?: string;
    name?: { simpleText?: string };
};

export async function resolveCaptionTranscript(
    videoId: string,
    preferredLanguages: string[] = DEFAULT_CAPTION_LANGUAGE_ORDER
): Promise<TrackLyrics | null> {
    const yt = await getPlayerClient();
    const info = await yt.getBasicInfo(videoId);

    const infoRaw = info as unknown as Record<string, unknown>;
    const captions = (infoRaw.captions ?? (info as unknown as { player_response?: Record<string, unknown> }).player_response?.captions) as Record<string, unknown> | undefined;
    const renderer = captions?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
    const captionTracks = (renderer?.captionTracks ?? []) as CaptionTrack[];

    if (captionTracks.length === 0) return null;

    let selected: CaptionTrack | null = null;
    for (const lang of preferredLanguages) {
        const match = captionTracks.find((t) => t.languageCode === lang);
        if (match) { selected = match; break; }
    }
    if (!selected) selected = captionTracks[0];
    if (!selected?.baseUrl) return null;

    const json3Url = `${selected.baseUrl}&fmt=json3`;
    try {
        const response = await fetch(json3Url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
            cache: 'no-store',
        });
        if (response.ok) {
            const text = await response.text();
            const result = parseJson3Transcript(text, selected.languageCode);
            if (result) return result;
        }
    } catch { /* fall through */ }

    const vttUrl = `${selected.baseUrl}&fmt=vtt`;
    try {
        const response = await fetch(vttUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
            cache: 'no-store',
        });
        if (response.ok) {
            const text = await response.text();
            return parseVttTranscript(text, selected.languageCode)
                ?? createUnsyncedLyrics(text, 'captions', selected.languageCode);
        }
    } catch { /* no captions */ }

    return null;
}
