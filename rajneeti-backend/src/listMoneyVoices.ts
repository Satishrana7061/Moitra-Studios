/**
 * Lists the ElevenLabs voices on the account, ranked for this channel.
 *
 * A free API call, and the only way to choose a real voice — IDs cannot be
 * guessed from outside the account. Prints the ID, name and labels so a
 * candidate can be passed straight to generateMoneyEpisode --voice.
 *
 * The key is used, never printed.
 */

import { listVoices, rankForMoneyChannel } from './services/moneyVoiceService.js';

async function main() {
    const voices = await listVoices();
    if (!voices.length) {
        console.log('No voices on this account. Add one from the ElevenLabs Voice Library first.');
        return;
    }

    const ranked = rankForMoneyChannel(voices);
    console.log(`\n${voices.length} voice(s) available. Ranked for a warm, early-20s Hindi read:\n`);

    ranked.forEach((v, i) => {
        const labels = Object.entries(v.labels)
            .map(([k, val]) => `${k}=${val}`)
            .join(' ');
        console.log(`${String(i + 1).padStart(2)}. ${v.name}`);
        console.log(`    id: ${v.voiceId}`);
        if (labels) console.log(`    ${labels}`);
        if (v.previewUrl) console.log(`    preview: ${v.previewUrl}`);
        console.log();
    });

    console.log('Ranking is a hint, not a verdict — ElevenLabs labels are patchy.');
    console.log('Pick 2-3 and run the voice lab with --voice <id> to judge by ear.');
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
});
