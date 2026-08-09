/**
 * Indexes `Game FinalGraphics/` into a manifest the compositions can query by
 * meaning ("avatar for Nitish Kumar") instead of by file path, and copies the
 * subset the reels actually use into reel-studio/public/game/.
 *
 * Only the used subset is copied: the full kit is 62 MB across 251 files, and
 * Remotion has to bundle whatever sits in public/. Leader avatars plus a few UI
 * frames come to a couple of MB.
 *
 * Several source filenames are misspelled ("Avaters", "MAMTA BENRJEE",
 * "UDDAV THACKREAY"), so display names are mapped explicitly rather than
 * derived, and aliases let `news_events.leader` values resolve either way.
 *
 * Usage:  node scripts/build-asset-manifest.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ART_DIR = path.join(REPO_ROOT, 'Game FinalGraphics');
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'game');
const OUT = path.join(__dirname, '..', 'src', 'assets', 'game-assets.json');

/** Avatar filename (without .png) -> canonical display name. */
const LEADER_NAMES = {
  'AKHILESH YADAV': 'Akhilesh Yadav',
  'AMIT SHAH': 'Amit Shah',
  'ARVIND KEJRIWAL': 'Arvind Kejriwal',
  'BHAGWANT MANN': 'Bhagwant Mann',
  'LALU PRASAD YADAV': 'Lalu Prasad Yadav',
  'M K STALIN': 'M. K. Stalin',
  'MALLIKARJUN KHARGE': 'Mallikarjun Kharge',
  'MAMTA BENRJEE': 'Mamata Banerjee',
  MAYAWATI: 'Mayawati',
  'N. CHANDRABABU NAIDU': 'N. Chandrababu Naidu',
  'NARENDRA MODI (PM)': 'Narendra Modi',
  'NIRMALA SITHARAMAN': 'Nirmala Sitharaman',
  'NITISH KUMAR': 'Nitish Kumar',
  'PINARAYI VIJAYAN': 'Pinarayi Vijayan',
  'PRASHANT KISHOR': 'Prashant Kishor',
  'PRIYANKA GANDHI': 'Priyanka Gandhi',
  'RAHUL GANDHI': 'Rahul Gandhi',
  'RAJNATH SINGH': 'Rajnath Singh',
  'SMRITI IRANI': 'Smriti Irani',
  'TEJASWI YADAV': 'Tejashwi Yadav',
  'UDDAV THACKREAY': 'Uddhav Thackeray',
  'YOGI ADITYANATH': 'Yogi Adityanath',
};

/** Extra ways the news bot or the LLM might refer to a leader. */
const LEADER_ALIASES = {
  'narendra modi': 'Narendra Modi',
  modi: 'Narendra Modi',
  'pm modi': 'Narendra Modi',
  'rahul gandhi': 'Rahul Gandhi',
  'mamata banerjee': 'Mamata Banerjee',
  'mamta banerjee': 'Mamata Banerjee',
  didi: 'Mamata Banerjee',
  'uddhav thackeray': 'Uddhav Thackeray',
  'uddhav thackrey': 'Uddhav Thackeray',
  'tejashwi yadav': 'Tejashwi Yadav',
  'tejaswi yadav': 'Tejashwi Yadav',
  'chandrababu naidu': 'N. Chandrababu Naidu',
  'mk stalin': 'M. K. Stalin',
  'm.k. stalin': 'M. K. Stalin',
  stalin: 'M. K. Stalin',
  yogi: 'Yogi Adityanath',
  kejriwal: 'Arvind Kejriwal',
  'amit shah': 'Amit Shah',
  nitish: 'Nitish Kumar',
  lalu: 'Lalu Prasad Yadav',
};

/** UI pieces worth having in a reel, mapped to stable logical keys. */
const UI_ASSETS = {
  'hud-bar': 'HUD.png',
  'button-primary': 'Button.png',
  'button-empty': 'EmptyButton.png',
  popup: 'Popup.png',
  gold: 'Gold.png',
  'money-bag': 'money bag.png',
  'india-map-flat': 'map.png',
  'gameplay-background': 'GamePlaybackground.png',
};

/** Full gameplay screenshots — useful as B-roll behind a reveal. */
const SCREEN_ASSETS = {
  'screen-india-map': 'India Map with Narendra Modi selected as candidate in Rajneeti Politics game.png',
  'screen-hq-build': 'HQ being built in Indian political simulation game Rajneeti.png',
  'screen-hq-upgrades':
    'HQ upgrades in Indian political game Rajneeti showing think tank and voter center.png',
  'screen-fundraise': 'Generating campaign funds in Gujarat in Rajneeti strategy game.png',
  'screen-rally': 'Political Rally Speeches – Modi, Amit Shah, Rahul Gandhi in Gujarat.png',
  'screen-state-data': 'Gujarat region data with Modi and Amit Shah in Rajneeti political game.png',
};

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Copies an asset into public/, re-encoding opaque images as JPEG.
 *
 * The gameplay screenshots are 1920x1080 opaque PNGs at ~1.5 MB each; as JPEG
 * they are an order of magnitude smaller, and everything in public/ has to be
 * bundled and served to headless Chrome on every render. Anything with real
 * transparency (avatars, UI chrome, the flat map) stays PNG — flattening those
 * onto a matte would put a white box behind every cut-out.
 */
