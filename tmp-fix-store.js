const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\Priyanshu\\.gemini\\antigravity\\scratch\\songdb';
const file = path.join(projectRoot, 'src', 'store', 'library.ts');
let content = fs.readFileSync(file, 'utf8');

const targetContent = `    isLiked: (videoId: string) => {
        return get().likedSongs.some(t => t.videoId === videoId);
    },

    toggleLike: (track: YouTubeTrack) => {
        const current = get().likedSongs;
        const exists = current.some(t => t.videoId === track.videoId);
        const updated = exists
            ? current.filter(t => t.videoId !== track.videoId)
            : [track, ...current];
        set({ likedSongs: updated });
        saveToStorage(LIKED_STORAGE_KEY, updated);
    },`;

const replacementContent = `    isLiked: (videoId: string) => {
        return get().likedSongs.some(t => t.videoId === videoId);
    },

    isDisliked: (videoId: string) => {
        return get().dislikedSongs.some(t => t.videoId === videoId);
    },

    toggleLike: (track: YouTubeTrack) => {
        const { likedSongs, dislikedSongs } = get();
        const exists = likedSongs.some(t => t.videoId === track.videoId);
        const updatedLiked = exists
            ? likedSongs.filter(t => t.videoId !== track.videoId)
            : [track, ...likedSongs];

        const updatedDisliked = dislikedSongs.filter(t => t.videoId !== track.videoId);

        set({ likedSongs: updatedLiked, dislikedSongs: updatedDisliked });
        saveToStorage(LIKED_STORAGE_KEY, updatedLiked);
        saveToStorage(DISLIKED_STORAGE_KEY, updatedDisliked);
    },

    toggleDislike: (track: YouTubeTrack) => {
        const { likedSongs, dislikedSongs } = get();
        const exists = dislikedSongs.some(t => t.videoId === track.videoId);
        const updatedDisliked = exists
            ? dislikedSongs.filter(t => t.videoId !== track.videoId)
            : [track, ...dislikedSongs];

        const updatedLiked = likedSongs.filter(t => t.videoId !== track.videoId);

        set({ dislikedSongs: updatedDisliked, likedSongs: updatedLiked });
        saveToStorage(DISLIKED_STORAGE_KEY, updatedDisliked);
        saveToStorage(LIKED_STORAGE_KEY, updatedLiked);
    },`;

if (content.includes(targetContent)) {
    content = content.replace(targetContent, replacementContent);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully replaced missing store methods');
} else {
    // try removing carriage returns for comparison
    const targetNoCR = targetContent.replace(/\r/g, '');
    const contentNoCR = content.replace(/\r/g, '');
    if (contentNoCR.includes(targetNoCR)) {
        content = contentNoCR.replace(targetNoCR, replacementContent);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Successfully replaced missing store methods (CR removed)');
    } else {
        console.error('Target content still not found!');
        console.error('Content starts with:', content.substring(content.indexOf('isLiked:')));
    }
}
