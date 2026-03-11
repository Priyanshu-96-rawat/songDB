import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { getYTMusicArtist } from '@/lib/youtube-stream';

const artistSchema = z.object({
    id: z.string().min(1, 'Artist ID is required'),
});

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-artist', 30);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const { searchParams } = new URL(request.url);
        const parsed = artistSchema.safeParse({ id: searchParams.get('id') });

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid artist ID', message: parsed.error.issues[0]?.message ?? 'Validation failed' },
                { status: 400 }
            );
        }

        const artist = await getYTMusicArtist(parsed.data.id);

        return NextResponse.json(
            { success: true, data: artist, message: 'Artist retrieved' },
            { status: 200 }
        );
    } catch (error) {
        console.error('[youtube-music/artist] API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error', message: 'Failed to get artist data' },
            { status: 500 }
        );
    }
}
