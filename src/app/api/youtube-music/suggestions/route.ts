import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRouteRateLimit } from '@/lib/request-guard';
import { getMusicSearchSuggestions } from '@/lib/youtube-stream';

const suggestionsSchema = z.object({
    q: z.string().min(1, 'Query is required').max(200),
});

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceRouteRateLimit(request, 'youtube-suggestions', 60);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const { searchParams } = new URL(request.url);
        const parsed = suggestionsSchema.safeParse({ q: searchParams.get('q') });

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid query',
                    message: parsed.error.issues[0]?.message ?? 'Validation failed',
                },
                { status: 400 }
            );
        }

        const suggestions = await getMusicSearchSuggestions(parsed.data.q);

        return NextResponse.json(
            {
                success: true,
                data: suggestions,
                message: `Found ${suggestions.length} suggestions`,
            },
            { status: 200 }
        );
    } catch (error) {
        // Internal error handled via response envelope
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Failed to get suggestions',
            },
            { status: 500 }
        );
    }
}
