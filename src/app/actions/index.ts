"use server";

import { z } from "zod";
import { LRUCache } from "lru-cache";
import { headers } from "next/headers";
import { fetchFeaturedDay, fetchTrendingSongs, fetchTopArtists, fetchTopAlbums, fetchArtistInfo, fetchArtistTopTracks, fetchSongInfo, extractLastFmImage, fetchTopTags } from "@/lib/lastfm";
import { searchArtistsMB, getArtistDiscographyMB, getAlbumTracklistMB, fetchImageFromDeezer } from "@/lib/musicbrainz";
import { fetchNewsAbout } from "@/lib/newsapi";
import { fetchRssNews } from "@/lib/rss";
import { generateSongSummary, generateEmbedding } from "@/lib/cohere";
import { fetchYouTubeEmbed } from "@/lib/youtube";

// --- Rate Limiting Setup ---
const rateLimit = new LRUCache({
    max: 1000,
    ttl: 1000 * 60, // 1 minute
});

async function checkRateLimit(key: string, limit: number) {
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for") || "unknown";
    const cacheKey = `${ip}-${key}`;
    const current = (rateLimit.get(cacheKey) as number) || 0;
    if (current >= limit) {
        throw new Error("Rate limit exceeded for this endpoint");
    }
    rateLimit.set(cacheKey, current + 1);
}

// --- Zod Validation Schemas ---
const limitSchema = z.number().int().min(1).max(100).optional().default(10);
const stringSchema = z.string().min(1).max(150);

// Music APIs
export async function getTrendingSongsAction(limit = 10) {
    await checkRateLimit("trending", 60);
    const parsedLimit = limitSchema.parse(limit);
    return fetchTrendingSongs(parsedLimit);
}

export async function getFeaturedSongAction() {
    await checkRateLimit("featured", 60);
    return fetchFeaturedDay();
}

export async function getTopArtistsAction(limit = 10) {
    await checkRateLimit("top-artists", 60);
    const parsedLimit = limitSchema.parse(limit);
    return fetchTopArtists(parsedLimit);
}

export async function getTopAlbumsAction(limit = 10) {
    await checkRateLimit("top-albums", 60);
    const parsedLimit = limitSchema.parse(limit);
    return fetchTopAlbums(parsedLimit);
}

// Tags that are personal/social (no actual tracks) — filter them out
const EXCLUDED_TAGS = new Set([
    'seen live', 'favourite', 'favorites', 'favourites', 'loved',
    'favorite', 'my favorite', 'beautiful', 'awesome', 'cool',
    'under 2000 listeners', 'spotify', 'albums i own',
]);

export async function getTopTagsAction(limit = 15) {
    await checkRateLimit("top-tags", 60);
    const parsedLimit = limitSchema.parse(limit);
    // Fetch extra to account for filtered tags
    const raw = await fetchTopTags(parsedLimit + 10);
    if (!raw) return [];
    return raw
        .filter((tag: any) => !EXCLUDED_TAGS.has(tag.name?.toLowerCase?.()))
        .slice(0, parsedLimit);
}

export async function getArtistDetailsAction(artistName: string) {
    await checkRateLimit("artist-details", 60);
    const parsedName = stringSchema.parse(artistName);
    return fetchArtistInfo(parsedName);
}

export async function getArtistTopTracksAction(artistName: string, limit = 5) {
    await checkRateLimit("artist-tracks", 60);
    const parsedName = stringSchema.parse(artistName);
    const parsedLimit = limitSchema.parse(limit);
    return fetchArtistTopTracks(parsedName, parsedLimit);
}

export async function getSongInfoAction(artistName: string, trackName: string) {
    await checkRateLimit("song-info", 60);
    const parsedArtist = stringSchema.parse(artistName);
    const parsedTrack = stringSchema.parse(trackName);
    return fetchSongInfo(parsedArtist, parsedTrack);
}

// MusicBrainz APIs
export async function searchArtistMBAction(query: string) {
    await checkRateLimit("search-mb", 60);
    const parsedQuery = stringSchema.parse(query);
    return searchArtistsMB(parsedQuery);
}

export async function getArtistDiscographyAction(artistName: string) {
    await checkRateLimit("discography", 60);
    const parsedName = stringSchema.parse(artistName);
    // MusicBrainz needs MBID, but we may receive a name — search first
    const results = await searchArtistsMB(parsedName);
    if (results && results.length > 0) {
        return getArtistDiscographyMB(results[0].id);
    }
    return [];
}

export async function getAlbumTracklistAction(mbid: string) {
    await checkRateLimit("tracklist", 60);
    const parsedMbid = stringSchema.parse(mbid);
    return getAlbumTracklistMB(parsedMbid);
}

