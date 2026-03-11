import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { getCachedYTMusicHomeFeed } from '@/lib/youtube-feed';

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-home', 24);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const shelves = await getCachedYTMusicHomeFeed();

        return NextResponse.json(
            {
                success: true,
                data: shelves,
                message: `Found ${shelves.length} home feed sections`,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('[youtube-music/home] API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Failed to get home feed',
            },
            { status: 500 }
        );
    }
}
