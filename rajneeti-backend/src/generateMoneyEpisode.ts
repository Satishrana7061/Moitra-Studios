/**
 * Produces one complete episode of Hisaab Kitab: topic → script → Hindi
 * voiceover → mastered audio → aligned storyboard → rendered MP4.
 *
 * Run from CI, where the API keys exist. Everything up to the render happens in
 * Node so a failure reports a readable error rather than dying inside headless
 * Chrome.
 *
 *   npx tsx src/generateMoneyEpisode.ts --topic s1-01 --voice <id> --out ../out
 *   npx tsx src/generateMoneyEpisode.ts --index 0 --script-only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

import { getAllTopics, getNextTopic, type ScheduledTopic } from './services/moneyCurriculum.js';
import { moneyDb, usedTopicIds, lastEpisodeNo, uploadVideo, recordEpisode } from './services/moneyEpisodeStore.js';
import {
    generateMoneyScript,
    getStoredScript,
    storedScriptIssues,
    voiceoverText,
    type MoneyScript,
} from './services/moneyScriptGenerator.js';
import { speakMoneyScript } from './services/moneyVoiceService.js';
import { masterVoiceover, measureLoudness } from './services/audioMixService.js';
import { buildMoneyStoryboard } from './services/moneyStoryboardBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REEL_STUDIO = path.join(REPO_ROOT, 'reel-studio');

const arg = (name: string): string | undefined => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string): boolean => process.argv.includes(`--${name}`);

/**
 * Which topic to make, and what number it is.
 *
 * `--next` is what the daily cron uses: ask the database what has already been
 * made and take the first curriculum topic that has not. Everything else is for
 * running a specific episode by hand.
 */
async function pickTopic(): Promise<{ topic: ScheduledTopic; episodeNo: number }> {
    const topics = getAllTopics();

    if (flag('next')) {
        const db = moneyDb();
        const used = await usedTopicIds(db);
        const topic = getNextTopic(used);
        if (!topic) {
            // Not an error. The curriculum is finite by design and this is the
            // signal that it is time to write more, not that something broke.
            throw new Error(
                `[money] All ${topics.length} written topics have been used. ` +
                    'Write more in content/money-ladder.json — steps 4-7 are outlined and waiting.',
            );
        }
        return { topic, episodeNo: (await lastEpisodeNo(db)) + 1 };
    }

    const id = arg('topic');
    if (id) {
        const found = topics.find((t) => t.id === id);
        if (!found) throw new Error(`No topic with id "${id}". First few: ${topics.slice(0, 5).map((t) => t.id).join(', ')}`);
        return { topic: found, episodeNo: Number(arg('episode') ?? found.order) };
    }

    const index = Number(arg('index') ?? 0);
    if (!topics[index]) throw new Error(`--index ${index} is out of range (${topics.length} topics written).`);
    return { topic: topics[index], episodeNo: Number(arg('episode') ?? topics[index].order) };
}

