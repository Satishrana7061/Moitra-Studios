import { z } from 'zod';

/**
 * The Storyboard contract.
 *
 * This is the only interface between the Node pipeline and the renderer. The
 * pipeline produces one of these; the composition consumes it and knows nothing
 * else. Deliberately says nothing about Rajneeti, Modi or Indian politics, so a
 * second channel is a new composition over the same contract rather than a
 * rewrite.
 *
 * Validated in Node before rendering, so a malformed storyboard fails with a
 * readable error instead of silently rendering a broken frame inside headless
 * Chrome at 2am.
 */

export const optionSchema = z.object({
  /** Short Hindi label. Long labels are the fastest way to ruin a reel. */
  label: z.string().min(1).max(48),
  /** Optional resource cost badge, e.g. "₹4 करोड़". */
  cost: z.string().max(24).optional(),
});

export const captionTokenSchema = z.object({
  word: z.string(),
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
});

export const brandSchema = z.object({
  /** Series name shown top-left, e.g. "रजनीति चैलेंज". */
  seriesName: z.string().default('रजनीति चैलेंज'),
  /**
   * Rotated per episode. Not decoration: YouTube's inauthentic-content policy
   * targets output that "looks like it was made with a template with little to
   * no variation across videos", so the variant is seeded on the episode number.
   */
  layoutVariant: z.enum(['a', 'b', 'c']).default('a'),
  accent: z.string().optional(),
});

/**
 * Segment boundaries in seconds. Computed by the pipeline from the real
 * voiceover timings rather than assumed here, so the visuals can never drift
 * out of sync with what is actually being said.
 */
export const beatsSchema = z.object({
  setupEndSec: z.number().positive(),
  choiceEndSec: z.number().positive(),
  revealEndSec: z.number().positive(),
});

export const storyboardSchema = z.object({
  episode: z.number().int().positive(),

  /** Indian state the scenario is set in; resolved via lib/states.ts. */
  state: z.string(),
  /** Optional leader whose avatar is shown; resolved via the asset manifest. */
  leader: z.string().nullable().default(null),

  /** On-screen hook, <= 6 words. Truncated by the builder, not by the LLM. */
  hook: z.string().min(1),
  situation: z.string().default(''),

  options: z.array(optionSchema).length(3),
  correctIndex: z.number().int().min(0).max(2),

  reveal: z.string().min(1),
  why: z.string().default(''),
  cta: z.string().default('आप क्या करते? कमेंट करो'),

  audio: z.object({
    /** staticFile() path or absolute URL to the single mastered track. */
    src: z.string(),
    durationSec: z.number().positive(),
  }),

  captions: z.array(captionTokenSchema).default([]),
  beats: beatsSchema,
  // zod 4's .default() takes the OUTPUT type, so the inner field defaults do
  // not fill in for an empty object here -- they have to be spelled out.
  brand: brandSchema.default({ seriesName: 'रजनीति चैलेंज', layoutVariant: 'a' }),
});

export type Storyboard = z.infer<typeof storyboardSchema>;
export type ChallengeOption = z.infer<typeof optionSchema>;
export type CaptionToken = z.infer<typeof captionTokenSchema>;

/** Seconds of install card held after the voiceover ends. */
export const OUTRO_SEC = 3;

export const totalDurationSec = (board: Storyboard): number =>
  Math.max(board.audio.durationSec, board.beats.revealEndSec) + OUTRO_SEC;
