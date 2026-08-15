/**
 * Design tokens for Rajneeti Challenge reels.
 *
 * These are not invented — every colour here was sampled directly out of the
 * shipped game art in `Game FinalGraphics/` (HUD.png, Button.png, Gold.png,
 * PolititianStates/Energy.png, map.png). A reel that advertises the game should
 * look like it was cut from the game, so the reel palette IS the game palette.
 */

export const colors = {
  /** Page background — a shade below the HUD panel so panels read as raised. */
  bgDeep: '#001A38',
  /** Sampled from the in-game bottom-left HUD panel. */
  panel: '#002850',
  panelAlt: '#002058',
  /** HUD.png body blue — used for bars and secondary surfaces. */
  panelLight: '#105898',
  /** Button.png face. */
  button: '#004890',

  /** Button.png label gold, and the brighter Gold.png highlight. */
  gold: '#E8D018',
  goldBright: '#F8F048',

  /** HUD.png accent orange — the game's primary call-to-action colour. */
  orange: '#F86000',
  orangeDark: '#C84800',

  /** HUD money bar. */
  green: '#109000',
  greenDark: '#107000',

  /** Stamina / danger, from PolititianStates/Energy.png. */
  red: '#E81010',
  redDark: '#A00000',

  text: '#F8F8F8',
  textDim: 'rgba(248, 248, 248, 0.66)',
  outline: '#000000',

  /** The cyan halo that rings the game's India map. */
  mapGlow: '#A8E6E6',
  mapSea: '#0A3A5C',
  /** Fill for states that are not the focus of the scenario. */
  mapIdle: '#0E4C77',
  mapIdleStroke: '#04243D',
} as const;

/**
 * India's tricolour, used sparingly for the series bar rule and win states.
 */
export const tricolour = {
  saffron: '#FF9933',
  white: '#FFFFFF',
  green: '#138808',
  chakra: '#000080',
} as const;

export const fonts = {
  /**
   * Devanagari. Bundled at rajneeti-backend/assets/fonts/NotoSansDevanagari.ttf
   * and registered as a @font-face by src/lib/fonts.ts.
   */
  hindi: '"Noto Sans Devanagari", sans-serif',
  /** Latin display face for numerals, episode tags and the install card. */
  display: '"Outfit", sans-serif',
} as const;

/**
 * Type scale for a 1080x1920 frame. These are deliberately large: the reel is
 * watched on a phone at arm's length, and the single most common failure of
 * auto-generated reels is text sized for a desktop preview.
 */
export const type = {
  hook: 96,
  option: 62,
  optionCost: 34,
  reveal: 76,
  caption: 60,
  seriesBar: 34,
  installCta: 54,
} as const;

/** Chunky black outline, matching the game's cartoon art. */
export const strokeText = (width = 8, color: string = colors.outline) =>
  ({
    WebkitTextStrokeWidth: `${width}px`,
    WebkitTextStrokeColor: color,
    paintOrder: 'stroke fill',
  }) as const;

/** The game's signature hard offset drop shadow. */
export const hardShadow = (dx = 0, dy = 10, color: string = colors.outline) =>
  `drop-shadow(${dx}px ${dy}px 0 ${color})`;
