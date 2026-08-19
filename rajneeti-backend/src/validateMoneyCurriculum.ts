/**
 * Validates content/money-ladder.json and prints a summary.
 *
 *   npm run money:validate
 *
 * Exits non-zero on any issue so it can gate CI before a render ever runs.
 * The compliance rules it enforces are the difference between "general
 * financial awareness" (permitted) and unregistered investment advice, so a
 * failure here should block the pipeline rather than warn.
 */

import {
    loadCurriculum,
    validateCurriculum,
    curriculumStats,
    getAllTopics,
} from './services/moneyCurriculum.js';
import { storedScriptIssues } from './services/moneyScriptGenerator.js';

const curriculum = loadCurriculum();
const stats = curriculumStats(curriculum);
const issues = validateCurriculum(curriculum);

console.log(`\n📚 ${curriculum.series.name} — ${curriculum.series.tagline}`);
console.log(
    `   ${stats.writtenTopics} topics written across ${stats.stepsWritten}/${stats.stepsTotal} steps ` +
        `(~${stats.daysOfContent} days of daily content), ${stats.outlinedTopics} more outlined.`,
);

const byStep = new Map<number, number>();
for (const t of getAllTopics(curriculum)) {
    byStep.set(t.stepNumber, (byStep.get(t.stepNumber) ?? 0) + 1);
}
for (const step of curriculum.steps) {
    const n = byStep.get(step.step) ?? 0;
    const label = step.outlineOnly ? `outline only (${step.plannedTopics?.length ?? 0} planned)` : `${n} topics`;
    console.log(`   कदम ${step.step}: ${step.title} — ${label}`);
}

// Facts coverage. Not a pass/fail: a topic with no facts still renders, but it
// produces the generic script that made the first episode forgettable, so the
// list is printed to be worked down rather than ignored.
// Stored scripts face exactly the gates a generated one does — structural,
// language split, compliance — but ONCE, over a static file, instead of on
// every episode against a fresh guess. That is the whole saving of writing them
// by hand, and it would be undone by checking them any less strictly: a
// hand-written script is just as able to put English in a `say` line or a
// return figure on screen.
const scriptProblems: string[] = [];
for (const topic of getAllTopics()) {
    for (const issue of storedScriptIssues(topic)) {
        scriptProblems.push(`   [${topic.id}] ${issue}`);
    }
}
if (scriptProblems.length) {
    console.log(`\n❌ ${scriptProblems.length} problem(s) in written scripts:`);
    console.log(scriptProblems.join('\n'));
}

console.log(`\n📊 ${stats.topicsWithScript}/${stats.writtenTopics} topics have a written script (the rest still need a model).`);
if (stats.topicsNeedingScript.length) {
    const s1 = stats.topicsNeedingScript.slice(0, 12).join(', ');
    const m1 = stats.topicsNeedingScript.length - 12;
    console.log(`   Still generated: ${s1}${m1 > 0 ? ` … +${m1} more` : ''}`);
}

console.log(`\n📊 ${stats.topicsWithFacts}/${stats.writtenTopics} topics carry real facts.`);
if (stats.topicsNeedingFacts.length) {
    const shown = stats.topicsNeedingFacts.slice(0, 12).join(', ');
    const more = stats.topicsNeedingFacts.length - 12;
    console.log(`   Still generic: ${shown}${more > 0 ? ` … +${more} more` : ''}`);
}

// Volatile facts go stale. A quarterly rate quoted a year late is exactly the
// failure the fact probe demonstrated, so surface the age rather than trusting
// that someone remembers to look.
const STALE_DAYS = 180;
const now = Date.now();
const stale: string[] = [];
for (const step of curriculum.steps) {
    for (const t of step.topics ?? []) {
        for (const fs of (t as any).factSources ?? []) {
            if (!fs?.volatile || !fs?.checkedOn) continue;
            const age = (now - Date.parse(fs.checkedOn)) / 86_400_000;
            if (age > STALE_DAYS) stale.push(`${t.id} (checked ${fs.checkedOn}, ${Math.round(age)} days ago)`);
        }
    }
}
if (stale.length) {
    console.log(`\n⏰ ${stale.length} changing figure(s) not checked in over ${STALE_DAYS} days:`);
    for (const s of stale.slice(0, 8)) console.log(`   ${s}`);
    console.log('   Re-run the research step for these before they are published again.');
}

if (issues.length === 0 && scriptProblems.length === 0) {
    console.log('\n✅ No validation or compliance issues.\n');
    process.exit(0);
}

// A written script that breaks a rule must fail the file, not the run. By the
// time a bad one is caught mid-episode the voice credits are already spent.
if (scriptProblems.length && issues.length === 0) {
    console.error(`\n❌ ${scriptProblems.length} problem(s) in written scripts, listed above.\n`);
    process.exit(1);
}

console.error(`\n❌ ${issues.length} issue(s):`);
for (const i of issues) console.error(`   [${i.topicId}] ${i.field}: ${i.message}`);
console.error('');
process.exit(1);
