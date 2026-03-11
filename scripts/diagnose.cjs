/* eslint-disable @typescript-eslint/no-require-imports */
// Diagnostic script to see what youtubei.js actually returns
const Innertube = require('youtubei.js');

async function diagnose() {
    console.log('Creating Innertube client...');
    const yt = await Innertube.create({
        lang: 'en',
        location: 'US',
        retrieve_player: false,
    });

    // 1. Test music search
    console.log('\n\n=== MUSIC SEARCH: "Shape of You" ===');
    try {
        const search = await yt.music.search('Shape of You');
        console.log('Search type:', typeof search);
        console.log('Search keys:', Object.keys(search));

        // Check for contents/results/sections
        const possibleArrayKeys = ['results', 'contents', 'sections', 'items', 'shelves'];
        for (const key of possibleArrayKeys) {
            if (search[key]) {
                console.log(`  search.${key} exists, type: ${typeof search[key]}, isArray: ${Array.isArray(search[key])}, length: ${search[key]?.length}`);
                if (Array.isArray(search[key]) && search[key].length > 0) {
                    const first = search[key][0];
                    console.log(`  First item type property:`, first?.type);
                    console.log(`  First item keys:`, Object.keys(first || {}));
                    console.log(`  First item JSON (partial):`, JSON.stringify(first, null, 2).slice(0, 800));
                }
            }
        }

        // If search itself is iterable
        if (typeof search[Symbol.iterator] === 'function') {
            console.log('  Search is iterable!');
            const arr = [...search];
            console.log('  Iterable length:', arr.length);
            if (arr.length > 0) {
                console.log('  First iterable item:', JSON.stringify(arr[0], null, 2).slice(0, 500));
            }
        }

        // Try direct property access on the search object
        if (search.header) console.log('  search.header:', JSON.stringify(search.header, null, 2).slice(0, 300));
        if (search.page) console.log('  search.page keys:', Object.keys(search.page || {}));

    } catch (err) {
        console.error('Search error:', err.message);
    }

    // 2. Test regular YouTube search (non-music)
    console.log('\n\n=== REGULAR YOUTUBE SEARCH: "Shape of You" ===');
    try {
        const search = await yt.search('Shape of You', { type: 'video' });
        console.log('Search type:', typeof search);
        console.log('Search keys:', Object.keys(search));

        const possibleArrayKeys = ['results', 'contents', 'videos', 'items'];
        for (const key of possibleArrayKeys) {
            if (search[key]) {
                console.log(`  search.${key} exists, length: ${search[key]?.length}`);
                if (Array.isArray(search[key]) && search[key].length > 0) {
                    const first = search[key][0];
                    console.log(`  First item type:`, first?.type);
                    console.log(`  First item keys:`, Object.keys(first || {}).slice(0, 20));
                    // Look for video-specific fields
                    console.log(`  First item id:`, first?.id);
                    console.log(`  First item title:`, first?.title?.toString?.());
                    console.log(`  First item author:`, first?.author?.name);
                    console.log(`  First item duration:`, JSON.stringify(first?.duration));
                    console.log(`  First item thumbnails:`, first?.thumbnails?.[0]?.url?.slice(0, 80));
                }
            }
        }
    } catch (err) {
        console.error('Regular search error:', err.message);
    }

    // 3. Test search suggestions
    console.log('\n\n=== SEARCH SUGGESTIONS: "shape" ===');
    try {
        const sug = await yt.getSearchSuggestions('shape');
        console.log('Suggestions type:', typeof sug, 'isArray:', Array.isArray(sug));
        console.log('Suggestions:', sug?.slice(0, 5));
    } catch (err) {
        console.error('Suggestions error:', err.message);
    }

    console.log('\nDiagnostic complete.');
}

diagnose().catch(console.error);
