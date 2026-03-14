import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { getYTMusicPlaylist } from '@/lib/youtube-stream';

const playlistSchema = z.object({
    id: z.string().min(1, 'Playlist ID is required'),
});

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-playlist', 30);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const { searchParams } = new URL(request.url);
        const parsed = playlistSchema.safeParse({ id: searchParams.get('id') });

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid playlist ID', message: parsed.error.issues[0]?.message ?? 'Validation failed' },
                { status: 400 }
            );
        }

        const playlist = await getYTMusicPlaylist(parsed.data.id);

        return NextResponse.json(
            { success: true, data: playlist, message: 'Playlist retrieved' },
            { status: 200 }
        );
    } catch {
        // Silenced for production
        return NextResponse.json(
            { success: false, error: 'Internal server error', message: 'Failed to get playlist data' },
            { status: 500 }
        );
    }
}
