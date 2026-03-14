import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUnsyncedLyrics, getYTMusicLyrics } from '@/lib/youtube-stream';
import { enforceRouteRateLimit } from '@/lib/request-guard';

const lyricsSchema = z.object({
    id: z.string().min(1, 'Video ID is required').max(20),
    durationSeconds: z.coerce.number().positive().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-lyrics', 36);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const { searchParams } = new URL(request.url);
        const parsed = lyricsSchema.safeParse({
            id: searchParams.get('id'),
            durationSeconds: searchParams.get('durationSeconds') ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid video ID',
                    message: parsed.error.issues[0]?.message ?? 'Validation failed',
                },
                { status: 400 }
            );
        }

        const lyrics = await getYTMusicLyrics(parsed.data.id, parsed.data.durationSeconds);

        if (!lyrics) {
            return NextResponse.json(
                {
                    success: true,
                    data: null,
                    message: 'No lyrics available for this track',
                },
                { status: 200 }
            );
        }

        const sanitizedLyrics = createUnsyncedLyrics(lyrics.text, lyrics.source, lyrics.language) ?? lyrics;
        const payload = lyrics.timingMode !== 'static'
            ? {
                ...lyrics,
                text: sanitizedLyrics.text,
                lines: lyrics.lines
                    .map((line) => ({
                        ...line,
                        text: line.text.trim(),
                    }))
                    .filter((line) => line.text),
            }
            : sanitizedLyrics;

        return NextResponse.json(
            {
                success: true,
                data: payload,
                message: 'Lyrics retrieved',
            },
            { status: 200 }
        );
    } catch (error) {
        // Silenced for production
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Failed to get lyrics',
            },
            { status: 500 }
        );
    }
}
