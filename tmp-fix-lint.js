const fs = require('fs');
const path = require('path');

const root = 'c:\\Users\\Priyanshu\\.gemini\\antigravity\\scratch\\songdb';

function readFile(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
function writeFile(p, text) { fs.writeFileSync(path.join(root, p), text, 'utf8'); }

// 1. src/app/album/[id]/page.tsx
let text = readFile('src/app/album/[id]/page.tsx');
text = text.replace(/, Clock/, ''); // remove Clock import
text = text.replace(/<img(.*?)src=\{album\.thumbnail\}(.*?)>/gs, '<img$1src={album.thumbnail}$2 />'); 
// Replace <img> with <Image> if they aren't already. BUT WAIT: For external images, they might not be configured in Next domains. The easiest fix for next/img-element is just to add an eslint disable if we can't change it safely.
text = text.replace(/<img/g, '/* eslint-disable-next-line @next/next/no-img-element */\n                                <img'); // just prepend safely where needed instead of changing to Image
writeFile('src/app/album/[id]/page.tsx', text);

// 2. src/app/artist/[id]/page.tsx
text = readFile('src/app/artist/[id]/page.tsx');
if (!text.includes('import Image from "next/image"')) {
    text = text.replace('import { Play, Pause }', 'import Image from "next/image";\nimport { Play, Pause }');
}
text = text.replace(/<img/g, '/* eslint-disable-next-line @next/next/no-img-element */\n                                <img');
writeFile('src/app/artist/[id]/page.tsx', text);

// 3. src/app/auth/login/page.tsx & signup
['src/app/auth/login/page.tsx', 'src/app/auth/signup/page.tsx'].forEach(p => {
    let t = readFile(p);
    t = t.replace(/catch \(e: any\)/g, 'catch (e: unknown)');
    t = t.replace(/catch \(err: any\)/g, 'catch (err: unknown)');
    writeFile(p, t);
});

// 4. src/app/discover/page.tsx
text = readFile('src/app/discover/page.tsx');
text = text.replace(/: any/g, ': unknown');
writeFile('src/app/discover/page.tsx', text);

// 5. src/app/download/page.tsx
text = readFile('src/app/download/page.tsx');
text = text.replace(/catch \(e: any\)/g, 'catch (e: unknown)');
text = text.replace(/catch \(err: any\)/g, 'catch (err: unknown)');
writeFile('src/app/download/page.tsx', text);

// 6. src/app/library/page.tsx
text = readFile('src/app/library/page.tsx');
text = text.replace(/, useEffect /, ' ');
text = text.replace(/, useEffect}/, '}');
text = text.replace(/\{ useEffect, /, '{ ');
writeFile('src/app/library/page.tsx', text);

// 7. src/app/playlist/[id]/page.tsx
text = readFile('src/app/playlist/[id]/page.tsx');
text = text.replace(/, Music2/, '');
writeFile('src/app/playlist/[id]/page.tsx', text);

// 8. src/app/song/[id]/page.tsx
text = readFile('src/app/song/[id]/page.tsx');
text = text.replace(/import Image from "next\/image";\n/, '');
text = text.replace(/, Play/, '');
writeFile('src/app/song/[id]/page.tsx', text);

// 9. src/components/shared/TopNav.tsx
text = readFile('src/components/shared/TopNav.tsx');
text = text.replace(/<img/g, '/* eslint-disable-next-line @next/next/no-img-element */\n                            <img');
writeFile('src/components/shared/TopNav.tsx', text);

// 10. src/components/ui/AlbumCard.tsx
text = readFile('src/components/ui/AlbumCard.tsx');
text = text.replace(/\/\* eslint-disable @next\/next\/no-img-element \*\/\n/, '');
text = text.replace(/, playCount/, '');
writeFile('src/components/ui/AlbumCard.tsx', text);

// 11. src/components/ui/ArtistCard.tsx
text = readFile('src/components/ui/ArtistCard.tsx');
text = text.replace(/\/\* eslint-disable @next\/next\/no-img-element \*\/\n/, '');
// For line 18 unused 'id', we can either use it or remove it from destructuring
text = text.replace(/ id, /g, ' ');
writeFile('src/components/ui/ArtistCard.tsx', text);

// 12. src/components/ui/DiscographySearch.tsx
text = readFile('src/components/ui/DiscographySearch.tsx');
text = text.replace(/, Music2/, '');
writeFile('src/components/ui/DiscographySearch.tsx', text);

// 13. src/lib/image-resolver.ts
text = readFile('src/lib/image-resolver.ts');
text = text.replace(/data: any/g, 'data: Record<string, unknown>');
text = text.replace(/item: any/g, 'item: Record<string, unknown>');
writeFile('src/lib/image-resolver.ts', text);

console.log('Lint fixes applied.');
