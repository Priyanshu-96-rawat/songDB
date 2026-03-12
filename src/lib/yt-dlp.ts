import Innertube from 'youtubei.js';
import { createUnsyncedLyrics, normalizeLyricText, type LyricLine, type TrackLyrics } from '@/lib/lyrics';

// ─── Types ───────────────────────────────────────────────────────────

type AudioFormatInfo = {
    url: string;
    mimeType: string;
    bitrate: number;
    audioSampleRate: number;
    audioChannels: number;
    codec: string;
    container: string;
    contentLength: number;
};

export type ResolvedAudioStream = {
    url: string;
    mimeType: string;
    requestHeaders: Record<string, string>;
    expiresAt: number | null;
    bitrateKbps: number | null;
    audioCodec: string | null;
    container: string | null;
};

// ─── Singleton Innertube Client (with player) ────────────────────────

let playerClient: Innertube | null = null;

async function getPlayerClient(): Promise<Innertube> {
    if (!playerClient) {
        playerClient = await Innertube.create({
            lang: 'en',
            location: 'US',
            retrieve_player: true,
        });
    }
    return playerClient;
}

// ─── Caches ──────────────────────────────────────────────────────────

const STREAM_CACHE_TTL_MS = 10 * 60 * 1000;
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

function getCodecRank(codec: string): number {
    const c = codec.toLowerCase();
    if (c.includes('opus')) return 5;
    if (c.includes('vorbis')) return 4;
    if (c.includes('mp4a') || c.includes('aac')) return 3;
    if (c.includes('mp3')) return 2;
    return 1;
}

function scoreFormat(f: AudioFormatInfo): number {
    const codecRank = getCodecRank(f.codec);
    return codecRank * 500 + f.bitrate / 100 + f.audioSampleRate / 1000 + f.audioChannels * 20;
}

// ─── Stream Extraction via youtubei.js ───────────────────────────────

async function extractAudioStream(videoId: string): Promise<ResolvedAudioStream> {
    const yt = await getPlayerClient();
    const info = await yt.getBasicInfo(videoId);

    const streamingData = info.streaming_data;
    if (!streamingData) {
        throw new Error(`No streaming data available for video ${videoId}`);
    }

    // Collect all audio-only adaptive formats
    const audioFormats: AudioFormatInfo[] = [];
    const adaptiveFormats = streamingData.adaptive_formats ?? [];

    for (const fmt of adaptiveFormats) {
        // Skip video formats — we only want audio
        if (fmt.has_video && !fmt.has_audio) continue;
        if (!fmt.has_audio) continue;

        const raw = fmt as unknown as Record<string, unknown>;

        // Get the stream URL — youtubei.js deciphers automatically when retrieve_player is true
        const url = (raw.url as string | undefined) ?? undefined;
        if (!url) continue;

        const mimeType = (raw.mime_type as string) ?? fmt.mime_type ?? 'audio/webm';
        const codec = mimeType.includes('codecs=')
            ? mimeType.split('codecs="')[1]?.split('"')[0] ?? 'unknown'
            : 'unknown';
        const container = mimeType.split(';')[0]?.split('/')[1] ?? 'webm';

        audioFormats.push({
            url,
            mimeType: mimeType.split(';')[0] ?? 'audio/webm',
            bitrate: (raw.bitrate as number) ?? (raw.average_bitrate as number) ?? 0,
            audioSampleRate: Number.parseInt(String(raw.audio_sample_rate ?? '0'), 10),
            audioChannels: (raw.audio_channels as number) ?? 2,
            codec,
            container,
            contentLength: Number.parseInt(String(raw.content_length ?? '0'), 10),
        });
    }

    if (audioFormats.length === 0) {
        throw new Error(`No audio formats found for video ${videoId}`);
    }

    // Pick the best format by score
    audioFormats.sort((a, b) => scoreFormat(b) - scoreFormat(a));
    const best = audioFormats[0];

    return {
        url: best.url,
        mimeType: best.mimeType,
        requestHeaders: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            Origin: 'https://music.youtube.com',
            Referer: 'https://music.youtube.com/',
        },
        expiresAt: parseExpiresAt(best.url),
        bitrateKbps: best.bitrate > 0 ? Math.round(best.bitrate / 1000) : null,
        audioCodec: best.codec !== 'unknown' ? best.codec : null,
        container: best.container !== 'webm' ? best.container : 'webm',
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

    const extracted = await extractAudioStream(videoId);
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
    const raw = info as unknown as Record<string, unknown>;
    
    // Try to get captions from the player response
    const playerResponse = raw.player_response as Record<string, unknown> | undefined;
    const captions = (playerResponse?.captions ?? (raw as Record<string, unknown>).captions) as Record<string, unknown> | undefined;
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
