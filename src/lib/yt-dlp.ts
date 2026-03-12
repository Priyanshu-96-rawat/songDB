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

// ─── Singleton Innertube Client (with player for stream deciphering) ─

let playerClient: Innertube | null = null;

function getYouTubeCookies(): string | undefined {
    const raw = process.env.YT_COOKIES;
    if (!raw) {
        console.warn('[yt-dlp] YT_COOKIES env var not set — running without authentication (may be rate-limited)');
        return undefined;
    }

    // If it looks like a Netscape cookie file (tab-separated lines), parse it
    if (raw.includes('\t')) {
        const pairs: string[] = [];
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const fields = trimmed.split('\t');
            // Netscape format: domain, flag, path, secure, expiry, name, value
            if (fields.length >= 7) {
                const name = fields[5];
                const value = fields[6];
                if (name && value) {
                    pairs.push(`${name}=${value}`);
                }
            }
        }
        if (pairs.length > 0) {
            console.log(`[yt-dlp] Parsed ${pairs.length} cookies from Netscape format`);
            return pairs.join('; ');
        }
    }

    // Otherwise assume it's already a browser-style cookie string
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

        // Pass cookies for authenticated session if available
        if (cookies) {
            (options as Record<string, unknown>).cookie = cookies;
            console.log('[yt-dlp] Innertube client initialized WITH cookie authentication');
        } else {
            console.log('[yt-dlp] Innertube client initialized WITHOUT authentication');
        }

        playerClient = await Innertube.create(options);
    }
    return playerClient;
}

// ─── Caches ──────────────────────────────────────────────────────────

const STREAM_CACHE_TTL_MS = 8 * 60 * 1000; // 8 minutes (YouTube URLs expire in ~6h but refresh often)
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

// ─── Stream Extraction via youtubei.js ───────────────────────────────

async function extractAudioStream(videoId: string): Promise<ResolvedAudioStream> {
    const yt = await getPlayerClient();

    // getBasicInfo fetches video info including streaming data with deciphered URLs
    const info = await yt.getBasicInfo(videoId);

    const streamingData = info.streaming_data;
    if (!streamingData) {
        // Reset client in case of stale player tokens
        playerClient = null;
        throw new Error(`No streaming data available for video ${videoId}. Player may need refresh.`);
    }

    const adaptiveFormats = streamingData.adaptive_formats ?? [];

    // Filter to audio-only formats that have a URL
    type ScoredFormat = {
        url: string;
        mimeType: string;
        bitrate: number;
        codec: string;
        container: string;
        sampleRate: number;
        channels: number;
    };

    const audioFormats: ScoredFormat[] = [];

    for (const fmt of adaptiveFormats) {
        // Only audio formats
        if (fmt.has_video) continue;
        if (!fmt.has_audio) continue;

        // Access the deciphered URL - youtubei.js provides it after deciphering
        const fmtRaw = fmt as unknown as Record<string, unknown>;
        const url = fmtRaw.url as string | undefined;
        if (!url) continue;

        const rawMime = (fmtRaw.mime_type as string) ?? 'audio/webm; codecs="opus"';
        const mimeBase = rawMime.split(';')[0] ?? 'audio/webm';
        const codecMatch = rawMime.match(/codecs="?([^"]*)"?/);
        const codec = codecMatch?.[1] ?? 'unknown';
        const container = mimeBase.split('/')[1] ?? 'webm';

        audioFormats.push({
            url,
            mimeType: mimeBase,
            bitrate: (fmtRaw.bitrate as number) ?? (fmtRaw.average_bitrate as number) ?? 0,
            codec,
            container,
            sampleRate: Number.parseInt(String(fmtRaw.audio_sample_rate ?? '0'), 10),
            channels: (fmtRaw.audio_channels as number) ?? 2,
        });
    }

    if (audioFormats.length === 0) {
        throw new Error(`No audio formats found for video ${videoId}`);
    }

    // Score and pick the best format
    const scored = audioFormats.map((f) => {
        const codecRank = f.codec.includes('opus') ? 5
            : f.codec.includes('vorbis') ? 4
            : (f.codec.includes('mp4a') || f.codec.includes('aac')) ? 3
            : 2;
        const score = codecRank * 500 + f.bitrate / 100 + f.sampleRate / 1000 + f.channels * 20;
        return { ...f, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    return {
        url: best.url,
        mimeType: best.mimeType,
        requestHeaders: {
            'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://www.youtube.com',
            'Referer': 'https://www.youtube.com/',
        },
        expiresAt: parseExpiresAt(best.url),
        bitrateKbps: best.bitrate > 0 ? Math.round(best.bitrate / 1000) : null,
        audioCodec: best.codec !== 'unknown' ? best.codec : null,
        container: best.container,
    };
}

// ─── Public API ──────────────────────────────────────────────────────

export async function resolveAudioStream(videoId: string, forceRefresh = false): Promise<ResolvedAudioStream> {
    const cached = streamCache.get(videoId);
    const now = Date.now();

    if (!forceRefresh && cached) {
        const staleByTime = now - cached.cachedAt > STREAM_CACHE_TTL_MS;
        const staleByExpiry = cached.value.expiresAt !== null && cached.value.expiresAt - now < 60_000;

        if (!staleByTime && !staleByExpiry) {
            return cached.value;
        }
    }

    let extracted: ResolvedAudioStream;
    try {
        extracted = await extractAudioStream(videoId);
    } catch (err) {
        // If extraction fails, reset client and retry once
        console.error('[stream] First attempt failed, resetting client:', err);
        playerClient = null;
        extracted = await extractAudioStream(videoId);
    }

    streamCache.set(videoId, { value: extracted, cachedAt: now });
    return extracted;
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

    // Extract captions from the player response
    const infoRaw = info as unknown as Record<string, unknown>;
    const captions = (infoRaw.captions ?? (info as unknown as { player_response?: Record<string, unknown> }).player_response?.captions) as Record<string, unknown> | undefined;
    const renderer = captions?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
    const captionTracks = (renderer?.captionTracks ?? []) as CaptionTrack[];

    if (captionTracks.length === 0) {
        return null;
    }

    // Pick the best caption track by language preference
    let selected: CaptionTrack | null = null;
    for (const lang of preferredLanguages) {
        const match = captionTracks.find((t) => t.languageCode === lang);
        if (match) {
            selected = match;
            break;
        }
    }
    if (!selected) {
        selected = captionTracks[0];
    }

    if (!selected?.baseUrl) return null;

    // Fetch as json3 first, then fall back to vtt
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
    } catch { /* fall through to VTT */ }

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
    } catch { /* no captions available */ }

    return null;
}
