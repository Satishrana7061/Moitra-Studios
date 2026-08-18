import { alignToSpeech, type WordTiming } from '../services/beatTimingAligner.js';

let pass = 0, fail = 0;
const check = (label: string, cond: boolean, extra = '') => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
  cond ? pass++ : fail++;
};

// Build a synthetic word stream at a fixed cadence.
const mk = (words: string[], startAt = 0, per = 0.4): WordTiming[] =>
  words.map((w, i) => ({ word: w, start: +(startAt + i * per).toFixed(3), end: +(startAt + (i + 1) * per).toFixed(3) }));

async function main() {
const hook = 'निवेश से पहले एक काम करो।';
const says = [
  'दस हज़ार रुपये... अलग रखो।',
  'इसे सैलरी खाते से, अलग रखो।',
  'ये होने के बाद ही, निवेश की बात करो।',
];
const cta = 'आपके पास कितना बफर है?';

// 1. Exact tokenisation (naive split matches ElevenLabs)
const allWords = [hook, ...says, cta].join(' ').split(/\s+/);
const words = mk(allWords);
const r1 = alignToSpeech(hook, says, cta, words);
check('exact tokenisation: fully matched', r1.fullyMatched);
check('beat count preserved', r1.beats.length === says.length, `${r1.beats.length}`);
check('hook starts at 0', Math.abs(r1.hook.startSec - 0) < 1e-6);
check('segments are ordered and contiguous',
  r1.beats.every((b, i) => b.startSec >= (i === 0 ? r1.hook.startSec : r1.beats[i-1].startSec) && b.endSec > b.startSec));
check('cta ends at end of speech', Math.abs(r1.cta.endSec - r1.speechEndSec) < 1e-6, `${r1.cta.endSec} vs ${r1.speechEndSec}`);
check('no gaps between segments',
  r1.beats.every((b, i) => i === 0 ? Math.abs(b.startSec - r1.hook.endSec) < 1e-6 : Math.abs(b.startSec - r1.beats[i-1].endSec) < 1e-6));

// 2. ElevenLabs-style tokenisation: punctuation split off, danda as its own token
const messy: string[] = [];
for (const seg of [hook, ...says, cta]) {
  for (const w of seg.split(/\s+/)) {
    const m = w.match(/^(.*?)([।?!,.]+)$/);
    if (m && m[1]) { messy.push(m[1]); messy.push(m[2]); } else messy.push(w);
  }
}
const r2 = alignToSpeech(hook, says, cta, mk(messy, 0, 0.3));
check('punctuation split into separate tokens: still matched', r2.fullyMatched);
check('  beat boundaries still sane', r2.beats.length === 3 && r2.beats.every(b => b.endSec > b.startSec));

// 3. Divergence -> proportional fallback, never a throw
const wrong = mk('completely different words that do not correspond at all'.split(' '));
const r3 = alignToSpeech(hook, says, cta, wrong);
check('divergent stream: falls back instead of throwing', !r3.fullyMatched);
check('  fallback still yields one segment per beat', r3.beats.length === says.length);
check('  fallback segments ordered', r3.beats.every((b,i) => i===0 || b.startSec >= r3.beats[i-1].startSec));

// 4. Empty word list
const r4 = alignToSpeech(hook, says, cta, []);
check('empty timings: does not throw, returns beats', r4.beats.length === says.length && !r4.fullyMatched);

// 5. Longer beat gets proportionally more time (sanity on real matching)
const durations = r1.beats.map(b => +(b.endSec - b.startSec).toFixed(2));
const lens = says.map(s => s.replace(/\s/g,'').length);
const orderOk = durations.indexOf(Math.max(...durations)) === lens.indexOf(Math.max(...lens));
check('longest line gets the longest slot', orderOk, `durations ${durations} for lengths ${lens}`);

console.log(`\n${pass} passed, ${fail} failed`);
console.log(`\nsample alignment (exact case):`);
console.log(`  hook  ${r1.hook.startSec.toFixed(2)}-${r1.hook.endSec.toFixed(2)}s`);
r1.beats.forEach((b,i) => console.log(`  beat${i} ${b.startSec.toFixed(2)}-${b.endSec.toFixed(2)}s  "${says[i].slice(0,28)}"`));
console.log(`  cta   ${r1.cta.startSec.toFixed(2)}-${r1.cta.endSec.toFixed(2)}s`);
process.exit(fail ? 1 : 0);
}
main();
