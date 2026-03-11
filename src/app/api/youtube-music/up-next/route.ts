import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { getYTMusicUpNext } from '@/lib/youtube-stream';

const upNextSchema = z.object({
    id: z.string().min(1, 'Video ID is required').max(20),
    automix: z.enum(['true', 'false']).optional().default('true'),
});

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-up-next', 36);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const { searchParams } = new URL(request.url);
        const parsed = upNextSchema.safeParse({
            id: searchParams.get('id'),
            automix: searchParams.get('automix') ?? 'true',
        });

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid parameters',
                    message: parsed.error.issues[0]?.message ?? 'Validation failed',
                },
                { status: 400 }
            );
        }

        const tracks = await getYTMusicUpNext(parsed.data.id, parsed.data.automix === 'true');

        return NextResponse.json(
            {
                success: true,
                data: tracks,
                message: `Found ${tracks.length} up next tracks`,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('[youtube-music/up-next] API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Failed to get up next tracks',
            },
            { status: 500 }
        );
    }
}
