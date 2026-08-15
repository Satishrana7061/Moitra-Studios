import { continueRender, delayRender, staticFile } from 'remotion';

/**
 * Registers the bundled fonts before the first frame is drawn.
 *
 * This has to gate rendering via delayRender/continueRender. Without it Chrome
 * paints frame 0 with a fallback face and swaps mid-render, so the first second
 * of every reel uses different type from the rest — and with Devanagari the
 * fallback is often missing glyphs entirely, producing tofu boxes.
 */

let loaded: Promise<void> | null = null;

export const loadFonts = (): Promise<void> => {
  if (loaded) return loaded;

  loaded = (async () => {
    const handle = delayRender('Loading Devanagari and display fonts');
    try {
      const faces = [
        new FontFace('Noto Sans Devanagari', `url(${staticFile('fonts/NotoSansDevanagari.ttf')})`),
        new FontFace('Outfit', `url(${staticFile('fonts/Outfit.ttf')})`),
      ];
      await Promise.all(
        faces.map(async (face) => {
          await face.load();
          document.fonts.add(face);
        }),
      );
      await document.fonts.ready;
    } finally {
      continueRender(handle);
    }
  })();

  return loaded;
};
