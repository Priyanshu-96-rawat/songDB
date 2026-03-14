import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { searchYouTubeMusic } from '@/lib/youtube-stream';

const searchSchema = z.object({
    q: z.string().min(1, 'Search query is required').max(200),
    type: z.enum(['songs', 'videos', 'artists', 'albums', 'playlists']).optional(),
});

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-search', 40);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const { searchParams } = new URL(request.url);
        const parsed = searchSchema.safeParse({
            q: searchParams.get('q'),
            type: searchParams.get('type') ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid query parameter',
                    message: parsed.error.issues[0]?.message ?? 'Validation failed',
                },
                { status: 400 }
            );
        }

        const results = await searchYouTubeMusic(parsed.data.q, parsed.data.type);

        return NextResponse.json(
            {
                success: true,
                data: results,
                message: `Search complete`,
            },
            { status: 200 }
        );
    } catch (error) {
        // Silenced for production
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Failed to search YouTube Music',
            },
            { status: 500 }
        );
    }
}
