/**
 * Offline end-to-end: master -> align -> build -> render.
 *
 * Everything generateMoneyEpisode does EXCEPT the two paid API calls. The
 * script is canned and the "voiceover" is a synthetic tone with hand-made word
 * timings, so this proves the wiring — ffmpeg mastering, beat alignment, the
 * staticFile audio hand-off, the props path and the Remotion render itself —
 * without a key and without spending credits.
 *
 * What it deliberately does NOT prove: that the model writes well, and that
 * ElevenLabs returns usable timings. Those need the voice lab.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawnSync } from 'child_process';

import { masterVoiceover, measureLoudness, ffmpegBin } from '../services/audioMixService.js';
import { buildMoneyStoryboard } from '../services/moneyStoryboardBuilder.js';
import { voiceoverText, structuralIssues, languageIssues, type MoneyScript } from '../services/moneyScriptGenerator.js';
import { getAllTopics } from '../services/moneyCurriculum.js';
import type { WordTiming } from '../services/beatTimingAligner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const REEL_STUDIO = path.join(REPO_ROOT, 'reel-studio');

let pass = 0, fail = 0;
const check = (l: string, c: boolean, x = '') => {
    console.log(`  ${c ? 'PASS' : 'FAIL'}  ${l}${x ? ' — ' + x : ''}`);
    c ? pass++ : fail++;
};

/** A script in the current contract: English drawn, Hindi spoken. */
const script: MoneyScript = {
    topicId: 's1-01',
    hook: 'Do this before investing',
    hookSaid: 'निवेश से पहले एक काम करो।',
    beats: [
        { onScreen: 'Ten thousand', say: 'दस हज़ार रुपये... अलग रखो।', caption: 'Put ten thousand rupees aside before you invest anything.', visual: { kind: 'bigNumber', value: '₹10,000', label: 'Starter buffer' } },
        { onScreen: 'A separate account', say: 'इसे सैलरी खाते से, अलग रखो।', caption: 'Keep it in a separate account from your salary.', visual: { kind: 'compare', a: 'Savings', b: 'Salary', aLabel: 'Untouched', bLabel: 'Spent' } },
        { onScreen: 'What waiting costs', say: 'पचास हज़ार के बकाया पर... साल भर में इक्कीस हज़ार ब्याज लगता है।', caption: 'A fifty thousand rupee balance costs twenty one thousand in a year.', visual: { kind: 'worked', base: '₹50,000', baseLabel: 'Card balance', op: '× 42% a year', result: '₹21,000', resultLabel: 'Interest, in one year' } },
        { onScreen: 'Twenty years later', say: 'पंद्रह सौ रुपये हर महीने... बीस साल में ग्यारह लाख से ऊपर हो जाते हैं।', caption: 'Fifteen hundred a month becomes over eleven lakh in twenty years.', visual: { kind: 'compound', monthly: '₹1,500', years: 20, rate: 'assuming 10% a year', result: '₹11,48,545', invested: '₹3,60,000' } },
        { onScreen: 'Only then invest', say: 'ये होने के बाद ही, निवेश की बात करो।', caption: 'Only once that is done should you talk about investing.', visual: { kind: 'ladder', highlightStep: 1 } },
    ],
    cta: 'How big is your buffer?',
    ctaSaid: 'आपके पास कितना बफर है? कमेंट में बताओ।',
    numericClaims: ['₹10,000'],
};

/**
 * Synthetic word timings for the exact voiceover text, at a plausible Hindi
 * speaking rate. Built from the real string so the aligner is exercised on the
 * same tokenisation problem it faces in production.
 */
function fakeTimings(text: string, wordsPerSec = 2.6): WordTiming[] {
    let t = 0.4;
    return text.split(/\s+/).filter(Boolean).map((word) => {
        const dur = word.length > 6 ? 1 / wordsPerSec * 1.4 : 1 / wordsPerSec;
        const timing = { word, start: Number(t.toFixed(3)), end: Number((t + dur).toFixed(3)) };
        t += dur + 0.06;
        return timing;
    });
}