// Image Resolution - Deezer fallback
export async function resolveImageAction(query: string, type: 'artist' | 'track', artistName?: string) {
    await checkRateLimit("resolve-image", 120); // allow more since images resolve per track
    const parsedQuery = stringSchema.parse(query);
    const parsedType = z.enum(['artist', 'track']).parse(type);
    const parsedArtist = artistName ? stringSchema.parse(artistName) : undefined;

    return fetchImageFromDeezer(parsedQuery, parsedType, parsedArtist);
}

// Secondary Provider APIs
export async function getNewsAction() {
    await checkRateLimit("news", 60);
    return fetchRssNews();
}

export async function getYouTubeVideoAction(query: string) {
    await checkRateLimit("youtube", 60);
    const parsedQuery = stringSchema.parse(query);
    return fetchYouTubeEmbed(parsedQuery);
}

import { adminAuth, adminDb } from "@/lib/firebase-admin";

// AI Actions - stricter rate limit
export async function generateSongSummaryAction(songName: string, artistName: string, idToken: string) {
    if (!idToken) throw new Error("Unauthorized: Missing ID token");
    try {
        await adminAuth.verifyIdToken(idToken);
    } catch (e) {
        throw new Error("Unauthorized: Invalid ID token");
    }

    await checkRateLimit("ai-summary", 5); // 5 requests per minute
    const parsedSong = stringSchema.parse(songName);
    const parsedArtist = stringSchema.parse(artistName);
    return generateSongSummary(parsedSong, parsedArtist);
}

export async function generateEmbeddingAction(text: string, idToken: string) {
    if (!idToken) throw new Error("Unauthorized: Missing ID token");
    try {
        await adminAuth.verifyIdToken(idToken);
    } catch (e) {
        throw new Error("Unauthorized: Invalid ID token");
    }

    await checkRateLimit("ai-embed", 10); // 10 requests per minute
    const parsedText = stringSchema.parse(text);
    return generateEmbedding(parsedText);
}

// ─── Reviews ───
import { createReviewSchema, type CreateReviewInput, type Review } from "@/schemas/reviewSchema";

export async function createReviewAction(data: CreateReviewInput, idToken: string): Promise<Review> {
    if (!idToken) throw new Error("Unauthorized: Missing ID token");
    let decodedToken;
    try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
        throw new Error("Unauthorized: Invalid ID token");
    }

    await checkRateLimit("create-review", 20); // 20 reviews per min per user

    // Validate input
    const parsed = createReviewSchema.parse(data);

    // Write to Firestore
    const reviewDoc = {
        user_id: decodedToken.uid,
        user_email: decodedToken.email || "",
        user_display_name: decodedToken.name || decodedToken.email?.split("@")[0] || "Anonymous",
        song_id: parsed.song_id,
        song_name: parsed.song_name,
        artist_name: parsed.artist_name,
        item_type: parsed.item_type || "song",
        rating: parsed.rating,
        review_text: parsed.review_text,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
    };

    const docRef = await adminDb.collection("reviews").add(reviewDoc);

    return {
        id: docRef.id,
        ...reviewDoc,
    };
}

export async function getReviewsAction(songId: string): Promise<Review[]> {
    await checkRateLimit("get-reviews", 60);
    const parsedSongId = stringSchema.parse(songId);

    const snapshot = await adminDb
        .collection("reviews")
        .where("song_id", "==", parsedSongId)
        .where("deleted_at", "==", null)
        .orderBy("created_at", "desc")
        .limit(20)
        .get();

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Review[];
}

// ─── Favorites ───
import { addFavoriteSchema, type AddFavoriteInput, type Favorite } from "@/schemas/favoriteSchema";

export async function addFavoriteAction(data: AddFavoriteInput, idToken: string): Promise<Favorite> {
    if (!idToken) throw new Error("Unauthorized: Missing ID token");
    let decodedToken;
    try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
        throw new Error("Unauthorized: Invalid ID token");
    }

    await checkRateLimit("add-favorite", 30);
    const parsed = addFavoriteSchema.parse(data);

    // Check for duplicate
    const existing = await adminDb
        .collection("favorites")
        .where("user_id", "==", decodedToken.uid)
        .where("item_id", "==", parsed.item_id)
        .where("item_type", "==", parsed.item_type)
        .limit(1)
        .get();

    if (!existing.empty) {
        const doc = existing.docs[0];
        return { id: doc.id, ...doc.data() } as Favorite;
    }

    const favDoc = {
        user_id: decodedToken.uid,
        item_id: parsed.item_id,
        item_type: parsed.item_type,
        item_name: parsed.item_name,
        artist_name: parsed.artist_name || "",
        image_url: parsed.image_url || "",
        created_at: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("favorites").add(favDoc);
    return { id: docRef.id, ...favDoc };
}

