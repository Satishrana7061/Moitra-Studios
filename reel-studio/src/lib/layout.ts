/**
 * Safe-zone geometry for a 1080x1920 vertical reel.
 *
 * Both Instagram/Facebook Reels and YouTube Shorts paint their own UI over the
 * video: a caption block, an author row and an action rail at the bottom, plus
 * a header strip at the top. Anything drawn underneath that chrome is simply
 * not seen by the viewer.
 *
 * The current ffmpeg build gets this wrong — its footer branding sits at ASS
 * MarginV 30-100 from the bottom (ffmpegVideoGenerator.ts:262-264), i.e. inside
 * the action rail, so it has never actually been visible to anyone.
 */

export const CANVAS = { width: 1080, height: 1920, fps: 30 } as const;

/** Reserved for the series bar ("रजनीति चैलेंज · एपिसोड #47"). */
export const SAFE_TOP = 250;

/**
 * Reserved for platform chrome. Nothing meaningful may be drawn below
 * `height - SAFE_BOTTOM`. This is the single most violated rule in
 * auto-generated reels.
 */
export const SAFE_BOTTOM = 520;

/** Horizontal gutter — the action rail also intrudes on the right edge. */
export const SAFE_X = 72;

/** The usable band, in pixels from the top. */
export const CONTENT = {
  top: SAFE_TOP,
  bottom: CANVAS.height - SAFE_BOTTOM,
  get height() {
    return this.bottom - this.top;
  },
  left: SAFE_X,
  right: CANVAS.width - SAFE_X,
  get width() {
    return this.right - this.left;
  },
} as const;

/**
 * Where each element of the format lives. Percentages are of full frame height,
 * kept as absolute pixels so nothing drifts when a segment changes duration.
 */
export const SLOTS = {
  /** Series bar — brand + episode number. */
  seriesBar: { top: 96, height: 96 },
  /** Hook line: "Rs 10 crore. 5 din. Bihar jeeto." */
  hook: { top: 300, height: 300 },
  /** India map with the scenario's state highlighted. */
  map: { top: 300, height: 720 },
  /** The three option cards. */
  options: { top: 1060, height: 480 },
  /** Countdown ring, sits to the right of the hook during the choice window. */
  countdown: { top: 300, size: 180 },
  /** Word-synced captions. Above the platform chrome, below the content. */
  captions: { top: 1180, height: 220 },
} as const;

/** Assert at render time that a box stays inside the safe band. */
export const withinSafeArea = (top: number, height: number): boolean =>
  top >= SAFE_TOP && top + height <= CANVAS.height - SAFE_BOTTOM;

export const OPTION_CARD = {
  height: 132,
  gap: 24,
  radius: 28,
  borderWidth: 6,
} as const;
