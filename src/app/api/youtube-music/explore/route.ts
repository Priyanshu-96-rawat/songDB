import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { getCachedYTMusicExplore } from '@/lib/youtube-feed';

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-explore', 24);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const shelves = await getCachedYTMusicExplore();

        return NextResponse.json(
            {
                success: true,
                data: shelves,
                message: `Found ${shelves.length} explore sections`,
            },
            { status: 200 }
        );
    } catch (error) {
        // Silenced for production
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Failed to get explore data',
            },
            { status: 500 }
        );
    }
}