export async function removeFavoriteAction(itemId: string, itemType: "song" | "artist", idToken: string): Promise<void> {
    if (!idToken) throw new Error("Unauthorized: Missing ID token");
    let decodedToken;
    try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
        throw new Error("Unauthorized: Invalid ID token");
    }

    await checkRateLimit("remove-favorite", 30);

    const snapshot = await adminDb
        .collection("favorites")
        .where("user_id", "==", decodedToken.uid)
        .where("item_id", "==", itemId)
        .where("item_type", "==", itemType)
        .get();

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
}

export async function checkFavoriteAction(itemId: string, itemType: "song" | "artist", idToken: string): Promise<boolean> {
    if (!idToken) throw new Error("Unauthorized: Missing ID token");
    let decodedToken;
    try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
        throw new Error("Unauthorized: Invalid ID token");
    }

    await checkRateLimit("check-favorite", 120);

    const snapshot = await adminDb
        .collection("favorites")
        .where("user_id", "==", decodedToken.uid)
        .where("item_id", "==", itemId)
        .where("item_type", "==", itemType)
        .limit(1)
        .get();

    return !snapshot.empty;
}

export async function getUserFavoritesAction(idToken: string): Promise<Favorite[]> {
    if (!idToken) throw new Error("Unauthorized: Missing ID token");
    let decodedToken;
    try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
        throw new Error("Unauthorized: Invalid ID token");
    }

    await checkRateLimit("get-favorites", 30);

    const snapshot = await adminDb
        .collection("favorites")
        .where("user_id", "==", decodedToken.uid)
        .orderBy("created_at", "desc")
        .limit(100)
        .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Favorite[];
}

// ─── Rating Breakdown ───
export async function getRatingBreakdownAction(songId: string): Promise<{ distribution: number[]; total: number; average: number }> {
    await checkRateLimit("rating-breakdown", 60);
    const parsedSongId = stringSchema.parse(songId);

    const snapshot = await adminDb
        .collection("reviews")
        .where("song_id", "==", parsedSongId)
        .where("deleted_at", "==", null)
        .get();

    const distribution = [0, 0, 0, 0, 0]; // index 0 = 1★, index 4 = 5★
    let totalRating = 0;
    snapshot.docs.forEach((doc) => {
        const rating = doc.data().rating;
        if (rating >= 1 && rating <= 5) {
            distribution[rating - 1]++;
            totalRating += rating;
        }
    });

    const total = snapshot.docs.length;
    return {
        distribution,
        total,
        average: total > 0 ? totalRating / total : 0,
    };
}

// ─── Top Rated Songs ───
export async function getTopRatedSongsAction(): Promise<Array<{
    song_id: string;
    song_name: string;
    artist_name: string;
    average: number;
    count: number;
    bayesian: number;
}>> {
    await checkRateLimit("top-rated", 30);

    const snapshot = await adminDb
        .collection("reviews")
        .where("deleted_at", "==", null)
        .get();

    // Group by song_id
    const songMap = new Map<string, { song_name: string; artist_name: string; ratings: number[] }>();
    snapshot.docs.forEach((doc) => {
        const d = doc.data();
        if (!songMap.has(d.song_id)) {
            songMap.set(d.song_id, { song_name: d.song_name, artist_name: d.artist_name, ratings: [] });
        }
        songMap.get(d.song_id)!.ratings.push(d.rating);
    });

    // Bayesian average: (v/(v+m)) * R + (m/(v+m)) * C
    // v = votes for song, m = minimum votes threshold, R = avg rating, C = global avg
    const allRatings = snapshot.docs.map((d) => d.data().rating);
    const globalAvg = allRatings.length > 0 ? allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length : 3;
    const m = 2; // minimum votes to qualify

    const results: Array<{
        song_id: string;
        song_name: string;
        artist_name: string;
        average: number;
        count: number;
        bayesian: number;
    }> = [];

    songMap.forEach((data, songId) => {
        const v = data.ratings.length;
        const R = data.ratings.reduce((a, b) => a + b, 0) / v;
        const bayesian = (v / (v + m)) * R + (m / (v + m)) * globalAvg;
        results.push({
            song_id: songId,
            song_name: data.song_name,
            artist_name: data.artist_name,
            average: R,
            count: v,
            bayesian,
        });
    });

    // Sort by Bayesian average descending
    results.sort((a, b) => b.bayesian - a.bayesian);
    return results.slice(0, 100);
}

// ─── User Reviews (for profile) ───
export async function getUserReviewsAction(idToken: string): Promise<Review[]> {
    if (!idToken) throw new Error("Unauthorized: Missing ID token");
    let decodedToken;
    try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
        throw new Error("Unauthorized: Invalid ID token");
    }

    await checkRateLimit("get-user-reviews", 30);

    const snapshot = await adminDb
        .collection("reviews")
        .where("user_id", "==", decodedToken.uid)
        .where("deleted_at", "==", null)
        .orderBy("created_at", "desc")
        .limit(50)
        .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Review[];
}

// Utility re-export
export { extractLastFmImage };
