import { LRUCache } from "lru-cache";
import { NextRequest, NextResponse } from "next/server";

const requestCounters = new LRUCache<string, { count: number; resetAt: number }>({
    max: 5000,
    ttl: 1000 * 60 * 5,
});

function getClientIdentifier(request: NextRequest) {
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const realIp = request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown";
    return `${forwardedFor || realIp || "unknown"}:${userAgent}`;
}

export function enforceRouteRateLimit(
    request: NextRequest,
    key: string,
    limit: number,
    windowMs = 60_000
) {
    const cacheKey = `${key}:${getClientIdentifier(request)}`;
    const now = Date.now();
    const existing = requestCounters.get(cacheKey);

    if (!existing || existing.resetAt <= now) {
        requestCounters.set(cacheKey, { count: 1, resetAt: now + windowMs });
        return null;
    }

    if (existing.count >= limit) {
        const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        return NextResponse.json(
            {
                success: false,
                error: "Too many requests",
                message: "Rate limit exceeded. Try again shortly.",
            },
            {
                status: 429,
                headers: { "Retry-After": String(retryAfter) },
            }
        );
    }

    requestCounters.set(cacheKey, { ...existing, count: existing.count + 1 });
    return null;
}
