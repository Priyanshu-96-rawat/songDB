import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createUnsyncedLyrics, normalizeLyricText, type LyricLine, type TrackLyrics } from '@/lib/lyrics';

const execFileAsync = promisify(execFile);

type AudioFormat = {
    url?: string;
    acodec?: string;
    vcodec?: string;
    abr?: number;
    tbr?: number;
    ext?: string;
    asr?: number;
    audio_channels?: number;
    format_id?: string;
    format_note?: string;
    mime_type?: string;
    format?: string;
    protocol?: string;
    http_headers?: Record<string, string>;
};

type CaptionFormat = {
    ext?: string;
    url?: string;
    name?: string;
};

type SelectedCaptionFormat = CaptionFormat & {
    language: string;
};

type YtDlpPayload = {
    requested_downloads?: AudioFormat[];
    formats?: AudioFormat[];
    subtitles?: Record<string, CaptionFormat[]>;
    automatic_captions?: Record<string, CaptionFormat[]>;
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

const STREAM_CACHE_TTL_MS = 10 * 60 * 1000;
const streamCache = new Map<string, { value: ResolvedAudioStream; cachedAt: number }>();
const metadataCache = new Map<string, { value: YtDlpPayload; cachedAt: number }>();
const DEFAULT_CAPTION_LANGUAGE_ORDER = ['en', 'en-US', 'en-GB', 'hi', 'hi-IN'];

function getVideoUrl(videoId: string) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

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

function inferMimeType(format: AudioFormat): string {
    const mime = format.mime_type;
    if (mime) return mime.split(';')[0];

    if (format.ext === 'm4a' || format.ext === 'mp4') return 'audio/mp4';
    if (format.ext === 'webm') return 'audio/webm';
    if (format.ext === 'mp3') return 'audio/mpeg';

    return 'audio/webm';
}

function getCodecRank(acodec?: string): number {
    const codec = (acodec ?? "").toLowerCase();
    if (codec.includes("opus")) return 5;
    if (codec.includes("vorbis")) return 4;
    if (codec.includes("mp4a") || codec.includes("aac")) return 3;
    if (codec.includes("mp3")) return 2;
    return 1;
}

function getContainerRank(ext?: string): number {
    switch ((ext ?? "").toLowerCase()) {
        case "webm":
            return 4;
        case "m4a":
        case "mp4":
            return 3;
        case "mp3":
            return 2;
        default:
            return 1;
    }
}

function scoreAudioFormat(format: AudioFormat): number {
    const bitrate = format.abr ?? format.tbr ?? 0;
    const sampleRate = format.asr ?? 0;
    const channels = format.audio_channels ?? 0;
    const codecRank = getCodecRank(format.acodec);
    const containerRank = getContainerRank(format.ext);
    const descriptor = `${format.format_note ?? ""} ${format.format ?? ""} ${format.format_id ?? ""}`.toLowerCase();
    const isAudioOnly = format.vcodec === "none" ? 1 : 0;
    const hasDirectHttpStream = (format.protocol ?? "").startsWith("http") ? 1 : 0;
    const drcPenalty = descriptor.includes("drc") ? 100 : 0;

    return (
        isAudioOnly * 2000 + // Strongly prefer audio-only formats
        hasDirectHttpStream * 500 + // Prefer direct HTTP streams
        codecRank * 500 + // Heavily weight high-quality codecs (Opus > AAC)
        bitrate * 50 + // Significantly increase bitrate weight
        containerRank * 50 + // Prefer webm/m4a
        (sampleRate / 1000) * 2 + // Slight preference for higher sample rates
        channels * 20 - // Prefer stereo
        drcPenalty // Heavily penalize DRC formats
    );
}

function pickBestAudioFormat(payload: YtDlpPayload): AudioFormat | null {
    const candidates = [...(payload.formats ?? []), ...(payload.requested_downloads ?? [])]
        .filter((format) => format.url && format.acodec && format.acodec !== "none");

    if (candidates.length === 0) {
        return null;
    }

    const audioOnlyFormats = candidates.filter((format) => format.vcodec === "none");
    const pool = audioOnlyFormats.length > 0 ? audioOnlyFormats : candidates;

    // Sort by score descending and pick the top one
    return pool.sort((a, b) => scoreAudioFormat(b) - scoreAudioFormat(a))[0] ?? null;
}

function buildStreamResult(format: AudioFormat): ResolvedAudioStream {
    if (!format.url) {
        throw new Error('yt-dlp did not return an audio URL');
    }

    return {
        url: format.url,
        mimeType: inferMimeType(format),
        requestHeaders: {
            'User-Agent': format.http_headers?.['User-Agent'] ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: format.http_headers?.Accept ?? '*/*',
            'Accept-Language': format.http_headers?.['Accept-Language'] ?? 'en-US,en;q=0.9',
            Origin: 'https://music.youtube.com',
            Referer: 'https://music.youtube.com/',
        },
        expiresAt: parseExpiresAt(format.url),
        bitrateKbps: format.abr ?? format.tbr ?? null,
        audioCodec: format.acodec ?? null,
        container: format.ext ?? null,
    };
}

async function dumpVideoJson(videoId: string, forceRefresh = false): Promise<YtDlpPayload> {
    const cached = metadataCache.get(videoId);
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.cachedAt <= STREAM_CACHE_TTL_MS) {
        return cached.value;
    }

    const ytDlp = process.env.YTDLP_BIN || 'yt-dlp';
    const args = [
        '--dump-single-json',
        '--no-warnings',
        '--no-playlist',
        '--skip-download',
        '--js-runtimes',
        'node',
        '-f',
        'ba', // Fetch all audio-only formats to pick the best one
        getVideoUrl(videoId),
    ];

    const { stdout } = await execFileAsync(ytDlp, args, {
        windowsHide: true,
        maxBuffer: 50 * 1024 * 1024, // Increased buffer for large metadata
    });

    const payload = JSON.parse(stdout) as YtDlpPayload;
    metadataCache.set(videoId, { value: payload, cachedAt: now });
    return payload;
}

