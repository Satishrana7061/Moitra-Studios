/**
 * Produces one complete episode of The Money Ladder: topic → script → Hindi
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

import { getAllTopics, type ScheduledTopic } from './services/moneyCurriculum.js';
import { generateMoneyScript, voiceoverText, type MoneyScript } from './services/moneyScriptGenerator.js';
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

function pickTopic(): ScheduledTopic {
    const topics = getAllTopics();
    const id = arg('topic');
    if (id) {
        const found = topics.find((t) => t.id === id);
        if (!found) throw new Error(`No topic with id "${id}". First few: ${topics.slice(0, 5).map((t) => t.id).join(', ')}`);
        return found;
    }
    const index = Number(arg('index') ?? 0);
    if (!topics[index]) throw new Error(`--index ${index} is out of range (${topics.length} topics written).`);
    return topics[index];
}

async function main() {
    const topic = pickTopic();
    const outDir = path.resolve(arg('out') ?? path.join(REPO_ROOT, 'out', 'money'));
    const episode = Number(arg('episode') ?? topic.order);
    fs.mkdirSync(outDir, { recursive: true });

    console.log(`\n━━ Episode ${episode}: ${topic.id} — ${topic.title}`);
    console.log(`   Step ${topic.stepNumber} (${topic.stepTitleEn}) · visual: ${topic.visual}\n`);

    // 1. Script
    const script: MoneyScript = await generateMoneyScript(topic);
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
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
});
