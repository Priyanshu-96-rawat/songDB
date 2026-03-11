export interface LyricLine {
    text: string;
    startMs: number | null;
    endMs: number | null;
}

export interface TrackLyrics {
    text: string;
    lines: LyricLine[];
    synced: boolean;
    source: 'official' | 'captions';
    language?: string | null;
    timingMode: 'static' | 'estimated' | 'synced';
}

export function normalizeLyricText(text: string): string {
    return text
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/^Source:.*$/gim, '')
        .replace(/^By:.*$/gim, '')
        .replace(/\r/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+/g, (match) => (match.includes('\n') ? match : ' '))
        .trim();
}

export function createUnsyncedLyrics(
    text: string,
    source: TrackLyrics['source'] = 'official',
    language: string | null = null
): TrackLyrics | null {
    const normalized = normalizeLyricText(text);
    if (!normalized) {
        return null;
    }

    const lines = normalized
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map<LyricLine>((line) => ({
            text: line,
            startMs: null,
            endMs: null,
        }));

    if (lines.length === 0) {
        return null;
    }

    return {
        text: lines.map((line) => line.text).join('\n'),
        lines,
        synced: false,
        source,
        language,
        timingMode: 'static',
    };
}

export function createEstimatedLyrics(
    text: string,
    durationSeconds: number,
    source: TrackLyrics['source'] = 'official',
    language: string | null = null
): TrackLyrics | null {
    const baseLyrics = createUnsyncedLyrics(text, source, language);
    if (!baseLyrics) {
        return null;
    }

    const durationMs = Math.round(durationSeconds * 1000);
    if (!Number.isFinite(durationMs) || durationMs <= 0 || baseLyrics.lines.length < 2) {
        return baseLyrics;
    }

    const minimumLineMs = 1400;
    const weights = baseLyrics.lines.map((line) => {
        const wordCount = line.text.split(/\s+/).filter(Boolean).length;
        return Math.max(1, wordCount + line.text.length / 18);
    });
    const extraBudget = Math.max(durationMs - baseLyrics.lines.length * minimumLineMs, 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    let cursor = 0;
    const lines = baseLyrics.lines.map((line, index) => {
        if (index === baseLyrics.lines.length - 1) {
            return {
                ...line,
                startMs: Math.min(cursor, durationMs),
                endMs: durationMs,
            };
        }

        const extraDuration =
            totalWeight > 0 ? Math.round(extraBudget * (weights[index] / totalWeight)) : 0;
        const lineDuration = minimumLineMs + extraDuration;
        const startMs = Math.min(cursor, durationMs);
        const endMs = Math.min(durationMs, startMs + lineDuration);
        cursor = endMs;

        return {
            ...line,
            startMs,
            endMs,
        };
    });

    return {
        ...baseLyrics,
        lines,
        synced: true,
        timingMode: 'estimated',
    };
}

export function getActiveLyricIndex(lines: LyricLine[], currentMs: number): number {
    const syncedLines = lines.filter((line) => line.startMs !== null);
    if (syncedLines.length === 0) {
        return -1;
    }

    for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index];
        if (line.startMs === null) {
            continue;
        }

        const nextLine = lines
            .slice(index + 1)
            .find((candidate) => candidate.startMs !== null);
        const endMs = line.endMs ?? (nextLine?.startMs ?? Number.POSITIVE_INFINITY);

        if (currentMs >= line.startMs && currentMs < endMs) {
            return index;
        }
    }

    const firstTimedIndex = lines.findIndex((line) => line.startMs !== null);
    if (firstTimedIndex >= 0 && currentMs < (lines[firstTimedIndex]?.startMs ?? 0)) {
        return firstTimedIndex;
    }

    return lines.length - 1;
}
