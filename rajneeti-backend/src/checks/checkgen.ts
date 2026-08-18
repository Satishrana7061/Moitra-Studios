import {
  callModel,
  scriptSurfaceText,
  voiceoverText,
  languageIssues,
  structuralIssues,
  checkableClaims,
  type Provider,
  type MoneyScript,
} from '../services/moneyScriptGenerator.js';
import { complianceViolations } from '../services/moneyCurriculum.js';
import {
  MONEY_TTS_MODEL,
  TAG_VOCABULARY,
  acceptsAudioTags,
  directedVoiceoverText,
  dropTagTimings,
  stripAudioTags,
  tagAudibleSeconds,
} from '../services/moneyVoiceService.js';

const P = (name: string, behaviour: 'ok'|'throw'|'empty'): Provider => ({
  name, enabled: true,
  run: async () => {
    if (behaviour === 'throw') throw new Error('simulated 503');
    if (behaviour === 'empty') return '';
    return `{"from":"${name}"}`;
  },
});

/**
 * The current contract: everything drawn is English, everything spoken is
 * Hindi. hook/onScreen/cta are drawn; hookSaid/say/ctaSaid are read aloud.
 */
const script: MoneyScript = {
  topicId: 's1-01',
  hook: 'Do this before investing',
  hookSaid: 'निवेश से पहले एक काम करो।',
  beats: [
    { onScreen: 'Ten thousand', say: 'दस हज़ार रुपये अलग रखो।', caption: 'Put ten thousand rupees aside before you invest anything.', visual: { kind: 'bigNumber', value: '₹10,000', label: 'Starter buffer' } },
    { onScreen: 'A separate account', say: 'इसे सैलरी खाते से अलग रखो।', caption: 'Keep it in a separate account from your salary.', visual: { kind: 'compare', a: 'Savings', b: 'Salary', aLabel: 'Untouched', bLabel: 'Spent' } },
    { onScreen: 'Only then invest', say: 'ये होने के बाद ही निवेश की बात करो।', caption: 'Only once that is done should you talk about investing.', visual: { kind: 'ladder', highlightStep: 1 } },
  ],
  cta: 'How big is your buffer?',
  ctaSaid: 'आपके पास कितना बफर है? कमेंट में बताओ।',
  numericClaims: ['₹10,000'],
};

