# SongDB Task Plan

Last synchronized: March 11, 2026

## Milestones

| Phase | Milestone | Outcome |
| --- | --- | --- |
| 0 | Planning baseline | `ARCHITECTURE.md`, `DB_SCHEMA.md`, and `TASKS.md` describe the current system and target direction |
| 1 | Foundation hardening | environment, route contracts, and shared types are stable |
| 2 | Data model completion | Firestore schema, rules, and indexes support current and planned features |
| 3 | Backend service completion | provider adapters, server actions, and route handlers are consistent and testable |
| 4 | Search and discovery completion | search, shelves, artist pages, album pages, and playlist routes all use consistent contracts |
| 5 | Playback and library completion | player, queue, lyrics, up-next, local library, and cloud favorites work together cleanly |
| 6 | Account and community completion | auth flows, profile, favorites, reviews, and top-rated views are production-ready |
| 7 | Security and resilience | abuse controls, sanitization, observability, and secret handling are in place |
| 8 | Testing and release | automated coverage, manual QA, and deployment checks are green |

## Backend Tasks

1. Consolidate response shapes across `src/app/api/music/*` and `src/app/api/youtube-music/*` so success, error, and empty states are predictable.
2. Introduce shared DTO types for tracks, artists, albums, playlists, shelves, and detail payloads to remove drift between route handlers and UI consumers.
3. Finish multi-entity search support so `songs`, `artists`, `albums`, and `playlists` tabs return real data instead of the current songs-only fallback.
4. Normalize detail-page identifier handling so song, artist, and album routes can rely on stable IDs instead of route strings and split heuristics.
5. Separate provider orchestration from server actions by moving provider-composition logic into dedicated application services under `src/lib`.
6. Extend the shared cache strategy beyond the implemented home and explore shelf caches to suggestions, structured lyrics, related content, and other hot endpoints.
7. Replace in-memory rate limiting with a durable shared strategy if the app will run on multiple instances.
8. Add an aggregation path for top-rated content so rankings do not require full review scans at larger scale.
9. Add background sync or on-demand cache population for `songs`, `artists`, and `albums` if Firestore becomes the catalog of record.
10. Commit a formal API contract update after backend payloads are stabilized.

## Frontend Tasks

1. Keep the global app shell stable across routes and finish PWA polish around manifest, service worker, and installability behavior.
2. Complete the search experience so all tabs show live data, loading states, and empty states consistently.
3. Continue standardizing page-level data loading patterns using the new server-rendered discovery approach as the baseline for other routes.
4. Unify the two library models: local liked songs, recent history, playlists, and cloud favorites should present a coherent user story.
5. Finish player UX details for queue editing, play-next insertion, playlist actions, sleep timer behavior, bass and sound controls, autoplay behavior, true caption sync plus estimated lyric timing fallback, error recovery, and progress syncing.
6. Replace remaining plain `<img>` usage where appropriate or document why raw images are required for specific provider URLs.
7. Improve route-to-route navigation consistency for song, artist, album, and playlist detail pages.
8. Add explicit offline and degraded-network states for streaming, metadata fetches, and auth-protected actions.
9. Audit accessibility across the player, forms, tabs, and keyboard navigation flows.
10. Align visual language across legacy pages and newer YouTube Music-style pages.
11. Continue expanding hydration-safe personalization so home, quick picks, and library surfaces adapt to local listening data, artist affinity, and time-of-day without SSR/client mismatches.
12. Expand the new mixed music-flow feed with deeper ranking, richer metadata, and stronger mobile-first swipe behavior.

## Database Tasks

1. Finalize the canonical Firestore entity set: `reviews`, `favorites`, `users`, `songs`, `artists`, and `albums`.
2. Define stable ID rules for catalog entities so reviews and favorites can stop depending on route strings.
3. Add `favorites` coverage to `firestore.rules` to match the already-implemented server actions.
4. Create and commit the required Firestore composite indexes for reviews and favorites.
5. Decide whether implemented collections will keep ISO-string timestamps or migrate to Firestore `Timestamp`.
6. Add a migration plan for existing review and favorite documents if identifier shapes or timestamp types change.
7. Design and implement the optional `users` mirror document if public profile data must live outside Firebase Auth.
8. Populate reserved catalog collections only after the ID strategy, sync policy, and invalidation rules are agreed.
9. Add denormalization rules for display fields so profile and list screens stay fast without uncontrolled drift.
10. Document any new collections or fields immediately in `DB_SCHEMA.md`.

## Security Tasks

1. Keep all secret-backed provider calls on the server and audit routes for accidental client exposure.
2. Keep `favorites` rules aligned with server action behavior and review any public-read assumptions for future catalog collections.
3. Review token verification flows in server actions and centralize auth guard helpers where possible.
4. Harden input validation and route throttling for handlers and server actions so all external-facing inputs are Zod-validated and abuse-resistant.
5. Sanitize or strip third-party rich text before render, especially artist bios, summaries, and news content.
6. Decide on an abuse-control strategy for search, lyrics, stream, and review endpoints beyond the current in-memory limiter.
7. Audit environment-variable handling and secret rotation expectations for Firebase, Cohere, Last.fm, News API, and YouTube.
8. Add structured error logging that avoids leaking secrets, provider payloads, or user tokens.

## Testing Tasks

1. Add unit tests for Zod schemas, identifier parsing, and normalization helpers.
2. Add integration tests for route handlers that wrap YouTube and YouTube Music services.
3. Add Firestore emulator tests for review creation, favorite toggling, and security rule enforcement.
4. Add component tests for player controls, search tabs, review submission, and favorite toggling.
5. Add end-to-end tests for the primary user journeys: search, play, favorite, review, profile, and top-rated views.
6. Add regression tests for range-based audio streaming and player state recovery after navigation.
7. Add manual QA scripts for auth provider flows, service worker behavior, and slow-network scenarios.
8. Gate release on `lint`, automated tests, and a documented smoke-test checklist.
9. Fix the current missing-ESLint-tooling gap so `npm run lint` is enforceable in CI.

## Development Order

1. Keep the planning documents synchronized before feature work starts.
2. Finish schema, rule, and index decisions next because they affect route design and ID strategy.
3. Stabilize backend contracts before expanding frontend features that depend on them.
4. Complete frontend discovery, detail pages, and playback once backend payloads stop moving.
5. Harden security and resilience before production rollout.
6. Finish automated and manual testing before deployment.

## Documentation Maintenance Rule

Whenever architecture, schema, or delivery order changes, update `ARCHITECTURE.md`, `DB_SCHEMA.md`, and this file in the same change set.
