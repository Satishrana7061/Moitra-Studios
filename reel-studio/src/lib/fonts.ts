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
    const handle = delayRender('Loading display font');
    const url = staticFile('fonts/Outfit.ttf');
    try {
      // Outfit only: nothing Devanagari is rendered any more.
      const face = new FontFace('Outfit', `url(${url})`);
      await face.load();
      document.fonts.add(face);
      await document.fonts.ready;
    } catch (err) {
      // Rethrow with the URL attached. The raw failure is a bare
      // "DOMException: NetworkError", which says nothing about which file was
      // missing or why — and the answer is almost always that public/fonts was
      // not in the checkout. Fail loudly rather than continuing: a reel that
      // renders in a fallback face still looks finished, so a silent fallback
      // ships wrong-looking video instead of stopping the run.
      throw new Error(
        `[reel-studio] Could not load the display font from ${url}. ` +
          'Check that reel-studio/public/fonts/Outfit.ttf exists in this checkout. ' +
          `Underlying error: ${(err as Error)?.message ?? String(err)}`,
      );
    } finally {
      continueRender(handle);
    }
  })();

  return loaded;
};
