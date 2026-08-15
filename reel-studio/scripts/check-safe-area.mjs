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

/** Background is deep teal (luma ~30-45); text and numerals are 180+. */
const LUMA_THRESHOLD = 110;
/** Tolerate a few stray antialiased pixels per row. */
const MIN_BRIGHT_PER_ROW = 3;

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
  let lowestContent = null;
  let brightBelow = 0;

  for (let y = height - 1; y >= 0; y--) {
    let bright = 0;
    for (let x = 0; x < width; x += 3) {
      if (data[y * width + x] > LUMA_THRESHOLD) bright++;
    }
    if (bright >= MIN_BRIGHT_PER_ROW) {
      if (lowestContent === null) lowestContent = y;
      // Scale the safe line if the frame was rendered at another size.
      if (y >= Math.round((SAFE_LINE / CANVAS_HEIGHT) * height)) brightBelow += bright;
    }
  }

  const ok = brightBelow === 0;
  if (!ok) failed++;
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${path.basename(file).padEnd(18)} ` +
      `lowest content y=${lowestContent} (limit ${SAFE_LINE})` +
      (ok ? '' : ` — ${brightBelow} bright px inside the UI band`),
  );
}

console.log(
  failed === 0
    ? `\n✅ ${files.length} frame(s) clear of the platform UI band.\n`
    : `\n❌ ${failed} of ${files.length} frame(s) draw into the platform UI band.\n`,
);
process.exit(failed === 0 ? 0 : 1);
