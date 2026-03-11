/**
 * Dynamic gradient generation for image placeholders.
 * Used across the app when cover art / artist photos are unavailable.
 */

/* ── Tailwind-class based gradients (for inline JSX usage) ── */
const GRADIENT_CLASSES = [
    'from-violet-600 via-fuchsia-500 to-pink-500',
    'from-rose-600 via-pink-500 to-orange-400',
    'from-amber-500 via-orange-500 to-red-600',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-blue-600 via-indigo-500 to-violet-600',
    'from-pink-500 via-rose-400 to-amber-400',
    'from-teal-500 via-cyan-400 to-sky-500',
    'from-sky-500 via-blue-500 to-indigo-600',
    'from-fuchsia-600 via-purple-500 to-indigo-500',
    'from-primary via-secondary to-accent',
    'from-lime-500 via-emerald-500 to-teal-600',
    'from-cyan-400 via-sky-500 to-blue-600',
    'from-purple-500 via-violet-500 to-fuchsia-500',
    'from-red-500 via-rose-500 to-pink-500',
    'from-indigo-500 via-blue-500 to-cyan-500',
    'from-yellow-400 via-amber-500 to-orange-600',
];

/** Hash a string to a stable number */
function stableHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/**
 * Returns a Tailwind gradient class string (e.g. "from-violet-600 via-fuchsia-500 to-pink-500").
 * Deterministic for a given name string.
 */
export function getGradientClass(name: string): string {
    return GRADIENT_CLASSES[stableHash(name) % GRADIENT_CLASSES.length];
}

/**
 * Returns rich, multi-layer CSS gradient styles for image-missing placeholders.
 * Full-spectrum hues with high saturation and a noise overlay for a premium "filled" look.
 */
export function getDynamicGradientStyle(name: string = '') {
    if (!name) {
        return {
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 50%, var(--color-card) 100%)',
        };
    }

    const hash = stableHash(name);

    // Full-spectrum hues (0°-360°)
    const h1 = hash % 360;
    const h2 = (h1 + 40 + ((hash >> 2) % 60)) % 360;   // 40-100° offset
    const h3 = (h1 + 120 + ((hash >> 4) % 80)) % 360;   // complementary accent

    // High saturation (65%-95%) for vibrant look
    const s1 = 65 + ((hash >> 1) % 30);
    const s2 = 70 + ((hash >> 3) % 25);
    const s3 = 75 + ((hash >> 5) % 20);

    // Medium lightness (35%-55%) — vivid, not dim
    const l1 = 35 + ((hash >> 2) % 20);
    const l2 = 38 + ((hash >> 4) % 17);
    const l3 = 40 + ((hash >> 6) % 15);

    const angle = hash % 360;
    const x = 20 + (hash % 60);
    const y = 20 + ((hash >> 3) % 60);

    // Secondary radial position (mesh effect)
    const x2 = 60 + ((hash >> 2) % 30);
    const y2 = 50 + ((hash >> 4) % 40);

    return {
        backgroundImage: `
            radial-gradient(ellipse at ${x}% ${y}%, hsl(${h3}, ${s3}%, ${l3}%) 0%, transparent 55%),
            radial-gradient(ellipse at ${x2}% ${y2}%, hsl(${h2}, ${s2}%, ${Math.min(l2 + 10, 55)}%) 0%, transparent 50%),
            linear-gradient(${angle}deg, hsl(${h1}, ${s1}%, ${l1}%) 0%, hsl(${h2}, ${s2}%, ${l2}%) 50%, hsl(${h3}, ${s3}%, ${l3 - 5}%) 100%),
            repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%)
        `,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%, 30px 30px',
        backgroundColor: `hsl(${h1}, ${s1}%, ${l1}%)`,
    };
}
