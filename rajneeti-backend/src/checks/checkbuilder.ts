import { buildMoneyStoryboard } from '../services/moneyStoryboardBuilder.js';
import { getAllTopics } from '../services/moneyCurriculum.js';
import type { WordTiming } from '../services/beatTimingAligner.js';

let pass=0, fail=0;
const check=(l:string,c:boolean,x='')=>{console.log(`  ${c?'PASS':'FAIL'}  ${l}${x?' — '+x:''}`);c?pass++:fail++;};

const topic = getAllTopics()[3]; // s1-04
const script = {
  topicId: topic.id,
  hook: '₹334 a day.',
  hookSaid: 'बड़ा लक्ष्य डराता है।',
  beats: [
    { onScreen: 'One month. One goal.', say: 'दस हज़ार रुपये चाहिए तीस दिन में।', visual: { kind: 'bigNumber' as const, value: '₹10,000' } },
    { onScreen: 'Break it down daily',  say: 'मतलब रोज़ तीन सौ चौंतीस रुपये।',   visual: { kind: 'bigNumber' as const, value: '₹334' } },
    { onScreen: 'Step 1 complete',      say: 'तीस दिन बाद पहला कदम पूरा।',       visual: { kind: 'ladder' as const, highlightStep: 1 } },
  ],
  cta: 'Can you find ₹334 a day?',
  ctaSaid: 'आपके पास कितना बफर है?',
  numericClaims: ['₹10,000','₹334'],
};

const all = [script.hookSaid, ...script.beats.map(b=>b.say), 'आपके पास कितना बफर है?'].join(' ').split(/\s+/);
const words: WordTiming[] = all.map((w,i)=>({word:w,start:+(i*0.42).toFixed(3),end:+((i+1)*0.42).toFixed(3)}));

const { storyboard, fullyMatched } = buildMoneyStoryboard({
  script: script as any, topic, episode: 4,
  audioSrc: 'audio/ep4.wav', audioDurationSec: words[words.length-1].end, wordTimings: words,
});

check('timings matched real speech (not proportional fallback)', fullyMatched);
check('one beat per script beat', storyboard.beats.length === script.beats.length);
check('beats strictly increasing', storyboard.beats.every((b,i)=> i===0 || b.startSec >= storyboard.beats[i-1].endSec - 1e-6));
check('no beat shorter than the minimum', storyboard.beats.every(b => b.endSec - b.startSec >= 1.19));
check('stepTitle is ENGLISH (series bar draws it)', storyboard.stepTitle === 'First ₹10,000', storyboard.stepTitle);
check('no Devanagari in any rendered field',
  ![storyboard.hook, storyboard.cta, storyboard.stepTitle, ...storyboard.beats.map(b=>b.onScreen)].some(t=>/[ऀ-ॿ]/.test(t)));
check('layout variant is deterministic per episode',
  storyboard.brand.layoutVariant === buildMoneyStoryboard({script: script as any, topic, episode:4, audioSrc:'x', audioDurationSec:10, wordTimings:words}).storyboard.brand.layoutVariant);
check('consecutive episodes get different variants',
  buildMoneyStoryboard({script: script as any, topic, episode:5, audioSrc:'x', audioDurationSec:10, wordTimings:words}).storyboard.brand.layoutVariant !== storyboard.brand.layoutVariant);

console.log('\nderived timeline:');
console.log(`  hook      0.00 → ${storyboard.beats[0].startSec.toFixed(2)}s`);
storyboard.beats.forEach((b,i)=>console.log(`  beat${i}  ${b.startSec.toFixed(2)} → ${b.endSec.toFixed(2)}s   "${b.onScreen}"`));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