const emit = async (absSource, relTargetNoExt, { maxWidth = null } = {}) => {
  const image = sharp(absSource);
  const meta = await image.metadata();

  let opaque = !meta.hasAlpha;
  if (meta.hasAlpha) {
    // hasAlpha only says the channel exists, not that anything uses it.
    const { isOpaque } = await image.stats();
    opaque = isOpaque;
  }

  const ext = opaque ? 'jpg' : 'png';
  const relTarget = `${relTargetNoExt}.${ext}`;
  const dest = path.join(PUBLIC_DIR, relTarget);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  let pipeline = sharp(absSource);
  if (maxWidth && meta.width > maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }
  pipeline = opaque
    ? pipeline.flatten({ background: '#001A38' }).jpeg({ quality: 82, mozjpeg: true })
    : pipeline.png({ compressionLevel: 9, palette: false });

  await pipeline.toFile(dest);
  return { url: `game/${relTarget}`, bytes: fs.statSync(dest).size };
};

const main = async () => {
  if (!fs.existsSync(ART_DIR)) {
    console.error(`[build-asset-manifest] Art directory not found: ${ART_DIR}`);
    process.exit(1);
  }

  fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  let copied = 0;
  let bytes = 0;
  const track = ({ bytes: n }) => {
    copied += 1;
    bytes += n;
  };

  // ── Leader avatars ────────────────────────────────────────────────
  const avatarDir = path.join(ART_DIR, 'Avaters');
  const leaders = {};
  const missingAvatars = [];

  for (const [file, display] of Object.entries(LEADER_NAMES)) {
    const abs = path.join(avatarDir, `${file}.png`);
    if (!fs.existsSync(abs)) {
      missingAvatars.push(file);
      continue;
    }
    const result = await emit(abs, `avatars/${slug(display)}`);
    track(result);
    leaders[display] = { name: display, avatar: result.url };
  }

  // ── Party symbols ─────────────────────────────────────────────────
  const symbolDir = path.join(ART_DIR, 'PartySymbols');
  const partySymbols = [];
  if (fs.existsSync(symbolDir)) {
    for (const file of fs.readdirSync(symbolDir).filter((f) => f.endsWith('.png')).sort()) {
      const result = await emit(path.join(symbolDir, file), `party-symbols/${path.parse(file).name}`);
      track(result);
      partySymbols.push(result.url);
    }
  }

  // ── UI + screens ──────────────────────────────────────────────────
  const collect = async (table, subdir, opts) => {
    const out = {};
    for (const [key, file] of Object.entries(table)) {
      const abs = path.join(ART_DIR, file);
      if (!fs.existsSync(abs)) {
        console.warn(`[build-asset-manifest] missing: ${file}`);
        continue;
      }
      const result = await emit(abs, `${subdir}/${key}`, opts);
      track(result);
      out[key] = result.url;
    }
    return out;
  };

  const ui = await collect(UI_ASSETS, 'ui');
  // Screens are only ever shown as a background bed behind other layers, so
  // 1080px wide is plenty on a 1080-wide canvas.
  const screens = await collect(SCREEN_ASSETS, 'screens', { maxWidth: 1080 });

  // ── Alias table ───────────────────────────────────────────────────
  const aliases = {};
  for (const display of Object.keys(leaders)) aliases[display.toLowerCase()] = display;
  for (const [raw, display] of Object.entries(LEADER_ALIASES)) {
    if (leaders[display]) aliases[raw] = display;
  }

  const payload = {
    generatedFrom: 'Game FinalGraphics/',
    leaders,
    leaderAliases: aliases,
    partySymbols,
    ui,
    screens,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf-8');

  if (missingAvatars.length) {
    console.warn(`[build-asset-manifest] avatars not found: ${missingAvatars.join(', ')}`);
  }
  console.log(
    `[build-asset-manifest] ${Object.keys(leaders).length} leaders, ${partySymbols.length} party symbols, ` +
      `${Object.keys(ui).length} UI, ${Object.keys(screens).length} screens — ` +
      `${copied} files, ${(bytes / 1024 / 1024).toFixed(1)} MB written to public/game/`,
  );
};

main().catch((err) => {
  console.error('[build-asset-manifest] failed:', err);
  process.exit(1);
});
