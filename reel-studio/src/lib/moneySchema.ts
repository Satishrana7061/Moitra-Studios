import { z } from 'zod';

/**
 * Storyboard contract for पैसे की सीढ़ी.
 *
 * Mirrors the Challenge contract in schema.ts: the pipeline produces one of
 * these, the composition consumes it, and neither knows anything else about the
 * other. Validated in Node before rendering so a malformed board fails with a
 * readable error rather than a broken frame inside headless Chrome.
 */

export const visualSpecSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('bigNumber'), value: z.string(), label: z.string().optional() }),
  // ORDER IS SEMANTIC, not arbitrary: `a` renders green (the better outcome),
  // `b` renders red (the cost). Putting the bad number in `a` silently colours
  // it as good, which is worse than a crash because it still looks correct.
  z.object({ kind: z.literal('compare'), a: z.string(), b: z.string(), aLabel: z.string().optional(), bLabel: z.string().optional() }),
  z.object({ kind: z.literal('steps'), items: z.array(z.string()).min(2).max(4) }),
  z.object({ kind: z.literal('ladder'), highlightStep: z.number().int().min(1).max(7) }),
  z.object({ kind: z.literal('clock'), label: z.string().optional() }),
  /**
   * One number the viewer owns, with visible arithmetic done to it.
   *
   * The competitive finding that mattered most. A stated fact ("cards charge
   * 42% a year") is interesting; a worked sum the viewer can run on their OWN
   * salary before the video ends is usable, and usable is what makes someone
   * send a reel to a friend. On the channel we studied, sends outnumbered
   * comments by more than a hundred to one.
   *
   * `base` and `result` carry their symbols — they are drawn, never spoken.
   * `op` is written the way a person would say it out loud ("× 5%", "− ₹2,000",
   * "÷ 12"), not as a formula.
   */
  /**
   * Compounding, shown as arithmetic — the only place a growth rate may appear.
   *
   * This is the channel's strongest idea (a subscription bundle, invested, over
   * twenty years) and also its largest compliance risk, so the two are bound
   * together in one component rather than left to a prompt to get right.
   *
   * `rate` is drawn on screen as a stated ASSUMPTION, never a promise, and
   * `invested` is drawn beside the result so the viewer always sees what was put
   * in next to what came out. No product is ever named — the vehicle is not the
   * lesson, the compounding is. `moneyCurriculum` refuses this visual on any
   * topic not explicitly flagged for it, and the composition swaps in a stronger
   * disclaimer whenever it appears.
   */
  z.object({
    kind: z.literal('compound'),
    monthly: z.string(),
    years: z.number().int().positive(),
    /** Written as an assumption, e.g. "assuming 10% a year". */
    rate: z.string(),
    result: z.string(),
    invested: z.string(),
  }),
  z.object({
    kind: z.literal('worked'),
    base: z.string(),
    baseLabel: z.string().optional(),
    op: z.string(),
    result: z.string(),
    resultLabel: z.string().optional(),
  }),
]);

export const moneyBeatSchema = z.object({
  /** Big on-screen text. Six words max — enforced upstream by the generator. */
  onScreen: z.string().min(1),
  /**
   * The sound-off line. ENGLISH, a full sentence, shown as a caption.
   *
   * NOT a transcript: the voice speaks Hindi and the screen is English, so a
   * literal transcript would need a Devanagari font back in the bundle and
   * would look wrong at display sizes. This is the same message written for
   * someone reading rather than listening.
   *
   * Optional so older storyboards still render — a beat without one simply
   * shows no caption rather than failing.
   */
  caption: z.string().optional(),
  visual: visualSpecSchema,
  startSec: z.number().nonnegative(),
  endSec: z.number().positive(),
});

export const moneyStoryboardSchema = z.object({
  episode: z.number().int().positive(),
  topicId: z.string(),
  stepNumber: z.number().int().min(1).max(7),
  stepTitle: z.string(),

  hook: z.string().min(1),
  cta: z.string().min(1),
  beats: z.array(moneyBeatSchema).min(1),

  audio: z.object({
    /** staticFile() path or absolute URL to the single mastered track. */
    src: z.string(),
    durationSec: z.number().positive(),
  }),

  // Per-beat `caption` above carries the sound-off message. Per-word timings
  // are still generated upstream -- they
  // are what sets each beat's startSec/endSec -- but they are not rendered, so
  // the composition has no reason to receive them.
  brand: z
    .object({
      seriesName: z.string(),
      disclaimer: z.string(),
      /** Rotated per episode so consecutive uploads are not pixel-identical. */
      layoutVariant: z.enum(['a', 'b', 'c']),
    })
    .default({
      seriesName: 'Hisaab Kitab',
      disclaimer: 'General information, not investment advice',
      layoutVariant: 'a',
    }),
});

export type MoneyStoryboard = z.infer<typeof moneyStoryboardSchema>;
export type MoneyBeat = z.infer<typeof moneyBeatSchema>;
export type VisualSpec = z.infer<typeof visualSpecSchema>;

/** Seconds held on the closing CTA card after the voiceover ends. */
export const MONEY_OUTRO_SEC = 2.5;

export const moneyDurationSec = (board: MoneyStoryboard): number =>
  Math.max(board.audio.durationSec, board.beats.at(-1)?.endSec ?? 0) + MONEY_OUTRO_SEC;
