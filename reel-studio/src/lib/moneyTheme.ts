/**
 * Design tokens for पैसे की सीढ़ी.
 *
 * Deliberately NOT the Rajneeti palette. `theme.ts` was sampled from the game's
 * HUD — saffron, party blue, cartoon outlines — which reads as political and
 * playful. Money content has to read as calm and credible or the advice is not
 * believed, and sponsors in this niche buy trust, not energy.
 *
 * The palette is dark-teal and gold: dark enough that big white numerals carry
 * the frame, warm enough not to feel like a bank statement.
 */

export const money = {
  /** Deep teal ground. Numbers sit on this. */
  bg: '#07231F',
  bgLift: '#0C332C',
  /** Card surfaces. */
  surface: '#11463C',
  surfaceEdge: '#1C6354',

  /** The one accent. Used for the number that matters, nothing else. */
  gold: '#F2C14E',
  goldDim: '#B8912F',

  /** Positive movement — saving, progress, paid off. */
  growth: '#3FBF8F',
  /** Cost, debt, the thing to avoid. Used sparingly. */
  cost: '#E4572E',

  text: '#F7F5EF',
  textDim: 'rgba(247, 245, 239, 0.62)',
  /** Disclaimer and legal furniture — present, never shouting. */
  legal: 'rgba(247, 245, 239, 0.55)',
} as const;

/**
 * One face, everywhere. Every rendered string is English/Latin — the Hindi
 * exists only in the voiceover, which is sent to ElevenLabs and never drawn.
 * Outfit is a far better display face for large rupee figures than a Devanagari
 * text face, and dropping Noto saves 647 KB and one delayRender.
 */
export const moneyFonts = {
  display: '"Outfit", sans-serif',
} as const;

/**
 * Type scale for 1080x1920, watched at arm's length on a phone. Sized so the
 * key figure is legible in a muted, thumb-scrolling feed.
 */
export const moneyType = {
  hook: 92,
  bigNumber: 190,
  bigNumberLabel: 44,
  beatText: 68,
  compareLabel: 40,
  compareValue: 62,
  stepItem: 52,
  caption: 56,
  seriesBar: 32,
  disclaimer: 24,
} as const;

/** Soft elevation for cards — no cartoon hard shadow here. */
export const softShadow = '0 18px 48px rgba(0, 0, 0, 0.45)';

/** Subtle radial lift behind the focal element so it separates from the ground. */
export const focalGlow = (color: string = money.gold) =>
  `radial-gradient(closest-side, ${color}22, transparent 70%)`;
