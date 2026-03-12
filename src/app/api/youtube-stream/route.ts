import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { clearResolvedAudioStream, resolveAudioStream } from '@/lib/yt-dlp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const rangeHeader = request.headers.get('range');

    try {
        // Resolve the YouTube audio stream URL via youtubei.js
        const resolved = await resolveAudioStream(id, false);

        // Build upstream request headers
        const upstreamHeaders = new Headers(resolved.requestHeaders);
        if (rangeHeader) {
            upstreamHeaders.set('Range', rangeHeader);
        }

        // Fetch from YouTube and pipe through our server
        let response = await fetch(resolved.url, {
            headers: upstreamHeaders,
            redirect: 'follow',
            cache: 'no-store',
        });

        // If YouTube returns 403/410, clear cache and retry with fresh URL
        if (!response.ok && (response.status === 403 || response.status === 410)) {
            console.warn(`[youtube-stream] Got ${response.status} for ${id}, refreshing stream URL`);
            clearResolvedAudioStream(id);

            const freshResolved = await resolveAudioStream(id, true);
            const freshHeaders = new Headers(freshResolved.requestHeaders);
            if (rangeHeader) {
                freshHeaders.set('Range', rangeHeader);
            }

            response = await fetch(freshResolved.url, {
                headers: freshHeaders,
                redirect: 'follow',
                cache: 'no-store',
            });

            if (!response.ok || !response.body) {
                return NextResponse.json(
                    { success: false, error: 'Audio stream unavailable after refresh', status: response.status },
                    { status: 502 }
                );
            }

            // Use fresh resolved for response headers
            return buildProxyResponse(response, freshResolved);
        }

        if (!response.ok || !response.body) {
            return NextResponse.json(
                { success: false, error: 'Failed to fetch audio stream', status: response.status },
                { status: 502 }
            );
        }

        return buildProxyResponse(response, resolved);

    } catch (error) {
        console.error('[youtube-stream] Error:', error);
        // Clear cache on any error so next request gets a fresh attempt
        clearResolvedAudioStream(id);
        return NextResponse.json(
            { success: false, error: 'Failed to get audio stream' },
            { status: 500 }
        );
    }
}

function buildProxyResponse(
    upstreamResponse: Response,
    resolved: { mimeType: string; audioCodec: string | null; container: string | null; bitrateKbps: number | null }
) {
    const headers = new Headers();

    // Content type from upstream, fallback to resolved
    headers.set('Content-Type', upstreamResponse.headers.get('content-type') || resolved.mimeType);
    headers.set('Accept-Ranges', upstreamResponse.headers.get('accept-ranges') || 'bytes');
    headers.set('Cache-Control', 'no-store');

    // Forward content length and range headers for seeking support
    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    const contentRange = upstreamResponse.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);

    // Audio metadata headers
    if (resolved.audioCodec) headers.set('X-Audio-Codec', resolved.audioCodec);
    if (resolved.container) headers.set('X-Audio-Container', resolved.container);
    if (resolved.bitrateKbps) headers.set('X-Audio-Bitrate-Kbps', String(resolved.bitrateKbps));

    // CORS headers to ensure the browser can read the response
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, X-Audio-Codec, X-Audio-Container, X-Audio-Bitrate-Kbps');

    return new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers,
    });
}
