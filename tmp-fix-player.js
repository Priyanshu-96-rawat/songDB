const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\Priyanshu\\.gemini\\antigravity\\scratch\\songdb';
const file = path.join(projectRoot, 'src', 'components', 'player', 'YoutubePlayer.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Destructure isDisliked and toggleDislike
content = content.replace(
    /const \{ isLiked, toggleLike \} = useLibraryStore\(\);/,
    `const { isLiked, isDisliked, toggleLike, toggleDislike } = useLibraryStore();`
);

// 2. Add disliked boolean
content = content.replace(
    /const liked = currentTrack \? isLiked\(currentTrack\.videoId\) : false;/,
    `const liked = currentTrack ? isLiked(currentTrack.videoId) : false;\n    const disliked = currentTrack ? isDisliked(currentTrack.videoId) : false;`
);

// 3. Update handleDownvote
const oldHandleDownvote = `    const handleDownvote = () => {
        if (liked) toggleLike(currentTrack);
        nextTrack();
    };`;

const newHandleDownvote = `    const handleDownvote = () => {
        if (!currentTrack) return;
        toggleDislike(currentTrack);
        if (!disliked) {
            nextTrack();
        }
    };`;
content = content.replace(oldHandleDownvote, newHandleDownvote);

// 4. Update large button (line ~362)
const oldLargeBtn = `<button type="button" onClick={handleDownvote} className={\`\${chromeButton} h-10 px-4\`}>\\<ThumbsDown className="mr-2 h-4 w-4" \\/>Skip\\<\\/button>`;
// Match more flexibly due to possible formatting differences
content = content.replace(
    /<button type="button" onClick=\{handleDownvote\} className=\{\`\$\{chromeButton\} h-10 px-4\`\}><ThumbsDown className="mr-2 h-4 w-4" \/>Skip<\/button>/,
    `<button type="button" onClick={handleDownvote} className={\`\${chromeButton} h-10 px-4 \${disliked ? "text-[var(--color-primary)]" : ""}\`} style={disliked ? accentStyle() : undefined}><ThumbsDown className={\`mr-2 h-4 w-4 \${disliked ? "fill-current" : ""}\`} />{disliked ? "Skipped" : "Skip"}</button>`
);

// 5. Update small button (line ~590)
content = content.replace(
    /<button type="button" onClick=\{handleDownvote\} className=\{\`\$\{chromeButton\} h-10 w-10\`\} aria-label="Skip track"><ThumbsDown className="h-4 w-4" \/><\/button>/,
    `<button type="button" onClick={handleDownvote} className={\`\${chromeButton} h-10 w-10 \${disliked ? "text-[var(--color-primary)]" : ""}\`} style={disliked ? accentStyle() : undefined} aria-label={disliked ? "Undislike track" : "Skip track"}><ThumbsDown className={\`h-4 w-4 \${disliked ? "fill-current" : ""}\`} /></button>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('YoutubePlayer updated successfully.');
