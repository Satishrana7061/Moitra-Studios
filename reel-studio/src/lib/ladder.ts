/**
 * The seven rungs, in order.
 *
 * Single source of truth for the ladder labels. They were previously hardcoded
 * inside Visuals.tsx while the same list also lived in content/money-ladder.json,
 * so the two could drift apart silently. The curriculum validator now asserts
 * its `titleEn` values match this array.
 *
 * Labels are English because everything rendered is English — only the voiceover
 * is Hindi. Keep them short: they are drawn as seven stacked rows.
 */
export const LADDER_STEPS = [
  'First ₹10,000',
  'Clear the debt',
  '6-month fund',
  'Right insurance',
  'Investing habit',
  'Your own home',
  'The future',
] as const;

export const LADDER_STEP_COUNT = LADDER_STEPS.length;
