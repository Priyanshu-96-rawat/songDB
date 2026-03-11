/* eslint-disable @typescript-eslint/no-explicit-any */
import Innertube from 'youtubei.js';

async function diagnose() {
    console.log('Creating Innertube client...');
    const yt = await Innertube.create({
        lang: 'en',
        location: 'US',
        retrieve_player: false,
    });
    console.log('Client created OK');

    // 1. Regular YouTube search (more reliable than music search)
    console.log('\n=== REGULAR SEARCH: "Shape of You Ed Sheeran" ===');
    try {
        const search = await yt.search('Shape of You Ed Sheeran', { type: 'video' });
        console.log('Search keys:', Object.keys(search));
        console.log('results array?', Array.isArray(search.results));
        console.log('results length:', search.results?.length);

        if (search.results && search.results.length > 0) {
            const first = search.results[0] as any;
            console.log('First result type:', first?.type);
            console.log('First result keys:', Object.keys(first || {}).slice(0, 15));
            console.log('id:', first?.id);
            console.log('title:', first?.title?.toString?.());
            console.log('author:', first?.author?.name);
            console.log('duration text:', first?.duration?.text);
            console.log('duration seconds:', first?.duration?.seconds);
            console.log('thumbnail:', first?.thumbnails?.[0]?.url?.slice(0, 100));
            console.log('\nSecond result:');
            const second = search.results[1] as any;
            console.log('id:', second?.id, 'title:', second?.title?.toString?.(), 'author:', second?.author?.name);
        }
    } catch (err: any) {
        console.error('Regular search error:', err.message);
    }

    // 2. Music search
    console.log('\n=== MUSIC SEARCH: "Shape of You" ===');
    try {
        const search = await yt.music.search('Shape of You') as any;
        console.log('Music search keys:', Object.keys(search));

        // Check each possible property
        for (const key of ['results', 'contents', 'sections', 'header', 'shelves', 'page']) {
            if (search[key]) {
                const val = search[key];
                console.log(`  .${key}: type=${typeof val}, isArray=${Array.isArray(val)}, length=${val?.length ?? 'N/A'}`);
            }
        }

        // If there are sections, show the first one
        if (search.sections) {
            const s0 = search.sections[0] as any;
            console.log('Section 0 keys:', Object.keys(s0 || {}));
            console.log('Section 0 type:', s0?.type);
            console.log('Section 0 header:', s0?.header?.toString?.());
            if (s0?.contents) {
                console.log('Section 0 contents length:', s0.contents.length);
                const item = s0.contents[0] as any;
                console.log('  Item 0 keys:', Object.keys(item || {}).slice(0, 15));
                console.log('  Item 0 type:', item?.type);
                console.log('  Item 0 id:', item?.id);
                console.log('  Item 0 title:', item?.title?.toString?.());
                console.log('  Item 0 flex_columns length:', item?.flex_columns?.length);
                // show flex_columns content
                if (item?.flex_columns) {
                    for (let i = 0; i < Math.min(item.flex_columns.length, 3); i++) {
                        const col = item.flex_columns[i] as any;
                        console.log(`  FlexCol[${i}] title:`, col?.title?.toString?.());
                    }
                }
            }
        }

        // Try contents directly
        if (search.contents) {
            const c0 = search.contents[0] as any;
            console.log('Contents[0] keys:', Object.keys(c0 || {}).slice(0, 15));
            console.log('Contents[0] id:', c0?.id);
            console.log('Contents[0] title:', c0?.title?.toString?.());
        }
    } catch (err: any) {
        console.error('Music search error:', err.message);
    }

    // 3. Suggestions
    console.log('\n=== SUGGESTIONS: "shape" ===');
    try {
        const sug = await yt.getSearchSuggestions('shape');
        console.log('Type:', typeof sug, 'isArray:', Array.isArray(sug), 'length:', sug?.length);
        console.log('First 5:', sug?.slice(0, 5));
    } catch (err: any) {
        console.error('Suggestions error:', err.message);
    }

    console.log('\n=== DONE ===');
}

diagnose().catch(console.error);
