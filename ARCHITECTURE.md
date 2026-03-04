# SongDB Architecture

## Stack
- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Framer Motion (for cinematic, smooth micro-interactions) + Lucide React (icons)
- **Backend**: Next.js Server Components / Server Actions
- **Database**: Firebase (Firestore for NoSQL data, Firebase Storage for assets if needed)
- **Caching/State**: React Query (TanStack Query) for client-side mutations/pagination, Zustand for global UI state (Player Bar state)
- **Deployment**: Vercel (Next.js) + Firebase stack

## Folder Structure
```text
/SongDB
├── ARCHITECTURE.md
├── DB_SCHEMA.md
├── API_CONTRACT.md
├── .env.local              <- secrets (NEVER in git)
├── .env.example            <- key names only
├── package.json
├── src/
│   ├── app/                <- Next.js App Router
│   ├── components/         <- Reusable animated UI atoms/molecules
│   ├── lib/                <- Firebase admin & client setups, external API wrappers
│   ├── hooks/              <- React Query hooks
│   ├── store/              <- Zustand store (Player Bar state)
│   ├── types/              <- TypeScript shared interfaces/Zod schemas
│   └── styles/             <- Tailwind globals
```

## Data Flow
- **Server Components** fetch critical initial data (e.g., Artist bio, Top Songs) directly from Firestore or APIs to ensure SEO and fast First Contentful Paint. Use Firebase Admin SDK on the server.
- **Client Components** will use React Query for subsequent interactivity, real-time search filtering, and paginated lists using Firebase Client SDK where appropriate, but heavily lean on Next.js Server Actions for secure operations.
- External APIs (Last.fm, MusicBrainz, YouTube, News API, Cohere) are accessed strictly via Server Actions / Route Handlers to hide API keys from the client and to cache requests.
- Framer Motion provides page transition states and highly polished hover/scale effects adhering to the cinematic aesthetic (`#0a0a0a` background with `#f59e0b` accents).

## Threat Model & Security
- **Injection:** All incoming inputs validated via `zod`.
- **XSS:** Next.js escapes HTML by default. When rendering external bios/lyrics, `DOMPurify` will be run server-side before shipping to the client, or handled via controlled client sanitization.
- **Auth:** Firebase Auth.
- **Rate Limit / Caching:** Next.js fetch caching used aggressively for public API datasets (e.g., News and Musicbrainz).