async function main() {
  let pass = 0, fail = 0;
  const check = (label: string, cond: boolean, extra = '') => {
    console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
    cond ? pass++ : fail++;
  };

  console.log('\nprovider fallback (the bug this fixes):');
  // The Rajneeti generator throws here instead of falling through.
  const r1 = await callModel('p', [P('openai','throw'), P('gemini','ok')]);
  check('first provider throws -> falls through to second', r1.includes('gemini'), r1);

  const r2 = await callModel('p', [P('openai','empty'), P('gemini','ok')]);
  check('first provider returns empty -> falls through', r2.includes('gemini'), r2);

  const r3 = await callModel('p', [P('openai','ok'), P('gemini','ok')]);
  check('first provider ok -> second never used', r3.includes('openai'), r3);

  try {
    await callModel('p', [P('a','throw'), P('b','throw')]);
    check('all providers fail -> throws', false);
  } catch (e: any) {
    check('all providers fail -> throws', e.message.includes('All providers failed'));
  }

  try {
    await callModel('p', []);
    check('no providers configured -> throws', false);
  } catch (e: any) {
    check('no providers configured -> throws', e.message.includes('Neither'));
  }

  console.log('\nvoiceover derivation (cannot drift from beats):');
  const vo = voiceoverText(script);
  check('voiceover contains every beat line', script.beats.every(b => vo.includes(b.say)));
  check('voiceover starts with hookSaid', vo.startsWith(script.hookSaid));
  check('voiceover ends with ctaSaid, not the drawn cta', vo.endsWith(script.ctaSaid));
  // The bug this guards: before ctaSaid existed, the English on-screen cta was
  // appended to the voiceover and ElevenLabs would have read it aloud.
  check('voiceover contains no Latin sentence from the drawn text', !vo.includes(script.cta));
  check('surface text includes on-screen text too', scriptSurfaceText(script).includes('A separate account'));

  console.log('\nmissing ctaSaid degrades rather than crashing:');
  const noCta = { ...script, ctaSaid: undefined as unknown as string };
  let degraded = '';
  try {
    degraded = voiceoverText(noCta);
    check('voiceoverText survives an undefined ctaSaid', true);
  } catch (e: any) {
    check('voiceoverText survives an undefined ctaSaid', false, e.message);
  }
  check('...and simply ends at the last beat', degraded.endsWith(script.beats[2].say));
  check('structuralIssues is what rejects it', structuralIssues(noCta).some(i => i.includes('ctaSaid')));

  console.log('\nlanguage split is enforced, not requested:');
  check('correct script has no language issues', languageIssues(script).length === 0, languageIssues(script).join('; '));

  const hindiOnScreen = { ...script, hook: 'पहले ये करो' };
  check('Devanagari in a drawn field is caught', languageIssues(hindiOnScreen).some(i => i.includes('hook')));

  const hindiInLabel = {
    ...script,
    beats: script.beats.map((b, i) => i === 0 ? { ...b, visual: { ...b.visual, label: 'शुरुआती बफर' } } : b),
  };
  check('Devanagari in a visual label is caught', languageIssues(hindiInLabel).some(i => i.includes('visual.label')));

  const englishSpoken = { ...script, ctaSaid: 'How big is your buffer?' };
  check('English in a spoken field is caught', languageIssues(englishSpoken).some(i => i.includes('ctaSaid')));

  const englishBeat = { ...script, beats: script.beats.map((b, i) => i === 1 ? { ...b, say: 'Keep it separate from salary.' } : b) };
  check('English in a beat say is caught', languageIssues(englishBeat).some(i => i.includes('beat 1 say')));

  console.log('\nvisual specs are checked before TTS spends credits:');
  check('a valid script has no visual issues', structuralIssues(script).length === 0, structuralIssues(script).join('; '));

  const badVisual = (v: any) => ({ ...script, beats: script.beats.map((b, i) => i === 0 ? { ...b, visual: v } : b) });
  check('bigNumber without value is caught',
    structuralIssues(badVisual({ kind: 'bigNumber' })).some(i => i.includes('visual.value')));
  check('ladder without highlightStep is caught',
    structuralIssues(badVisual({ kind: 'ladder' })).some(i => i.includes('highlightStep')));
  check('ladder with an out-of-range step is caught',
    structuralIssues(badVisual({ kind: 'ladder', highlightStep: 9 })).some(i => i.includes('highlightStep')));
  check('steps with too many items is caught',
    structuralIssues(badVisual({ kind: 'steps', items: ['a','b','c','d','e'] })).some(i => i.includes('2-4')));
  check('steps with too few items is caught',
    structuralIssues(badVisual({ kind: 'steps', items: ['a'] })).some(i => i.includes('2-4')));
  check('compare missing a side is caught',
    structuralIssues(badVisual({ kind: 'compare', a: 'Savings' })).some(i => i.includes('visual.b')));
  check('clock needs nothing beyond its kind',
    structuralIssues(badVisual({ kind: 'clock' })).length === 0);
  check('an unknown visual kind is caught',
    structuralIssues(badVisual({ kind: 'pieChart' })).some(i => i.includes('not renderable')));

  console.log('\nnumeric claims are filtered to what a human can check:');
  // The first real run put "1" in this list, lifted from "कदम 1".
  const claims = checkableClaims(['₹10,000', '1', '6 months', '3.5%', 'Step 2', '', '2x']);
  check('bare ordinal is dropped', !claims.includes('1'), claims.join(' | '));
  check('rupee figure is kept', claims.includes('₹10,000'));
  check('percentage is kept', claims.includes('3.5%'));
  check('duration is kept', claims.includes('6 months'));
  check('multiplier is kept', claims.includes('2x'));
  check('text with no digits is dropped', !claims.some(c => c === ''));
  check('"Step 2" is dropped as an ordinal', !claims.includes('Step 2'));

  console.log('\non-screen text may not repeat the series bar:');
  const topic = { stepNumber: 1, stepTitleEn: 'First ₹10,000' } as any;
  const echoesStep = { ...script, beats: script.beats.map((b, i) => i === 2 ? { ...b, onScreen: 'Step 1' } : b) };
  check('"Step 1" beat text is caught',
    structuralIssues(echoesStep, topic).some(i => i.includes('repeats the series bar')));
  const echoesTitle = { ...script, beats: script.beats.map((b, i) => i === 2 ? { ...b, onScreen: 'First ₹10,000' } : b) };
  check('beat text echoing the step title is caught',
    structuralIssues(echoesTitle, topic).some(i => i.includes('repeats the series bar')));
  check('a real idea passes', structuralIssues(script, topic).length === 0, structuralIssues(script, topic).join('; '));
  check('without a topic the check is skipped, not crashed', structuralIssues(echoesStep).length === 0);

  console.log('\nspoken lines must spell numbers, not print them:');
  // The bug the first real episode had: the voice read "₹10,000" aloud as a
  // stumble because the say line carried the symbol instead of the words.
  const symbolInSay = { ...script, beats: script.beats.map((b, i) => i === 0
    ? { ...b, say: '₹10,000 अलग रखो।' } : b) };
  check('a rupee symbol in a spoken line is caught',
    languageIssues(symbolInSay).some(i => i.includes('beat 0 say') && i.includes('₹')));

  const digitsInSay = { ...script, ctaSaid: 'आपके पास 5000 रुपये हैं?' };
  check('digits in a spoken line are caught',
    languageIssues(digitsInSay).some(i => i.includes('ctaSaid')));

  const pctInSay = { ...script, hookSaid: 'सालाना 42% ब्याज लगता है।' };
  check('a percent sign in a spoken line is caught',
    languageIssues(pctInSay).some(i => i.includes('hookSaid')));

  check('spelled-out numbers pass', languageIssues(script).length === 0, languageIssues(script).join('; '));
  // On screen the symbols are exactly what we want — the rule is one-directional.
  check('the SAME symbols are fine on screen',
    languageIssues({ ...script, hook: 'Save your first ₹10,000' }).length === 0);

  console.log('\ncaptions carry the muted viewer:');
  check('a valid script has no caption issues', structuralIssues(script).length === 0, structuralIssues(script).join('; '));

  const noCaption = { ...script, beats: script.beats.map((b, i) => i === 1 ? { ...b, caption: '' } : b) };
  check('a missing caption is rejected',
    structuralIssues(noCaption).some(i => i.includes('muted viewer')));

  const stubCaption = { ...script, beats: script.beats.map((b, i) => i === 0 ? { ...b, caption: 'Save money' } : b) };
  check('a caption too short to stand alone is rejected',
    structuralIssues(stubCaption).some(i => i.includes('too short')));

  const longCaption = { ...script, beats: script.beats.map((b, i) => i === 0 ? { ...b, caption: 'word '.repeat(25).trim() } : b) };
  check('a caption too long to read in the beat is rejected',
    structuralIssues(longCaption).some(i => i.includes('too long')));

  const hindiCaption = { ...script, beats: script.beats.map((b, i) => i === 0 ? { ...b, caption: 'दस हज़ार रुपये अलग रखो और फिर निवेश करो।' } : b) };
  check('a Devanagari caption is caught — it is DRAWN, not spoken',
    languageIssues(hindiCaption).some(i => i.includes('beat 0 caption')));

  // The caption reaches a viewer, so it must go through the same compliance
  // sweep as everything else — advice hidden only in the caption still ships.
  const adviceInCaption = { ...script, beats: script.beats.map((b, i) => i === 0 ? { ...b, caption: 'Buy these shares today for a quick profit.' } : b) };
  check('advice hidden in a caption is caught',
    complianceViolations(scriptSurfaceText(adviceInCaption)).length > 0);

  console.log('\ncompliance sweep over a whole script:');
  check('clean script passes', complianceViolations(scriptSurfaceText(script)).length === 0);
  const bad = { ...script, beats: [...script.beats, { onScreen: 'Take this', say: 'ये फंड 15% रिटर्न देता है।', caption: 'This fund gives fifteen percent returns every year.', visual: { kind: 'bigNumber' as const } }] };
  check('violating beat is caught via surface text', complianceViolations(scriptSurfaceText(bad)).length > 0);
  // The compliance sweep must see the SPOKEN text too, not just what is drawn —
  // a recommendation read aloud is still a recommendation.
  const spokenAdvice = { ...script, ctaSaid: 'आज ही ये शेयर खरीदो।' };
  check('advice hidden in a spoken-only field is caught', complianceViolations(scriptSurfaceText(spokenAdvice)).length > 0);

  // ── v3 direction ───────────────────────────────────────────────────────────
  // The probe proved tags come back inside the alignment stream. Everything
  // here is about making sure that costs us nothing.

  console.log('\nv3 direction is added without changing the words:');
  const V3 = 'eleven_v3';
  const plain = voiceoverText(script);
  const directed = directedVoiceoverText(script, V3);

  check('v2 gets no tags at all — it would read them aloud',
    directedVoiceoverText(script, 'eleven_multilingual_v2') === plain);
  check('the shipped default is a model that has been heard',
    !acceptsAudioTags(MONEY_TTS_MODEL) || process.env.MONEY_TTS_MODEL !== undefined);
  check('v3 does get tags', directed !== plain && /\[/.test(directed));
  // The property the whole design rests on: direction changes delivery, never
  // words. If this drifts, the runtime guard throws AFTER the credits are spent.
  check('stripping the direction returns the voiceover exactly',
    stripAudioTags(directed) === plain,
    stripAudioTags(directed) === plain ? '' : stripAudioTags(directed).slice(0, 80));
  check('only probed tags are used',
    (directed.match(/\[[^\]]*\]/g) ?? []).every((t) => (TAG_VOCABULARY as readonly string[]).includes(t)),
    (directed.match(/\[[^\]]*\]/g) ?? []).join(' '));
  check('the read is directed, not micromanaged',
    (directed.match(/\[/g) ?? []).length <= 6, `${(directed.match(/\[/g) ?? []).length} tags`);
  // [emphatic] belongs on the beat carrying the figure. In this fixture that is
  // beat 0, the bigNumber — so it must sit immediately before that line.
  check('the emphasis lands on the beat carrying the number',
    directed.includes(`[emphatic] ${script.beats[0].say}`));
  check('every tag is whitespace-separated, so none fuses to a Hindi word',
    !/[^\s]\[/.test(directed) && !/\][^\s]/.test(directed));

  console.log('\ntag tokens are filtered back out of the timings:');
  // Built the way ElevenLabs returns them: split on whitespace, tags included,
  // exactly the shape that made the probe report 31 words instead of 27.
  const fakeStream = directed.split(/\s+/).filter(Boolean).map((word, i) => ({
    word, start: i * 0.4, end: i * 0.4 + 0.35,
  }));
  const kept = dropTagTimings(fakeStream);
  const tagCount = (directed.match(/\[/g) ?? []).length;
  check('the tagged stream is longer by exactly the tag count',
    fakeStream.length === plain.split(/\s+/).filter(Boolean).length + tagCount,
    `${fakeStream.length} tagged vs ${plain.split(/\s+/).filter(Boolean).length} plain, ${tagCount} tags`);
  check('filtering restores the plain word sequence exactly',
    kept.map((w) => w.word).join(' ') === plain,
    kept.map((w) => w.word).join(' ').slice(0, 80));
  // The assumption dropTagTimings rests on, asserted rather than trusted: no
  // spoken token in this channel is Latin-only, so dropping Latin-only tokens
  // can never eat real speech.
  check('no genuinely spoken token would be dropped',
    plain.split(/\s+/).filter(Boolean).every((w) => dropTagTimings([{ word: w, start: 0, end: 1 }]).length === 1));
  check('audible-tag time is measurable', tagAudibleSeconds(fakeStream) > 0);
  check('...and is zero once the tags are silent',
    tagAudibleSeconds(fakeStream.map((w) => /^\[/.test(w.word) ? { ...w, end: w.start } : w)) === 0);

  // A script with no hook still has to produce a legal directed string — the
  // generator can drop hookSaid and degrade to a shorter voiceover.
  const noHook = { ...script, hookSaid: '' };
  check('a hookless script still strips back exactly',
    stripAudioTags(directedVoiceoverText(noHook, V3)) === voiceoverText(noHook));
  const noNumberVisual = { ...script, beats: script.beats.map((b) => ({ ...b, visual: { kind: 'ladder' as const } })) };
  check('a script with no bigNumber beat still emphasises somewhere',
    directedVoiceoverText(noNumberVisual, V3).includes('[emphatic]'));

  // In the fixture the number lands on beat 0, where the post-hook [breathes]
  // already supplies the gap. When it lands later there is no such gap, so the
  // silence has to be asked for — the branch that carries [pause] at all.
  const lateNumber = {
    ...script,
    beats: script.beats.map((b, i) => ({ ...b, visual: (i === 2 ? { kind: 'bigNumber' as const, value: '₹10,000' } : { kind: 'ladder' as const }) })),
  };
  const lateDirected = directedVoiceoverText(lateNumber, V3);
  check('a number arriving mid-read gets silence before it',
    lateDirected.includes(`[pause] [emphatic] ${script.beats[2].say}`), lateDirected.slice(0, 90));
  check('...and still strips back exactly', stripAudioTags(lateDirected) === voiceoverText(lateNumber));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