async function extractAudioStream(videoId: string, forceRefresh = false): Promise<ResolvedAudioStream> {
    const payload = await dumpVideoJson(videoId, forceRefresh);
    const bestFormat = pickBestAudioFormat(payload);
    if (!bestFormat) {
        throw new Error('yt-dlp could not find a playable audio-only format');
    }

    return buildStreamResult(bestFormat);
}

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
        if (!line.text) {
            continue;
        }

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
    if (deduped.length === 0) {
        return null;
    }

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
                if (!text) {
                    return null;
                }

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
    if (parts.length < 2 || parts.length > 3) {
        return null;
    }

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
        if (timeLineIndex === -1) {
            continue;
        }

        const [startRaw, endRaw] = parts[timeLineIndex].split('-->').map((part) => part.trim().split(' ')[0] ?? '');
        const startMs = parseTimestampMs(startRaw);
        const endMs = parseTimestampMs(endRaw);
        const text = sanitizeTimedLine(parts.slice(timeLineIndex + 1).join(' '));

        if (!text) {
            continue;
        }

        lines.push({
            text,
            startMs,
            endMs,
        });
    }

    return buildSyncedLyrics(lines, language);
}

function pickCaptionFormat(
    captionGroups: Record<string, CaptionFormat[]> | undefined,
    preferredLanguages: string[]
): SelectedCaptionFormat | null {
    if (!captionGroups) {
        return null;
    }

    const availableLanguages = Object.keys(captionGroups);
    const orderedLanguages = [
        ...preferredLanguages.filter((language) => availableLanguages.includes(language)),
        ...availableLanguages.filter((language) => !preferredLanguages.includes(language)),
    ];

    for (const language of orderedLanguages) {
        const formats = captionGroups[language] ?? [];
        const preferredFormat =
            formats.find((format) => format.ext === 'json3' && format.url) ??
            formats.find((format) => format.ext === 'vtt' && format.url) ??
            formats.find((format) => format.url);

        if (preferredFormat?.url) {
            return {
                ...preferredFormat,
                language,
            };
        }
    }

    return null;
}

export async function resolveCaptionTranscript(
    videoId: string,
    preferredLanguages: string[] = DEFAULT_CAPTION_LANGUAGE_ORDER
): Promise<TrackLyrics | null> {
    const payload = await dumpVideoJson(videoId);
    const manualCaption = pickCaptionFormat(payload.subtitles, preferredLanguages);
    const automaticCaption = pickCaptionFormat(payload.automatic_captions, preferredLanguages);
    const selectedCaption = manualCaption ?? automaticCaption;

    if (!selectedCaption?.url) {
        return null;
    }

    const response = await fetch(selectedCaption.url, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        return null;
    }

    const rawTranscript = await response.text();
    if (selectedCaption.ext === 'json3') {
        return parseJson3Transcript(rawTranscript, selectedCaption.language);
    }

    return parseVttTranscript(rawTranscript, selectedCaption.language)
        ?? createUnsyncedLyrics(rawTranscript, 'captions', selectedCaption.language);
}

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

    const extracted = await extractAudioStream(videoId, forceRefresh);
    streamCache.set(videoId, { value: extracted, cachedAt: now });
    return extracted;
}

export function clearResolvedAudioStream(videoId: string) {
    streamCache.delete(videoId);
    metadataCache.delete(videoId);
}
