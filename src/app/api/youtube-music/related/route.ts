import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { getYTMusicRelated } from '@/lib/youtube-stream';

const relatedSchema = z.object({
    id: z.string().min(1, 'Video ID is required').max(20),
});

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-related', 36);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const { searchParams } = new URL(request.url);
        const parsed = relatedSchema.safeParse({ id: searchParams.get('id') });

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

        const shelves = await getYTMusicRelated(parsed.data.id);

        return NextResponse.json(
            {
                success: true,
                data: shelves,
                message: `Found ${shelves.length} related sections`,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('[youtube-music/related] API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Failed to get related tracks',
            },
            { status: 500 }
        );
    }
}