async function main() {
    const { topic, episodeNo } = await pickTopic();
    const outDir = path.resolve(arg('out') ?? path.join(REPO_ROOT, 'out', 'money'));
    const episode = Number(arg('episode') ?? episodeNo);
    fs.mkdirSync(outDir, { recursive: true });

    console.log(`\n━━ Episode ${episode}: ${topic.id} — ${topic.title}`);
    console.log(`   Step ${topic.stepNumber} (${topic.stepTitleEn}) · visual: ${topic.visual}\n`);

    // 1. Script
    // The stored script first, and a model only when there is none.
    //
    // The daily run has no business depending on an external API. The
    // curriculum already carries the hook, the lesson, the numbers, the facts
    // and the closing question — a model only expanded those into beats, and
    // charged the whole channel's uptime for it. A zero OpenAI balance stopped
    // a run outright, and the fallback built for exactly that case turned out
    // to be a dead branch.
    const stored = getStoredScript(topic);
    let script: MoneyScript;

    if (stored) {
        // Re-checked here as well as in money:validate. The file can be edited
        // between the two, and a bad script that reaches this point has already
        // cost the voice credits by the time anyone notices.
        const issues = storedScriptIssues(topic);
        if (issues.length) {
            throw new Error(
                `[money] The stored script for ${topic.id} does not pass its own gates:\n  - ${issues.join('\n  - ')}`,
            );
        }
        console.log(`[money] Using the written script for ${topic.id} — no model call.`);
        script = stored;
    } else {
        console.log(
            `[money] ${topic.id} has no written script yet, falling back to a model. ` +
                'This is the path that depends on an external API being up and funded.',
        );
        script = await generateMoneyScript(topic);
    }
    fs.writeFileSync(path.join(outDir, 'script.json'), JSON.stringify(script, null, 2));

    console.log('\n── Script ──');
    console.log(`hook (drawn):   ${script.hook}`);
    console.log(`hook (spoken):  ${script.hookSaid}`);
    script.beats.forEach((b, i) => {
        console.log(`beat ${i}: [${b.visual.kind}] "${b.onScreen}"`);
        console.log(`          ${b.say}`);
    });
    console.log(`cta (drawn):    ${script.cta}`);
    console.log(`cta (spoken):   ${script.ctaSaid}`);
    if (script.numericClaims.length) {
        console.log(`claims to check: ${script.numericClaims.join(', ')}`);
    }

    const vo = voiceoverText(script);
    console.log(`\nvoiceover: ${vo.split(/\s+/).length} words, ${vo.length} chars`);

    if (flag('script-only')) {
        console.log('\n--script-only: stopping before TTS. No credits spent.');
        return;
    }

    // 2. Hindi voiceover with word timings
    const voiceId = arg('voice') ?? process.env.ELEVENLABS_VOICE_ID__MONEY ?? '';
    const { audioBuffer, wordTimings } = await speakMoneyScript(script, voiceId);
    console.log(`\n── Voice ── ${audioBuffer.length} bytes, ${wordTimings.length} word timings` +
        (voiceId ? ` (voice ${voiceId})` : ' (default voice)'));

    // 3. Master. The music bed is optional; without one the voice is simply
    //    normalised to the platform target.
    const musicPath = arg('music');
    const master = masterVoiceover(audioBuffer, outDir, {
        musicPath: musicPath && fs.existsSync(musicPath) ? musicPath : undefined,
        tailSec: 1.2,
    });
    console.log(`── Master ── ${path.basename(master.path)} · ${master.durationSec.toFixed(2)}s · ` +
        `${measureLoudness(master.path).toFixed(1)} LUFS`);

    // 4. Storyboard, aligned to the real speech
    const { storyboard, fullyMatched } = buildMoneyStoryboard({
        script,
        topic,
        episode,
        // Remotion resolves a relative src through staticFile(), so the audio
        // has to sit under reel-studio/public.
        audioSrc: `money/episode-${episode}.wav`,
        audioDurationSec: master.durationSec,
        wordTimings,
    });

    console.log(`── Timing ── ${fullyMatched ? 'aligned to real speech' : 'PROPORTIONAL FALLBACK (cuts approximate)'}`);
    storyboard.beats.forEach((b, i) => {
        console.log(`   beat ${i}  ${b.startSec.toFixed(2)} → ${b.endSec.toFixed(2)}s  "${b.onScreen}"`);
    });

    const boardPath = path.join(outDir, 'storyboard.json');
    fs.writeFileSync(boardPath, JSON.stringify(storyboard, null, 2));

    const publicAudio = path.join(REEL_STUDIO, 'public', 'money', `episode-${episode}.wav`);
    fs.mkdirSync(path.dirname(publicAudio), { recursive: true });
    fs.copyFileSync(master.path, publicAudio);

    if (flag('no-render')) {
        console.log(`\n--no-render: storyboard at ${boardPath}`);
        return;
    }

    // 5. Render
    const mp4 = path.join(outDir, `episode-${episode}.mp4`);
    console.log(`\n── Render ── ${path.basename(mp4)}`);
    const res = spawnSync(
        'npx',
        ['remotion', 'render', 'MoneyReel', mp4, `--props=${boardPath}`, '--log=info'],
        { cwd: REEL_STUDIO, stdio: 'inherit', env: process.env },
    );
    if (res.status !== 0) throw new Error(`Remotion render failed with status ${res.status}`);

    const size = fs.statSync(mp4).size;
    console.log(`\n✅ Episode ${episode} rendered — ${(size / 1024 / 1024).toFixed(1)} MB at ${mp4}`);
    if (!fullyMatched) {
        console.log('⚠️  Beat timings were approximate. Check the cuts before publishing.');
    }

    // 6. Record it, so the approve page has something to show.
    if (flag('record')) {
        const db = moneyDb();
        const videoUrl = await uploadVideo(db, mp4, episode);
        const row = await recordEpisode(db, { topic, episodeNo: episode, script, videoUrl });
        console.log(`\n📼 Recorded as ${row.status} — ${videoUrl}`);
        console.log('   Approve it at /studio/approve to publish this evening.');
    }
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
});
