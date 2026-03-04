# SongDB Database Schema (Firestore)

## Collections Overview

### 1. `songs`
- `_id` (auto-generated doc ID)
- `title` (string, Not Null)
- `artist_id` (string, ref -> `artists._id`, Not Null)
- `album_id` (string, ref -> `albums._id`, Nullable)
- `lastfm_mbid` (string, Nullable)
- `youtube_url` (string, Nullable)
- `cover_art` (string, Nullable)
- `play_count` (number, default 0)
- `genres` (array of strings, default [])
- `release_year` (number, Nullable)
- `cohere_embedding` (array of numbers, length 1024, Nullable) - *Used for semantic search in Firebase using exact KNN/Vector Search if supported by Firebase extensions, or fetched to server for memory similarity if datasets are small.* 
- `ai_summary` (string, Nullable)
- `created_at` (timestamp, server default)
- `updated_at` (timestamp, server default)
- `deleted_at` (timestamp, Nullable)

### 2. `artists`
- `_id` (auto-generated doc ID)
- `name` (string, Not Null)
- `bio` (string, Nullable)
- `image_url` (string, Nullable)
- `lastfm_url` (string, Nullable)
- `musicbrainz_id` (string, Nullable)
- `monthly_listeners` (number, default 0)
- `created_at` (timestamp, server default)
- `updated_at` (timestamp, server default)
- `deleted_at` (timestamp, Nullable)

### 3. `albums`
- `_id` (auto-generated doc ID)
- `title` (string, Not Null)
- `artist_id` (string, ref -> `artists._id`, Not Null)
- `release_year` (number, Nullable)
- `cover_art` (string, Nullable)
- `total_tracks` (number, default 0)
- `created_at` (timestamp, server default)
- `updated_at` (timestamp, server default)
- `deleted_at` (timestamp, Nullable)

### 4. `reviews`
- `_id` (auto-generated doc ID)
- `user_id` (string, ref -> `users._id`, Not Null)
- `song_id` (string, ref -> `songs._id`, Not Null)
- `rating` (number, Not Null, 1-5 range validated in app layer and security rules)
- `review_text` (string, Not Null)
- `created_at` (timestamp, server default)
- `updated_at` (timestamp, server default)
- `deleted_at` (timestamp, Nullable)

### 5. `users` (App Profile bound to Firebase Auth)
- `_id` (UID from Firebase Auth)
- `email` (string, Not Null, Unique)
- `username` (string, Not Null, Unique)
- `avatar_url` (string, Nullable)
- `created_at` (timestamp, server default)
- `updated_at` (timestamp, server default)
- `deleted_at` (timestamp, Nullable)

## Firestore Security Rules

*Default constraint*: **DENY ALL** on all collections.

### `users`
- **Read**: Public read access to `username` and `avatar_url`.
- **Create**: Handled by Cloud Functions upon Auth creation.
- **Update/Delete**: `request.auth.uid == resource.id`.

### `songs`, `artists`, `albums`
- **Read**: Available if `deleted_at` is null.
- **Write**: **Admin SDK / Cloud Functions Only** (modified via background jobs / server actions).

### `reviews`
- **Read**: Public.
- **Create**: `request.auth.uid == request.resource.data.user_id` and valid rating.
- **Update/Delete**: `request.auth.uid == resource.data.user_id`.
