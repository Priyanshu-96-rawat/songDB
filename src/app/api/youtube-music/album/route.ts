import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { getYTMusicAlbum } from '@/lib/youtube-stream';

const albumSchema = z.object({
    id: z.string().min(1, 'Album ID is required'),
});

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-album', 30);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const { searchParams } = new URL(request.url);
        const parsed = albumSchema.safeParse({ id: searchParams.get('id') });

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid album ID', message: parsed.error.issues[0]?.message ?? 'Validation failed' },
                { status: 400 }
            );
        }

        const album = await getYTMusicAlbum(parsed.data.id);

        return NextResponse.json(
            { success: true, data: album, message: 'Album retrieved' },
            { status: 200 }
        );
    } catch {
        // Silenced for production
        return NextResponse.json(
            { success: false, error: 'Internal server error', message: 'Failed to get album data' },
            { status: 500 }
        );
    }
}
