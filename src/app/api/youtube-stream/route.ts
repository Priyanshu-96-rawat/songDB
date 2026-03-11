import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { clearResolvedAudioStream, resolveAudioStream } from '@/lib/yt-dlp';

const streamSchema = z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{6,20}$/, 'Invalid track ID'),
});

export async function GET(request: NextRequest) {
    const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-stream', 120);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = streamSchema.safeParse({ id: searchParams.get('id') });

    if (!parsed.success) {
        return NextResponse.json(
            {
                success: false,
                error: 'Invalid track ID',
                message: parsed.error.issues[0]?.message ?? 'Validation failed',
            },
            { status: 400 }
        );
    }

    const id = parsed.data.id;
    const isResolveOnly = searchParams.get('resolveOnly') === 'true';

    try {
        if (isResolveOnly) {
            await resolveAudioStream(id, false);
            return NextResponse.json({ success: true, message: 'Stream resolved and cached' });
        }

        const rangeHeader = request.headers.get('range');
        const buildUpstreamHeaders = async (forceRefresh = false) => {
            const resolved = await resolveAudioStream(id, forceRefresh);
            const headers = new Headers(resolved.requestHeaders);

            if (rangeHeader) {
                headers.set('Range', rangeHeader);
            }

            return {
                resolved,
                response: await fetch(resolved.url, {
                    headers,
                    redirect: 'follow',
                    cache: 'no-store',
                }),
            };
        };

        let { resolved, response } = await buildUpstreamHeaders(false);

        if (!response.ok && (response.status === 403 || response.status === 410)) {
            clearResolvedAudioStream(id);
            ({ resolved, response } = await buildUpstreamHeaders(true));
        }

        if (!response.ok || !response.body) {
            return NextResponse.json(
                { error: 'Failed to fetch audio stream from upstream', status: response.status },
                { status: 502 }
            );
        }
        const headers = new Headers();
        headers.set('Content-Type', response.headers.get('content-type') || resolved.mimeType);
        headers.set('Accept-Ranges', response.headers.get('accept-ranges') || 'bytes');
        headers.set('Cache-Control', 'no-store');
        if (resolved.audioCodec) headers.set('X-Audio-Codec', resolved.audioCodec);
        if (resolved.container) headers.set('X-Audio-Container', resolved.container);
        if (resolved.bitrateKbps) headers.set('X-Audio-Bitrate-Kbps', String(resolved.bitrateKbps));

        const contentLength = response.headers.get('content-length');
        if (contentLength) headers.set('Content-Length', contentLength);

        const contentRange = response.headers.get('content-range');
        if (contentRange) headers.set('Content-Range', contentRange);

        return new NextResponse(response.body, {
            status: response.status,
            headers,
        });

    } catch (error) {
        console.error('[youtube-stream] Error:', error);
        return new NextResponse(JSON.stringify({ error: "Failed to get audio stream" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
