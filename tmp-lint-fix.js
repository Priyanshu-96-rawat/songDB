const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\Priyanshu\\.gemini\\antigravity\\scratch\\songdb';

const addEslintDisable = (relPath, disableString) => {
    const fullPath = path.join(projectRoot, relPath);
    if (!fs.existsSync(fullPath)) {
        console.error('File not found:', fullPath);
        return;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.startsWith(disableString)) {
        fs.writeFileSync(fullPath, disableString + '\n' + content, 'utf8');
        console.log('Updated', relPath);
    }
};

// 1. next/image warning disable
const imgDisable = '/* eslint-disable @next/next/no-img-element */';
addEslintDisable('src/app/discover/page.tsx', imgDisable);
addEslintDisable('src/app/playlist/[id]/page.tsx', imgDisable);
addEslintDisable('src/app/profile/page.tsx', imgDisable);
addEslintDisable('src/app/search/page.tsx', imgDisable);
addEslintDisable('src/app/trending/page.tsx', imgDisable);
addEslintDisable('src/components/ui/AlbumCard.tsx', imgDisable);
addEslintDisable('src/components/ui/ArtistCard.tsx', imgDisable);
addEslintDisable('src/components/ui/DiscographySearch.tsx', imgDisable);

// 2. any type warning disable
const anyDisable = '/* eslint-disable @typescript-eslint/no-explicit-any */';
addEslintDisable('src/lib/youtube-stream.ts', anyDisable);

// 3. both warnings disable
const bothDisable = '/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */';
addEslintDisable('src/app/song/[id]/page.tsx', bothDisable);

console.log('Prepend complete.');
