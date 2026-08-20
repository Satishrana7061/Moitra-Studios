import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  callModel,
  scriptSurfaceText,
  voiceoverText,
  languageIssues,
  structuralIssues,
  checkableClaims,
  hasNumericMaterial,
  getStoredScript,
  storedScriptIssues,
  FREE_TIER_MODELS,
  SCRIPT_MODEL,
  FALLBACK_MODEL,
  type Provider,
  type MoneyScript,
} from '../services/moneyScriptGenerator.js';
import { complianceViolations, getAllTopics } from '../services/moneyCurriculum.js';
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
    { onScreen: 'Ten thousand', say: 'दस हज़ार रुपये... अलग रखो।', caption: 'Put ten thousand rupees aside before you invest anything.', visual: { kind: 'bigNumber', value: '₹10,000', label: 'Starter buffer' } },
    { onScreen: 'A separate account', say: 'इसे सैलरी खाते से, अलग रखो।', caption: 'Keep it in a separate account from your salary.', visual: { kind: 'compare', a: 'Savings', b: 'Salary', aLabel: 'Untouched', bLabel: 'Spent' } },
    { onScreen: 'Only then invest', say: 'ये होने के बाद ही, निवेश की बात करो।', caption: 'Only once that is done should you talk about investing.', visual: { kind: 'ladder', highlightStep: 1 } },
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
    check('no providers configured -> throws', e.message.includes('OPENAI_API_KEY is not configured'));
  }

  // ── cost ───────────────────────────────────────────────────────────────────
  // The account gets 2.5M tokens a day free on the mini/nano tier and only 250K
  // on gpt-5.4. Script generation was defaulting to the expensive one, and a
  // day of fact research on it ran 675K tokens and cost real money. A billing
  // mistake surfaces on a dashboard a fortnight later, so it needs a tripwire
  // in the suite instead.
  console.log('\nstaying inside the free tier:');
  check('the script model is on the free mini tier',
    (FREE_TIER_MODELS as readonly string[]).includes(SCRIPT_MODEL), SCRIPT_MODEL);
  check('so is the fallback',
    (FREE_TIER_MODELS as readonly string[]).includes(FALLBACK_MODEL), FALLBACK_MODEL);
  check('the fallback is a different model from the primary', SCRIPT_MODEL !== FALLBACK_MODEL);

  // The larger of the two mistakes: OpenAI was doing the web searching, which
  // burns input tokens faster than anything else here — on the expensive tier.
  // Research is done with tools that cost the user nothing and whose sources
  // get verified before they are written, not after.
  const srcDir = path.resolve(fileURLToPath(import.meta.url), '..', '..');
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      // Assembled at runtime rather than written literally, because otherwise
      // this scanner matches its own source and reports itself as an offender.
      else if (entry.name.endsWith('.ts') && new RegExp(['web', 'search'].join('_')).test(fs.readFileSync(full, 'utf-8'))) {
        offenders.push(path.relative(srcDir, full));
      }
    }
  };
  walk(srcDir);
  check('no code asks OpenAI to run a web search', offenders.length === 0, offenders.join(', '));

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
  const bad = { ...script, beats: [...script.beats, { onScreen: 'Take this', say: 'ये फंड, 15% रिटर्न देता है।', caption: 'This fund gives fifteen percent returns every year.', visual: { kind: 'bigNumber' as const } }] };
  check('violating beat is caught via surface text', complianceViolations(scriptSurfaceText(bad)).length > 0);
  // The compliance sweep must see the SPOKEN text too, not just what is drawn —
  // a recommendation read aloud is still a recommendation.
  const spokenAdvice = { ...script, ctaSaid: 'आज ही ये शेयर खरीदो।' };
  check('advice hidden in a spoken-only field is caught', complianceViolations(scriptSurfaceText(spokenAdvice)).length > 0);

  // ── v3 direction ───────────────────────────────────────────────────────────
  // The probe proved tags come back inside the alignment stream. Everything
  // here is about making sure that costs us nothing.

  // The end-to-end version of the same bug: a realistic Hindi line carrying the
  // loanwords the prompt asks for has to come back out of the filter intact, or
  // the aligner cannot match it and every cut in the episode becomes a guess.
  const mixed = 'आपका EMI हर महीने, कट जाता है। credit card का बिल भी।';
  const mixedStream = mixed.split(/\s+/).map((word, i) => ({ word, start: i * 0.4, end: i * 0.4 + 0.35 }));
  check('a real Hindi line with English loanwords survives intact',
    dropTagTimings(mixedStream).map((w) => w.word).join(' ') === mixed,
    dropTagTimings(mixedStream).map((w) => w.word).join(' '));

  console.log('\npunctuation is how the voice is directed — measured at 3-4x more silence:');
  const flatSay = { ...script, beats: script.beats.map((b, i) => i === 1 ? { ...b, say: 'इसे सैलरी खाते से अलग रखो' } : b) };
  check('a say line with no internal pause is rejected',
    structuralIssues(flatSay).some((i) => i.includes('no internal pause mark')));
  for (const [mark, line] of [['comma', 'इसे सैलरी खाते से, अलग रखो।'], ['ellipsis', 'इसे सैलरी खाते से... अलग रखो।'], ['question', 'इसे सैलरी खाते से अलग रखो? हाँ।']] as [string, string][]) {
    const ok = { ...script, beats: script.beats.map((b, i) => i === 1 ? { ...b, say: line } : b) };
    check(`a ${mark} satisfies it`, structuralIssues(ok).length === 0, structuralIssues(ok).join('; '));
  }

  console.log('\nthe live read carries no tags — three probe runs said they do nothing:');
  const V3 = 'eleven_v3';
  const plain = voiceoverText(script);
  // Explicitly on, to exercise the retained builder. The live path is asserted
  // separately below.
  const directed = directedVoiceoverText(script, V3, true);

  // The finding this encodes: v3-tagged held 1.22s of silence against
  // v3-plain's 1.23s, across three runs. The tags are accepted and ignored,
  // so the direction moved into the prompt and the emission was switched off.
  check('the shipped path emits no tags', directedVoiceoverText(script, V3) === plain,
    directedVoiceoverText(script, V3).slice(0, 60));
  check('...and still speaks the whole voiceover',
    directedVoiceoverText(script, V3) === voiceoverText(script));

  check('v2 gets no tags at all — it would read them aloud',
    directedVoiceoverText(script, 'eleven_multilingual_v2', true) === plain);
  // Guards a typo more than a policy. MONEY_TTS_MODEL is a free-text env var,
  // and a misspelling would not fail — ElevenLabs would fall back to its own
  // default model and the episode would simply come back read by something we
  // never probed, sounding wrong for no visible reason.
  check('the shipped model is one the probe has actually exercised',
    ['eleven_v3', 'eleven_multilingual_v2'].includes(MONEY_TTS_MODEL), MONEY_TTS_MODEL);
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
  // This assertion used to pass against the fixture alone, which is pure
  // Devanagari — so it confirmed an assumption using data chosen to satisfy it,
  // and the real bug sailed through. The prompt tells the model to keep English
  // where Indians actually use it, so those words are the case that matters.
  check('no genuinely spoken token would be dropped',
    plain.split(/\s+/).filter(Boolean).every((w) => dropTagTimings([{ word: w, start: 0, end: 1 }]).length === 1));
  const loanwords = ['EMI', 'SIP', 'credit', 'card', 'CIBIL', 'ब्याज', 'महीने,', 'रखो।', '...'];
  for (const w of loanwords) {
    check(`"${w}" survives the tag filter — the prompt asks for these`,
      dropTagTimings([{ word: w, start: 0, end: 1 }]).length === 1);
  }
  check('an actual tag token is still removed',
    dropTagTimings([{ word: '[pause]', start: 0, end: 1 }]).length === 0);
  check('...even split across tokens',
    dropTagTimings([{ word: '[slows', start: 0, end: 1 }, { word: 'down]', start: 1, end: 2 }]).length === 0);
  check('audible-tag time is measurable', tagAudibleSeconds(fakeStream) > 0);
  check('...and is zero once the tags are silent',
    tagAudibleSeconds(fakeStream.map((w) => /^\[/.test(w.word) ? { ...w, end: w.start } : w)) === 0);

  // A script with no hook still has to produce a legal directed string — the
  // generator can drop hookSaid and degrade to a shorter voiceover.
  const noHook = { ...script, hookSaid: '' };
  check('a hookless script still strips back exactly',
    stripAudioTags(directedVoiceoverText(noHook, V3, true)) === voiceoverText(noHook));
  const noNumberVisual = { ...script, beats: script.beats.map((b) => ({ ...b, visual: { kind: 'ladder' as const } })) };
  check('a script with no bigNumber beat still emphasises somewhere',
    directedVoiceoverText(noNumberVisual, V3, true).includes('[emphatic]'));

  // In the fixture the number lands on beat 0, where the post-hook [breathes]
  // already supplies the gap. When it lands later there is no such gap, so the
  // silence has to be asked for — the branch that carries [pause] at all.
  const lateNumber = {
    ...script,
    beats: script.beats.map((b, i) => ({ ...b, visual: (i === 2 ? { kind: 'bigNumber' as const, value: '₹10,000' } : { kind: 'ladder' as const }) })),
  };
  const lateDirected = directedVoiceoverText(lateNumber, V3, true);
  check('a number arriving mid-read gets silence before it',
    lateDirected.includes(`[pause] [emphatic] ${script.beats[2].say}`), lateDirected.slice(0, 90));
  check('...and still strips back exactly', stripAudioTags(lateDirected) === voiceoverText(lateNumber));

  // ── worked arithmetic ──────────────────────────────────────────────────────
  // The change the competitive analysis said decides whether a reel gets sent:
  // ONE number the viewer owns, with the sum done where they can see it.

  console.log('\nworked arithmetic — the sum has to be a real sum:');
  const workedBeat = {
    onScreen: 'What it really costs',
    say: 'पचास हज़ार के बकाया पर... साल भर में इक्कीस हज़ार ब्याज लगता है।',
    caption: 'A fifty thousand rupee balance costs you twenty one thousand in a year.',
    visual: { kind: 'worked' as const, base: '₹50,000', baseLabel: 'Card balance', op: '× 42% a year', result: '₹21,000', resultLabel: 'Interest, in one year' },
  };
  const withWorked = { ...script, beats: [...script.beats, workedBeat] };
  check('a real worked sum passes', structuralIssues(withWorked).length === 0,
    structuralIssues(withWorked).join('; '));

  // The failure this guards is specific: asked for arithmetic, a model will
  // happily return base "your salary", op "a bit", result "more". That renders
  // perfectly, reads as a calculation, and teaches nothing.
  const wordySum = { ...script, beats: [...script.beats, { ...workedBeat, visual: { ...workedBeat.visual, base: 'Your salary', result: 'More' } }] };
  check('a "sum" with no numbers in it is rejected',
    wordySum && structuralIssues(wordySum).some((i) => i.includes('is not arithmetic')));
  const halfSum = { ...script, beats: [...script.beats, { ...workedBeat, visual: { ...workedBeat.visual, result: 'a lot less' } }] };
  check('...and so is one with a number on only one side',
    structuralIssues(halfSum).some((i) => i.includes('is not arithmetic')));
  const noOp = { ...script, beats: [...script.beats, { ...workedBeat, visual: { ...workedBeat.visual, op: '' } }] };
  check('a missing operation is caught', structuralIssues(noOp).some((i) => i.includes('visual.op is required')));

  console.log('\n...and it is required exactly where the topic has numbers:');
  const numericTopic = getAllTopics().find((t) => hasNumericMaterial(t));
  const plainTopic = getAllTopics().find((t) => !hasNumericMaterial(t));
  check('the curriculum has topics that carry numbers', Boolean(numericTopic), numericTopic?.id);

  if (numericTopic) {
    check('a numeric topic with no worked beat is rejected',
      structuralIssues(script, numericTopic).some((i) => i.includes('visible arithmetic')));
    check('...and passes once one is added',
      !structuralIssues(withWorked, numericTopic).some((i) => i.includes('visible arithmetic')),
      structuralIssues(withWorked, numericTopic).join('; '));
  }
  if (plainTopic) {
    // The asymmetry that decided the rule: a forced sum on a topic with no
    // numbers is invented arithmetic, and on a money channel that costs trust.
    check('a topic with no numbers is NOT forced to invent a sum',
      !structuralIssues(script, plainTopic).some((i) => i.includes('visible arithmetic')),
      plainTopic.id);
  } else {
    console.log('  n/a   every written topic now carries numbers — nothing to exempt');
  }

  // ── compounding: the strongest idea and the largest exposure ───────────────
  console.log('\ncompounding is allowed as arithmetic, never as a recommendation:');

  // SEBI's circular PERMITS explaining what these products are — that is general
  // financial awareness. It restricts steering money into them. The first
  // version of this rule flagged both, and an existing test caught it.
  for (const [text, blocked] of [
    ['SIP का मतलब क्या है', false],
    ['म्यूचुअल फंड कैसे काम करता है', false],
    ['SIP में निवेश करो', true],
    ['invest in mutual funds every month', true],
    ['म्यूचुअल फंड में पैसा डालो', true],
    ['assuming 10% a year, this becomes 11 lakh', false],
    ['credit card पर बयालीस प्रतिशत ब्याज लगता है', false],
  ] as [string, boolean][]) {
    check(`${blocked ? 'blocked' : 'allowed'}: "${text.slice(0, 34)}"`,
      (complianceViolations(text).length > 0) === blocked);
  }

  const compoundBeat = {
    onScreen: 'Twenty years later',
    say: 'पंद्रह सौ रुपये हर महीने... बीस साल में ग्यारह लाख से ऊपर हो जाते हैं।',
    caption: 'Fifteen hundred a month becomes over eleven lakh in twenty years.',
    visual: { kind: 'compound' as const, monthly: '₹1,500', years: 20, rate: 'assuming 10% a year', result: '₹11,48,545', invested: '₹3,60,000' },
  };
  const withCompound = { ...script, beats: [...script.beats, compoundBeat] };
  const flagged = { ...(getAllTopics().find((t) => t.id === 's1-01')!), illustrativeReturns: true };

  check('a growth rate on an unflagged topic is refused',
    structuralIssues(withCompound, getAllTopics().find((t) => t.id === 's1-01')).some((i) => i.includes('not flagged')));
  check('...and permitted on a topic written for it',
    !structuralIssues(withCompound, flagged).some((i) => i.includes('not flagged')));

  // The one word that separates arithmetic from a promise.
  const bareRate = { ...script, beats: [...script.beats, { ...compoundBeat, visual: { ...compoundBeat.visual, rate: '10% a year' } }] };
  check('a rate stated as fact rather than assumption is refused',
    structuralIssues(bareRate, flagged).some((i) => i.includes('written as an assumption')));

  const twoRates = { ...script, beats: [...script.beats, compoundBeat, { ...compoundBeat, onScreen: 'And again' }] };
  check('two growth rates in one episode is refused',
    structuralIssues(twoRates, flagged).some((i) => i.includes('one illustration per episode')));

  // ── written scripts ────────────────────────────────────────────────────────
  // The daily run now prefers a script written into the curriculum and calls a
  // model only when there is none — because an external API in the critical
  // path is the fragility that killed the news channel, and a zero OpenAI
  // balance proved it by stopping a run outright.
  //
  // The saving is that these checks run ONCE over a static file instead of on
  // every episode against a fresh guess. It would be undone by checking any
  // less strictly, so a hand-written script faces exactly the same gates.
  console.log('\nwritten scripts face the same gates as generated ones:');
  const written = getAllTopics().find((t) => Array.isArray((t.script as any)?.beats));
  check('at least one topic has a written script', Boolean(written), written?.id);

  if (written) {
    check('...and it passes every gate', storedScriptIssues(written).length === 0,
      storedScriptIssues(written).join('; '));
    check('...and the pipeline can read it back', Boolean(getStoredScript(written)?.beats.length));
    check('...and it contains a worked sum for the fault tests to bend',
      (written.script as any).beats.some((b: any) => b.visual?.kind === 'worked'), written.id);

    const bend = (mutate: (c: any) => void): boolean => {
      const clone = JSON.parse(JSON.stringify(written.script));
      mutate(clone);
      return storedScriptIssues({ ...written, script: clone } as any).length > 0;
    };
    for (const [label, mutate] of [
      ['English in a spoken line', (c: any) => { c.beats[0].say = 'Six hundred rupees leaves quietly.'; }],
      ['Devanagari in a drawn line', (c: any) => { c.beats[0].onScreen = 'हर महीने'; }],
      ['a spoken line with no pause mark', (c: any) => { c.beats[0].say = 'हर महीने छह सौ रुपये कट जाते हैं'; }],
      ['a rupee symbol in a spoken line', (c: any) => { c.beats[0].say = '₹599 हर महीने, कट जाते हैं।'; }],
      ['a return figure', (c: any) => { c.beats[0].caption = 'This fund gives 15% returns every year.'; }],
      ['a named bank', (c: any) => { c.beats[0].caption = 'Your SBI card charges this every month.'; }],
      // Found by KIND, not by index. These were written against a script whose
      // second beat happened to be the worked one; the moment another topic
      // took first place in the file the mutation landed on a `compare`, broke
      // nothing, and the assertion failed for a reason that had nothing to do
      // with the rule it was testing.
      ['a worked sum with no numbers', (c: any) => {
        const w = c.beats.find((b: any) => b.visual?.kind === 'worked');
        if (w) w.visual.result = 'a lot more';
      }],
      ['a missing caption', (c: any) => { c.beats[c.beats.length - 1].caption = ''; }],
    ] as [string, (c: any) => void][]) {
      check(`a written script with ${label} is rejected`, bend(mutate));
    }
  }

  // ── the character's timing ─────────────────────────────────────────────────
  // Twice an animation was written that could never be seen: a blink whose
  // first firing fell after the character had left, and a third pose scheduled
  // at 1.75s inside a 1.53s window. Both were correct in the source and simply
  // absent from the video — the least detectable kind of wrong, because
  // everything renders, every check passes, and the thing just is not there.
  //
  // Mirrored from MoneyReel/Rupee rather than imported: reel-studio is a
  // separate package this one does not build against. A drift between them
  // makes this check wrong, which is why the numbers are named here.
  console.log('\nthe character actually appears in the window it is given:');
  const DRAW_SEC = 0.85;
  const appearances: [string, number, number, number[]][] = [
    // name, window, delay, pose times
    ['hook', 3.07, 0.3, [0, 0.8, 1.35]],
    ['closing card', 2.5, 0.15, [0, 0.45, 1.0]],
  ];
  for (const [name, windowSec, delaySec, poses] of appearances) {
    const perf = windowSec - delaySec - DRAW_SEC;
    check(`${name} leaves time to perform`, perf > 1, `${perf.toFixed(2)}s`);
    for (const at of poses) {
      // 0.15s of grace so a pose is not merely reached but held long enough to
      // register as a change rather than a flicker.
      check(`  ...its pose at ${at}s is on screen`, at < perf - 0.15, `window ${perf.toFixed(2)}s`);
    }
  }
  // The blink cycle, with the offset that puts the first one early.
  const blinkOpen = (t: number) => {
    const phase = ((t + 2.3) % 3.1) / 3.1;
    return phase > 0.9 ? Math.abs(Math.cos(((phase - 0.9) / 0.1) * Math.PI)) : 1;
  };
  for (const [name, windowSec, delaySec] of appearances) {
    const perf = windowSec - delaySec - DRAW_SEC;
    let closed = 0;
    for (let f = 0; f < 30 * perf; f++) if (blinkOpen(f / 30) < 0.5) closed++;
    check(`${name}: the eyes blink at least once`, closed > 0, `${closed} frames closed`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
