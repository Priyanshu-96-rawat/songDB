# SongDB API Contract

## Standard Response Envelopes
All API responses map to the following schema:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}
```

## Endpoints

### 1. Unified Search `GET /api/search`
- **Method**: GET
- **Auth Level**: Public
- **Input Query**: `?q=SEARCH_TERM&type=all|songs|artists|albums`
- **Output Data**: `{ songs: Song[], artists: Artist[], albums: Album[] }`
- **Description**: Real-time unified search utilizing MusicBrainz (fallback) and Firestore queries/text search mechanisms.

### 2. Homepage Feeds `GET /api/home`
- **Method**: GET
- **Auth Level**: Public
- **Input Query**: None
- **Output Data**: `{ featuredDay: Song, trending: Song[], topArtists: Artist[], newReleases: Album[] }`
- **Description**: Pulls Last.fm charts (cached globally using Next.js `revalidate: 3600`) and structured app data.

### 3. Song Details & AI Similar Semantics `GET /api/songs/[id]`
- **Method**: GET
- **Auth Level**: Public
- **Input Query**: None
- **Output Data**: 
  ```json
  {
    "song": Song, 
    "tags": string[],
    "youtubeId": string, 
    "aiSummary": string, 
    "similarSongs": Song[],
    "lyrics": string
  }
  ```
- **Description**: Pulls song from Firestore. Calculates Cohere embedding similarity against the database. Queries YouTube API under the hood if `youtube_url` is missing. 

### 4. Fetch Artist Discography `GET /api/artists/[id]/discography`
- **Method**: GET
- **Auth Level**: Public
- **Input Params**: `mbid` (MusicBrainz ID) or `artist_name`
- **Output Data**: `{ albums: Album[], topSongs: Song[] }`
- **Description**: Connects to MusicBrainz Release API to fetch structured year-by-year discography, alongside Last.fm `artist.getTopTracks`.

### 5. Artist/Song News `GET /api/news`
- **Method**: GET
- **Auth Level**: Public
- **Input Query**: `?q=ENTITY_NAME`
- **Output Data**: `{ articles: NewsArticle[] }`
- **Description**: Connects to News API `everything`. Heavily cached (revalidate 1 day) to respect the 100 req/day API limit.

### 6. Create Review `POST /api/reviews`
- **Method**: POST
- **Auth Level**: Authenticated User Only (`auth.uid() = user_id`)
- **Input Body**: `{ song_id: string, rating: number, review_text: string }`
- **Output Data**: `{ review: Review }`
- **Description**: Validates input via Zod. Adds a user review for a specific song in Firestore.

### 7. Music Search `GET /api/music/search`
- **Method**: GET
- **Auth Level**: Public / Rate Limited
- **Input Query**: `?q=QUERY`
- **Output Data**: `{ tracks: YouTubeTrack[] }`
- **Description**: Uses `youtubei.js` to search for tracks and returns video ID, title, thumbnails, duration, and artist name.

### 8. Music Stream Metadata `GET /api/music/info`
- **Method**: GET
- **Auth Level**: Public / Rate Limited
- **Input Query**: `?id=VIDEO_ID`
- **Output Data**: `{ info: TrackMetadata }`
- **Description**: Uses `youtubei.js` to get full metadata for a given video ID to supplement search context.

### 9. Music Audio Stream Proxy `GET /api/youtube-stream`
- **Method**: GET
- **Auth Level**: Public / Rate Limited (High Bandwidth)
- **Input Query**: `?id=VIDEO_ID`
- **Output Data**: Binary Audio Stream / ArrayBuffer
- **Description**: Resolves the highest-quality playable audio stream via direct extraction scoring, proxies the stream chunks to the frontend `HTMLAudioElement`, and exposes chosen codec/container/bitrate in response headers for debugging. Supports partial 206 responses.

### 10. Synced Lyrics `GET /api/youtube-music/lyrics`
- **Method**: GET
- **Auth Level**: Public / Rate Limited
- **Input Query**: `?id=VIDEO_ID&durationSeconds=OPTIONAL_TRACK_DURATION`
- **Output Data**:
  ```json
  {
    "text": "full lyrics text",
    "lines": [
      { "text": "line one", "startMs": 0, "endMs": 2400 }
    ],
    "synced": true,
    "source": "captions",
    "timingMode": "synced"
  }
  ```
- **Description**: Returns caption-derived timed lyric lines when available. If only official plain lyrics exist, the API can derive lightweight estimated timings from the known track duration so the player can still advance lines progressively.

## Rate Limiting Targets
- **Public GET feeds**: 60 req/min/IP
- **Authenticated Reviews/Creates**: 20 req/min/User
- **Auth routes**: 5 req/min/IP
