import * as admin from 'firebase-admin';

// Initialize Firebase Admin (standalone script — doesn't use next.js env)
// Load environment variables from .env.local
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
    try {
        const envPath = resolve(process.cwd(), '.env.local');
        const envContent = readFileSync(envPath, 'utf8');
        for (const line of envContent.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) continue;
            const key = trimmed.slice(0, eqIndex).trim();
            let value = trimmed.slice(eqIndex + 1).trim();
            // Strip surrounding quotes
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    } catch (e) {
        console.error('Could not read .env.local:', e);
        process.exit(1);
    }
}

loadEnv();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                : undefined,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        }),
    });
}

const db = admin.firestore();

async function seedDatabase() {
    console.log('🌱 Seeding Firestore Database...\n');

    try {
        // ── 1. Seed Artists ──
        const artists = [
            {
                name: "Hans Zimmer",
                bio: "German film score composer and music producer known for Inception, Interstellar, The Dark Knight.",
                image_url: "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png",
                lastfm_url: "https://www.last.fm/music/Hans+Zimmer",
                musicbrainz_id: "e6de1f3b-6484-491c-88dd-6d619f142abc",
                monthly_listeners: 15432000,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                name: "Daft Punk",
                bio: "French electronic music duo formed in 1993 in Paris. Known for Discovery, Random Access Memories.",
                image_url: "https://lastfm.freetls.fastly.net/i/u/300x300/0f84dd11d10243e8a4a5bb86dcbe582f.png",
                lastfm_url: "https://www.last.fm/music/Daft+Punk",
                musicbrainz_id: "12f068c2-39c7-4bce-b6a9-83bcad38bb79",
                monthly_listeners: 24500000,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                name: "The Weeknd",
                bio: "Canadian singer, songwriter, and record producer. Known for Blinding Lights, Starboy, After Hours.",
                image_url: "https://lastfm.freetls.fastly.net/i/u/300x300/98d2b78b0db9fecb99db101f3e0984a9.png",
                lastfm_url: "https://www.last.fm/music/The+Weeknd",
                musicbrainz_id: "c8b03190-306c-4120-bb0b-6f2ebfc67ea9",
                monthly_listeners: 105000000,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                name: "Radiohead",
                bio: "English rock band formed in 1985. Known for OK Computer, Kid A, In Rainbows.",
                image_url: null,
                lastfm_url: "https://www.last.fm/music/Radiohead",
                musicbrainz_id: "a74b1b7f-71a5-4011-9441-d0b5e4122711",
                monthly_listeners: 19200000,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                name: "Kendrick Lamar",
                bio: "American rapper and songwriter from Compton, California. Known for DAMN., good kid, m.A.A.d city.",
                image_url: null,
                lastfm_url: "https://www.last.fm/music/Kendrick+Lamar",
                musicbrainz_id: "381086ea-f511-4aba-bdf9-71c753dc5077",
                monthly_listeners: 52800000,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            }
        ];

        const artistIds: string[] = [];
        for (const artist of artists) {
            const docRef = await db.collection('artists').add(artist);
            artistIds.push(docRef.id);
            console.log(`  ✓ Artist: ${artist.name} → ${docRef.id}`);
        }
        console.log(`\n📦 Seeded ${artistIds.length} artists.\n`);

        // ── 2. Seed Albums ──
        const albums = [
            {
                title: "Interstellar (Original Motion Picture Soundtrack)",
                artist_id: artistIds[0],
                release_year: 2014,
                cover_art: "https://lastfm.freetls.fastly.net/i/u/300x300/a26c4f039bafe1e67bb939cbf8d95655.png",
                total_tracks: 16,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                title: "Discovery",
                artist_id: artistIds[1],
                release_year: 2001,
                cover_art: "https://lastfm.freetls.fastly.net/i/u/300x300/e68db86df33a466a9ed21262abff7c8b.png",
                total_tracks: 14,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                title: "After Hours",
                artist_id: artistIds[2],
                release_year: 2020,
                cover_art: "https://lastfm.freetls.fastly.net/i/u/300x300/9cbfa321d283c74eab8b95add54b51ad.png",
                total_tracks: 14,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                title: "OK Computer",
                artist_id: artistIds[3],
                release_year: 1997,
                cover_art: null,
                total_tracks: 12,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                title: "DAMN.",
                artist_id: artistIds[4],
                release_year: 2017,
                cover_art: null,
                total_tracks: 14,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            }
        ];

        const albumIds: string[] = [];
        for (const album of albums) {
            const docRef = await db.collection('albums').add(album);
            albumIds.push(docRef.id);
            console.log(`  ✓ Album: ${album.title} → ${docRef.id}`);
        }
        console.log(`\n📦 Seeded ${albumIds.length} albums.\n`);

        // ── 3. Seed Songs ──
        const songs = [
            {
                title: "Cornfield Chase",
                artist_id: artistIds[0],
                album_id: albumIds[0],
                lastfm_mbid: null,
                youtube_url: null,
                cover_art: "https://lastfm.freetls.fastly.net/i/u/300x300/a26c4f039bafe1e67bb939cbf8d95655.png",
                play_count: 54000000,
                genres: ["soundtrack", "instrumental", "ambient"],
                release_year: 2014,
                cohere_embedding: null,
                ai_summary: "An emotional, driving orchestral piece featuring a prominent organ motif that captures the vastness of space.",
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                title: "Harder, Better, Faster, Stronger",
                artist_id: artistIds[1],
                album_id: albumIds[1],
                lastfm_mbid: null,
                youtube_url: null,
                cover_art: "https://lastfm.freetls.fastly.net/i/u/300x300/e68db86df33a466a9ed21262abff7c8b.png",
                play_count: 125000000,
                genres: ["electronic", "house", "dance"],
                release_year: 2001,
                cohere_embedding: null,
                ai_summary: "A high-energy electronic dance track characterized by vocoder vocals and a catchy guitar riff.",
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                title: "Blinding Lights",
                artist_id: artistIds[2],
                album_id: albumIds[2],
                lastfm_mbid: null,
                youtube_url: null,
                cover_art: "https://lastfm.freetls.fastly.net/i/u/300x300/9cbfa321d283c74eab8b95add54b51ad.png",
                play_count: 3800000000,
                genres: ["synth pop", "rnb", "80s"],
                release_year: 2019,
                cohere_embedding: null,
                ai_summary: "An upbeat, 80s-inspired synthwave track with a driving bassline and melancholic lyrics.",
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                title: "Paranoid Android",
                artist_id: artistIds[3],
                album_id: albumIds[3],
                lastfm_mbid: null,
                youtube_url: null,
                cover_art: null,
                play_count: 89000000,
                genres: ["alternative rock", "art rock", "experimental"],
                release_year: 1997,
                cohere_embedding: null,
                ai_summary: "A multi-section progressive rock epic that shifts between acoustic melancholy and distorted aggression.",
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                title: "HUMBLE.",
                artist_id: artistIds[4],
                album_id: albumIds[4],
                lastfm_mbid: null,
                youtube_url: null,
                cover_art: null,
                play_count: 2100000000,
                genres: ["hip hop", "rap", "west coast"],
                release_year: 2017,
                cohere_embedding: null,
                ai_summary: "A hard-hitting hip-hop anthem with a minimalist piano riff and aggressive delivery.",
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                title: "No Time For Caution",
                artist_id: artistIds[0],
                album_id: albumIds[0],
                lastfm_mbid: null,
                youtube_url: null,
                cover_art: "https://lastfm.freetls.fastly.net/i/u/300x300/a26c4f039bafe1e67bb939cbf8d95655.png",
                play_count: 42000000,
                genres: ["soundtrack", "orchestral", "cinematic"],
                release_year: 2014,
                cohere_embedding: null,
                ai_summary: "The iconic docking scene cue — an intense crescendo of organ and strings that builds to a climactic peak.",
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                title: "Digital Love",
                artist_id: artistIds[1],
                album_id: albumIds[1],
                lastfm_mbid: null,
                youtube_url: null,
                cover_art: "https://lastfm.freetls.fastly.net/i/u/300x300/e68db86df33a466a9ed21262abff7c8b.png",
                play_count: 78000000,
                genres: ["electronic", "house", "disco"],
                release_year: 2001,
                cohere_embedding: null,
                ai_summary: "A dreamy electro-disco track with an euphoric guitar solo that evokes feelings of digital-age romance.",
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
        ];

        const songIds: string[] = [];
        for (const song of songs) {
            const docRef = await db.collection('songs').add(song);
            songIds.push(docRef.id);
            console.log(`  ✓ Song: ${song.title} → ${docRef.id}`);
        }
        console.log(`\n📦 Seeded ${songIds.length} songs.\n`);

        // ── 4. Seed Test User ──
        const testUser = {
            email: "testuser@songdb.dev",
            username: "MusicLover42",
            avatar_url: null,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            deleted_at: null
        };

        await db.collection('users').doc('test-user-001').set(testUser);
        console.log(`  ✓ User: ${testUser.username} → test-user-001`);
        console.log(`\n📦 Seeded 1 user.\n`);

        // ── 5. Seed Sample Reviews ──
        const reviews = [
            {
                user_id: "test-user-001",
                user_email: "testuser@songdb.dev",
                user_display_name: "MusicLover42",
                song_id: songIds[0],
                song_name: "Cornfield Chase",
                artist_name: "Hans Zimmer",
                rating: 5,
                review_text: "Absolutely breathtaking. The organ and strings weave together to create something that transcends cinema. Every single listen gives me chills.",
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                user_id: "test-user-001",
                user_email: "testuser@songdb.dev",
                user_display_name: "MusicLover42",
                song_id: songIds[2],
                song_name: "Blinding Lights",
                artist_name: "The Weeknd",
                rating: 4,
                review_text: "Perfect 80s nostalgia wrapped in modern production. The synths are iconic and it never gets old on repeat. Lost one star because it's a bit overplayed at this point.",
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            },
            {
                user_id: "test-user-001",
                user_email: "testuser@songdb.dev",
                user_display_name: "MusicLover42",
                song_id: songIds[4],
                song_name: "HUMBLE.",
                artist_name: "Kendrick Lamar",
                rating: 5,
                review_text: "Kendrick at his most direct and powerful. The minimalist beat paired with his confident delivery is pure hip-hop perfection.",
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                deleted_at: null
            }
        ];

        for (const review of reviews) {
            const docRef = await db.collection('reviews').add(review);
            console.log(`  ✓ Review: ${review.song_name} (${review.rating}★) → ${docRef.id}`);
        }
        console.log(`\n📦 Seeded ${reviews.length} reviews.\n`);

        console.log('✅ Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
