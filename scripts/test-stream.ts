import { Innertube } from 'youtubei.js';

async function testStream() {
    try {
        console.log("Creating Innertube...");
        const yt = await Innertube.create({ lang: 'en', location: 'US' });

        console.log("Trying getBasicInfo...");
        const info = await yt.getBasicInfo('uu7j_xlJCRY');

        console.log("Got basic info, choosing format...");
        const format = info.chooseFormat({ type: 'audio', quality: 'best', format: 'any' });

        if (format) {
            console.log("Format found!");
            console.log("Deciphered URL:", format.decipher(yt.session.player));
        } else {
            console.log("No audio format found in basic info.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
testStream();
