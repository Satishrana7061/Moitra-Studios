/**
 * Fails if any rendered frame draws content inside the platform-UI band.
 *
 * Instagram, Facebook and YouTube all paint their own chrome over the bottom of
 * a vertical video — caption, author row, action rail. Anything drawn under it
 * is invisible to the viewer, and for this channel that includes the compliance
 * disclaimer, which must never be occluded.
 *
 * Eyeballing this does not scale to a daily pipeline, so it is a check. It
 * caught a real regression during development: the disclaimer was positioned at
 * `height - SAFE_BOTTOM + 16`, i.e. 16px BELOW the line rather than above it.
 *
 *   node scripts/check-safe-area.mjs out/*.png
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const CANVAS_HEIGHT = 1920;
const SAFE_BOTTOM = 520;
const SAFE_LINE = CANVAS_HEIGHT - SAFE_BOTTOM;

/**
 * "Content" is whatever DIFFERS from the page, in either direction.
 *
 * The first version of this looked for bright pixels, because the palette was
 * bright type on a dark teal ground. That assumption was invisible until the
 * palette became ink on cream — at which point the page itself is luma ~235 and
 * every single row would have been reported as content, so the check would have
 * failed everything and told us nothing about the safe area.
 *
 * A check whose correctness depends on the colour scheme is not much of a check.
 * This measures deviation from the frame's own background instead, which works
 * on either polarity and on whatever palette comes next.
 */
const CONTENT_DELTA = 45;
/** Tolerate a few stray antialiased pixels per row. */
const MIN_CONTENT_PER_ROW = 3;

/** The page colour, taken as the most common luma in the frame. */
function backgroundLuma(data) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 7) hist[data[i]]++;
  let best = 0;
  for (let v = 1; v < 256; v++) if (hist[v] > hist[best]) best = v;
  return best;
}

const files = process.argv.slice(2).filter((f) => fs.existsSync(f));
if (!files.length) {
  console.error('usage: node scripts/check-safe-area.mjs <frame.png> [...]');
  process.exit(2);
}

let failed = 0;

for (const file of files) {
  const { data, info } = await sharp(file)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const page = backgroundLuma(data);
  let lowestContent = null;
  let contentBelow = 0;

  for (let y = height - 1; y >= 0; y--) {
    let content = 0;
    for (let x = 0; x < width; x += 3) {
      if (Math.abs(data[y * width + x] - page) > CONTENT_DELTA) content++;
    }
    if (content >= MIN_CONTENT_PER_ROW) {
      if (lowestContent === null) lowestContent = y;
      // Scale the safe line if the frame was rendered at another size.
      if (y >= Math.round((SAFE_LINE / CANVAS_HEIGHT) * height)) contentBelow += content;
    }
  }

  const ok = contentBelow === 0;
  if (!ok) failed++;
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${path.basename(file).padEnd(18)} ` +
      `page luma ${page}, lowest content y=${lowestContent} (limit ${SAFE_LINE})` +
      (ok ? '' : ` — ${contentBelow} content px inside the UI band`),
  );
}

console.log(
  failed === 0
    ? `\n✅ ${files.length} frame(s) clear of the platform UI band.\n`
    : `\n❌ ${failed} of ${files.length} frame(s) draw into the platform UI band.\n`,
);
process.exit(failed === 0 ? 0 : 1);
