/**
 * Verifies the mastering chain against synthetic audio.
 *
 * The signals are deliberately chosen: the "voice" is a 200 Hz tone gated on and
 * off so there are real gaps to measure ducking in, and the "music" is 3000 Hz —
 * far from any harmonic of 200 Hz, so the bandpass measurement below reads the
 * music alone rather than the voice's own overtones.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { masterVoiceover, measureLoudness, audioDurationSec, ffmpegBin } from '../services/audioMixService.js';

const SP = fs.mkdtempSync(path.join(os.tmpdir(), 'money-audio-'));
const FF = ffmpegBin();
let pass = 0, fail = 0;
const check = (l: string, c: boolean, x = '') => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${l}${x ? ' — ' + x : ''}`); c ? pass++ : fail++; };

console.log(`ffmpeg: ${path.basename(FF)}\n`);

// Synthetic "speech": 2s of tone, 1s silence, repeating — so ducking is measurable.
execFileSync(FF, ['-y','-f','lavfi','-i','sine=frequency=200:duration=12',
  '-af',"volume='if(lt(mod(t,3),2),0.6,0.0)':eval=frame",'-q:a','4', `${SP}/fake-voice.mp3`], {stdio:'ignore'});
// Synthetic music: constant tone.
execFileSync(FF, ['-y','-f','lavfi','-i','sine=frequency=3000:duration=20','-af','volume=0.6', `${SP}/fake-music.wav`], {stdio:'ignore'});

const voice = fs.readFileSync(`${SP}/fake-voice.mp3`);

console.log('voice-only master:');
const solo = masterVoiceover(voice, `${SP}/mix-solo`);
check('produces a file', fs.existsSync(solo.path));
check('duration preserved (~12s)', Math.abs(solo.durationSec - 12) < 0.6, `${solo.durationSec.toFixed(2)}s`);
const soloL = measureLoudness(solo.path);
check('normalised near -14 LUFS', Math.abs(soloL - (-14)) < 1.5, `${soloL} LUFS`);

console.log('\nvoice + music master:');
const mixed = masterVoiceover(voice, `${SP}/mix-duck`, { musicPath: `${SP}/fake-music.wav` });
check('produces a file', fs.existsSync(mixed.path));
const mixL = measureLoudness(mixed.path);
check('normalised near -14 LUFS', Math.abs(mixL - (-14)) < 1.5, `${mixL} LUFS`);
check('follows voice length, not music length', Math.abs(mixed.durationSec - 12) < 0.6, `${mixed.durationSec.toFixed(2)}s (music was 20s)`);

console.log('\nducking actually happens:');
// Compare music-band energy while the voice speaks (0-2s) vs during its gap (2-3s).
const bandRms = (file: string, from: number, to: number): number => {
  const r = spawnSync(FF, ['-i', file, '-af', `atrim=${from}:${to},bandpass=f=3000:width_type=h:w=200,astats=metadata=1:reset=0`, '-f','null','-'], {encoding:'utf-8', maxBuffer: 32*1024*1024});
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  const m = out.match(/Overall[\s\S]*?RMS level dB:\s*(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : NaN;
};
const speaking = bandRms(mixed.path, 0.3, 1.8);
const gap      = bandRms(mixed.path, 2.2, 2.9);
check('music is quieter while the voice speaks',
  Number.isFinite(speaking) && Number.isFinite(gap) && speaking < gap - 1.5,
  `speaking ${speaking.toFixed(1)} dB vs gap ${gap.toFixed(1)} dB (ducked by ${(gap-speaking).toFixed(1)} dB)`);

// The outro card needs silence after the last word. This path went untested at
// first and was broken: apad=pad_dur only exists from ffmpeg 4.2, while
// @ffmpeg-installer ships 4.1, so every real episode (which asks for a tail)
// died with "Option 'pad_dur' not found" while these checks stayed green.
console.log('\ntail padding, on both branches:');
const TAIL = 1.5;

const soloTail = masterVoiceover(voice, `${SP}/mix-solo-tail`, { tailSec: TAIL });
check('voice-only: tail is added', Math.abs(soloTail.durationSec - (12 + TAIL)) < 0.6,
  `${soloTail.durationSec.toFixed(2)}s vs ${(12 + TAIL).toFixed(2)}s expected`);

const mixTail = masterVoiceover(voice, `${SP}/mix-duck-tail`, { musicPath: `${SP}/fake-music.wav`, tailSec: TAIL });
check('with music: tail is added', Math.abs(mixTail.durationSec - (12 + TAIL)) < 0.6,
  `${mixTail.durationSec.toFixed(2)}s vs ${(12 + TAIL).toFixed(2)}s expected`);
// The music should carry on under the outro rather than stopping with the voice.
const tailMusic = bandRms(mixTail.path, 12.4, 13.3);
check('music continues under the tail', Number.isFinite(tailMusic) && tailMusic > -60,
  `${Number.isFinite(tailMusic) ? tailMusic.toFixed(1) + ' dB' : 'silent'}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
