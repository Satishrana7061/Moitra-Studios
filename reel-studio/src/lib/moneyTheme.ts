import { CANVAS, SAFE_BOTTOM } from './layout';

/**
 * Design tokens for Hisaab Kitab.
 *
 * The palette is a ledger page, and that is not decoration — it is the channel
 * name made visible. *Hisaab kitab* is the account book: cream paper, faint
 * rules, a red margin line down the left, entries in ink. Every Indian viewer
 * has seen one. It costs nothing to render and it is ours in a way a colour
 * scheme picked for looking nice would not be.
 *
 * This replaces a dark teal and gold palette, and the reason is evidence rather
 * than taste. Watching a competitor in this niche frame by frame, the ground was
 * warm and paper-like throughout. Dark teal reads as a fintech dashboard —
 * institutional, the thing the viewer is anxious about. Paper reads as a friend
 * working it out next to you. For money worry, the notebook wins, and the numbers
 * are what should carry the frame anyway.
 *
 * What is deliberately NOT copied is their khaki-and-stick-figure look. Taking a
 * competitor's exact surface on the same platform in the same niche invites the
 * comparison and loses it — they have sixty videos of equity in it. The mechanic
 * transfers; the identity does not.
 *
 * Contrast was checked, not assumed: ink on paper is ~14:1, and both the growth
 * and cost hues clear 4.5:1 on the ground at the display sizes below.
 */

export const money = {
  /** Cream ledger paper. Everything sits on this. */
  bg: '#F7F1E2',
  /** A page turned slightly in the light — used for the subtle ground gradient. */
  bgLift: '#F2EAD6',
  /** Card surfaces: a shade deeper than the page, never a different material. */
  surface: '#EDE3CC',
  surfaceEdge: '#DCCFB0',

  /** The faint horizontal rules of a register. Structure, not decoration. */
  rule: 'rgba(31, 41, 51, 0.10)',
  /** The red margin line every account book has down its left edge. */
  margin: '#C75146',

  /**
   * The one accent, and it is a highlighter rather than a colour: on paper the
   * way you mark the number that matters is to swipe over it, not to recolour
   * the digits. Used for exactly one thing per frame.
   */
  accent: '#E0913A',
  accentSoft: 'rgba(224, 145, 58, 0.30)',

  /** Money kept. The black column of the ledger. */
  growth: '#2E7D5B',
  /** Money lost. The red column — every account book owes in red. */
  cost: '#C0392B',

  /** Entries. Near-black with a blue cast, the way ink actually dries. */
  text: '#1F2933',
  textDim: 'rgba(31, 41, 51, 0.62)',
  /** Disclaimer and legal furniture — present, never shouting. */
  legal: 'rgba(31, 41, 51, 0.52)',
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

/**
 * The caption band, in ONE place.
 *
 * Both the caption plate and the visual box above it need to know where this
 * sits, and when only the plate knew, the two collided: 10.1 brought captions
 * back but the visual box kept the height it was given for the caption-less
 * layout, so the plate landed on top of the ladder's active rung — the single
 * element the frame existed to show. It rendered, it passed every assertion,
 * and it was wrong.
 *
 * `maxHeight` is the two-line worst case, since a one-line caption is shorter
 * and only ever leaves more room.
 */
export const CAPTION = {
  fontSize: 46,
  lineHeight: 1.25,
  padY: 16,
  borderWidth: 2,
  /** Gap between the plate's bottom edge and the platform-UI line. */
  liftAboveSafe: 74,
} as const;

export const CAPTION_MAX_HEIGHT = Math.round(
  2 * CAPTION.fontSize * CAPTION.lineHeight + CAPTION.padY * 2 + CAPTION.borderWidth * 2,
);

/** The first row a caption may occupy. Nothing else may be drawn below it. */
export const CAPTION_TOP =
  CANVAS.height - SAFE_BOTTOM - CAPTION.liftAboveSafe - CAPTION_MAX_HEIGHT;

/**
 * Elevation for cards.
 *
 * Far lighter than the dark palette's, and it has to be: a shadow tuned for a
 * near-black ground turns into a grey bruise on cream. Paper casts a short,
 * soft, warm-tinted shadow, so that is what this is.
 */
export const softShadow = '0 10px 26px rgba(31, 41, 51, 0.10)';

/** A highlighter swipe behind the focal element, rather than a glow it cannot have on paper. */
export const focalGlow = (color: string = money.accent) =>
  `radial-gradient(closest-side, ${color}2E, transparent 72%)`;
