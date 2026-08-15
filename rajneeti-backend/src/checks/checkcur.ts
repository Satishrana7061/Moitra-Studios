import { loadCurriculum, validateCurriculum, getAllTopics, getNextTopic, curriculumStats, complianceViolations } from '../services/moneyCurriculum.js';

const cur = loadCurriculum();
const stats = curriculumStats(cur);
console.log('stats:', JSON.stringify(stats));

const issues = validateCurriculum(cur);
console.log(`validation issues: ${issues.length}`);
for (const i of issues.slice(0, 15)) console.log(`  [${i.topicId}] ${i.field}: ${i.message}`);

// Selector: walk the whole curriculum, assert strict order and no repeats.
const seen = new Set<string>();
const order: string[] = [];
for (let i = 0; i < stats.writtenTopics + 2; i++) {
  const t = getNextTopic(seen);
  if (!t) { console.log(`exhausted after ${order.length} topics (expected ${stats.writtenTopics})`); break; }
  if (seen.has(t.id)) { console.log('REPEAT!', t.id); break; }
  seen.add(t.id); order.push(t.id);
}
const expected = getAllTopics().map(t => t.id);
console.log('selector order matches curriculum order:', JSON.stringify(order) === JSON.stringify(expected) ? 'PASS' : 'FAIL');
console.log('no repeats across full walk:', new Set(order).size === order.length ? 'PASS' : 'FAIL');
console.log('first 3:', order.slice(0,3).join(', '), '| last:', order[order.length-1]);

// Compliance lint must actually catch things.
const shouldFlag = [
  'इस फंड में 15% रिटर्न मिलता है',
  'ये शेयर खरीदें अभी',
  'NSE: RELIANCE अच्छा है',
  'ये दोगुना हो जाएगा',
];
const shouldPass = [
  'SIP का मतलब क्या है',
  'इमरजेंसी फंड निवेश नहीं है',
  'महीने का 3.5% = साल का 42%',
];
console.log('\ncompliance lint:');
for (const s of shouldFlag) console.log(`  FLAG expected -> ${complianceViolations(s).length > 0 ? 'PASS' : 'FAIL'}  "${s}"`);
for (const s of shouldPass) console.log(`  PASS expected -> ${complianceViolations(s).length === 0 ? 'PASS' : 'FAIL: ' + JSON.stringify(complianceViolations(s))}  "${s}"`);