async function main() {
    const base = getAllTopics().find((t) => t.id === script.topicId);
    if (!base) throw new Error(`Fixture topic ${script.topicId} is no longer in the curriculum.`);
    // Flagged, because the fixture exercises a compound beat and the gate would
    // otherwise refuse it — which is the gate working, not a fixture problem.
    const topic = { ...base, illustrativeReturns: true };

    console.log('script passes its own gates:');
    check('no structural issues', structuralIssues(script, topic).length === 0, structuralIssues(script, topic).join('; '));
    check('no language issues', languageIssues(script).length === 0, languageIssues(script).join('; '));

    const vo = voiceoverText(script);
    const timings = fakeTimings(vo);
    const speechSec = timings[timings.length - 1].end;

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'money-pipe-'));

    console.log('\nmastering a synthetic read:');
    execFileSync(ffmpegBin(), [
        '-y', '-f', 'lavfi', '-i', `sine=frequency=200:duration=${speechSec.toFixed(2)}`,
        '-q:a', '4', path.join(tmp, 'raw.mp3'),
    ], { stdio: 'ignore' });

    const master = masterVoiceover(fs.readFileSync(path.join(tmp, 'raw.mp3')), tmp, { tailSec: 1.2 });
    check('master exists', fs.existsSync(master.path));
    // The tail is padded on, so the file must be LONGER than the speech.
    check('tail padding is applied', master.durationSec > speechSec, `${master.durationSec.toFixed(2)}s vs ${speechSec.toFixed(2)}s speech`);
    const lufs = measureLoudness(master.path);
    check('normalised near -14 LUFS', Math.abs(lufs + 14) < 1.5, `${lufs} LUFS`);

    console.log('\nalignment against the real voiceover string:');
    const episode = 999;
    const { storyboard, fullyMatched } = buildMoneyStoryboard({
        script, topic, episode,
        audioSrc: `money/episode-${episode}.wav`,
        audioDurationSec: master.durationSec,
        wordTimings: timings,
    });
    check('every beat matched real word timings', fullyMatched);
    check('beats are in order and non-overlapping',
        storyboard.beats.every((b, i) => b.endSec > b.startSec && (i === 0 || b.startSec >= storyboard.beats[i - 1].endSec)));
    check('last beat ends within the audio', storyboard.beats[storyboard.beats.length - 1].endSec <= master.durationSec + 0.01);
    check('series bar draws the ENGLISH step title', storyboard.stepTitle === topic.stepTitleEn);
    check('every beat carries a caption for muted viewers',
        storyboard.beats.every((b: any) => (b.caption ?? '').trim().length > 0));
    check('nothing drawn contains Devanagari',
        !/[ऀ-ॿ]/.test(JSON.stringify({ h: storyboard.hook, c: storyboard.cta, b: storyboard.beats.map((b: any) => [b.onScreen, b.caption, b.visual]) })));

    console.log('\nthe font is actually in this checkout:');
    // The check that would have caught the first CI failure. public/fonts was
    // gitignored, so a fresh clone rendered with no display face at all — and
    // every other assertion below still passed, because an MP4 in the wrong
    // typeface has exactly the same streams and roughly the same size.
    const fontPath = path.join(REEL_STUDIO, 'public', 'fonts', 'Outfit.ttf');
    check('Outfit.ttf is present', fs.existsSync(fontPath), fontPath);
    if (fs.existsSync(fontPath)) {
        const bytes = fs.statSync(fontPath).size;
        // A truncated or LFS-pointer file is a few hundred bytes and fails to
        // parse as a font, which looks identical to "missing" at render time.
        check('...and is a real font file, not a stub', bytes > 50_000, `${(bytes / 1024).toFixed(0)} KB`);
        check('...and is tracked by git', spawnSync('git', ['ls-files', '--error-unmatch', fontPath],
            { cwd: REEL_STUDIO, encoding: 'utf-8' }).status === 0);
    }

    console.log('\nrender:');
    const publicAudio = path.join(REEL_STUDIO, 'public', 'money', `episode-${episode}.wav`);
    fs.mkdirSync(path.dirname(publicAudio), { recursive: true });
    fs.copyFileSync(master.path, publicAudio);

    const boardPath = path.join(tmp, 'storyboard.json');
    fs.writeFileSync(boardPath, JSON.stringify(storyboard, null, 2));
    // Kept where it can be picked up for a still-frame or safe-area pass, which
    // otherwise needs a paid episode to produce a realistic board.
    if (process.env.MONEY_BOARD_OUT) {
        fs.writeFileSync(process.env.MONEY_BOARD_OUT, JSON.stringify(storyboard, null, 2));
    }

    const mp4 = path.join(tmp, 'out.mp4');
    // Remotion downloads its own headless shell on first use. Some sandboxes
    // block that host, which fails the render for a reason that has nothing to
    // do with the reel. Where a Chromium is already on disk, point at it — the
    // check is meant to catch OUR bugs, not the network's.
    const localChrome = [
        process.env.REMOTION_BROWSER_EXECUTABLE,
        // The headless SHELL, not the full browser: Remotion launches with the
        // old --headless flag, which current Chrome builds have removed.
        '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
    ].find((p) => p && fs.existsSync(p));
    if (localChrome) console.log(`  (using ${localChrome})`);

    const res = spawnSync('npx', [
        'remotion', 'render', 'MoneyReel', mp4, `--props=${boardPath}`, '--log=error',
        ...(localChrome ? [`--browser-executable=${localChrome}`] : []),
    ], { cwd: REEL_STUDIO, encoding: 'utf-8', env: process.env });

    if (res.status !== 0) {
        console.log((res.stderr || res.stdout || '').slice(-2500));
    }
    check('remotion render succeeds', res.status === 0, res.status === 0 ? '' : `exit ${res.status}`);

    if (res.status === 0) {
        const size = fs.statSync(mp4).size;
        check('produced a non-trivial mp4', size > 200_000, `${(size / 1024 / 1024).toFixed(2)} MB`);

        // The audio must have survived into the container — a silent reel is the
        // failure mode that looks fine in a thumbnail.
        const probe = spawnSync(ffmpegBin(), ['-i', mp4, '-f', 'null', '-'], { encoding: 'utf-8' });
        const streams = `${probe.stdout ?? ''}${probe.stderr ?? ''}`;
        check('mp4 carries an audio stream', /Stream #\d+:\d+.*Audio:/.test(streams));
        check('mp4 carries a video stream', /Stream #\d+:\d+.*Video:/.test(streams));
    }

    fs.rmSync(publicAudio, { force: true });
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
