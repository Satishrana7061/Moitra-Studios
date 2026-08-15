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
]);

export const moneyBeatSchema = z.object({
  /** Big on-screen text. Six words max — enforced upstream by the generator. */
  onScreen: z.string().min(1),
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

  // No `captions` field. Per-word timings are still generated upstream -- they
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
      seriesName: 'The Money Ladder',
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
