import {
  callModel,
  scriptSurfaceText,
  voiceoverText,
  languageIssues,
  structuralIssues,
  type Provider,
  type MoneyScript,
} from '../services/moneyScriptGenerator.js';
import { complianceViolations } from '../services/moneyCurriculum.js';

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
    { onScreen: 'Ten thousand', say: 'दस हज़ार रुपये अलग रखो।', visual: { kind: 'bigNumber', value: '₹10,000', label: 'Starter buffer' } },
    { onScreen: 'A separate account', say: 'इसे सैलरी खाते से अलग रखो।', visual: { kind: 'compare', a: 'Savings', b: 'Salary', aLabel: 'Untouched', bLabel: 'Spent' } },
    { onScreen: 'Only then invest', say: 'ये होने के बाद ही निवेश की बात करो।', visual: { kind: 'ladder', highlightStep: 1 } },
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

  console.log('\ncompliance sweep over a whole script:');
  check('clean script passes', complianceViolations(scriptSurfaceText(script)).length === 0);
  const bad = { ...script, beats: [...script.beats, { onScreen: 'Take this', say: 'ये फंड 15% रिटर्न देता है।', visual: { kind: 'bigNumber' as const } }] };
  check('violating beat is caught via surface text', complianceViolations(scriptSurfaceText(bad)).length > 0);
  // The compliance sweep must see the SPOKEN text too, not just what is drawn —
  // a recommendation read aloud is still a recommendation.
  const spokenAdvice = { ...script, ctaSaid: 'आज ही ये शेयर खरीदो।' };
  check('advice hidden in a spoken-only field is caught', complianceViolations(scriptSurfaceText(spokenAdvice)).length > 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
