/**
 * Pre-projects public/india_states_FINAL_game.geojson into compact SVG path
 * data for the reel's map layer.
 *
 * Why precompute: the source GeoJSON is 384 KB of lat/lon MultiPolygons. Doing
 * the projection inside the Remotion composition would ship all of that into
 * the browser bundle and re-run the maths on every one of ~900 frames. Here it
 * runs once and emits ~10x smaller pre-projected path strings.
 *
 * Usage:  node scripts/build-map-paths.mjs
 * Output: src/assets/india-paths.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(REPO_ROOT, 'public', 'india_states_FINAL_game.geojson');
const OUT = path.join(__dirname, '..', 'src', 'assets', 'india-paths.json');

/** Target width of the emitted viewBox; height follows from the aspect ratio. */
const TARGET_WIDTH = 1000;
/** Douglas-Peucker tolerance in output units. Higher = smaller file, coarser coast. */
const SIMPLIFY_TOLERANCE = 0.6;
/** Rings smaller than this many output units squared are dropped (specks/islets). */
const MIN_RING_AREA = 1.5;

/**
 * The GeoJSON ships a few non-standard spellings. news_events and the LLM both
 * use the canonical forms, so normalise on the way out and keep the original as
 * an alias so either spelling resolves.
 */
const CANONICAL = {
  Tamilnadu: 'Tamil Nadu',
  Chhattishgarh: 'Chhattisgarh',
  Telengana: 'Telangana',
  Odisha: 'Odisha',
  'Daman and Diu and Dadra and Nagar Haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'Andaman & Nicobar': 'Andaman and Nicobar Islands',
};

/**
 * This particular file is NOT in lat/lon — it ships already projected to Web
 * Mercator (EPSG:3857) in metres, e.g. [9763990.12, 2907418.66] for Bihar. So
 * detect which of the two we were handed and only project when it is degrees.
 *
 * Either way the result is flipped in Y, because Mercator northing grows upward
 * while SVG's Y axis grows downward.
 */
const isDegrees = (coord) => Math.abs(coord[0]) <= 180 && Math.abs(coord[1]) <= 90;

const project = ([x, y]) => {
  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    // Already EPSG:3857 metres — pass through, flip Y.
    return [x, -y];
  }
  const clamped = Math.max(-85, Math.min(85, y));
  const rad = (clamped * Math.PI) / 180;
  return [x, -Math.log(Math.tan(Math.PI / 4 + rad / 2)) * (180 / Math.PI)];
};

const perpDistance = (p, a, b) => {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/** Iterative Douglas-Peucker — recursion blows the stack on the longer coastlines. */
const simplify = (points, tolerance) => {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpDistance(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tolerance && index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
};

const ringArea = (ring) => {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(area / 2);
};

/** MultiPolygon | Polygon -> a flat list of coordinate rings. */
const ringsOf = (geometry) => {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
};

const main = () => {
  if (!fs.existsSync(SRC)) {
    console.error(`[build-map-paths] Source GeoJSON not found: ${SRC}`);
    process.exit(1);
  }

  const geo = JSON.parse(fs.readFileSync(SRC, 'utf-8'));

  const sample = ringsOf(geo.features[0].geometry)[0][0];
  console.log(
    `[build-map-paths] source CRS looks like ${isDegrees(sample) ? 'EPSG:4326 (degrees)' : 'EPSG:3857 (metres)'}`,
  );

  // Pass 1 — project everything and find the overall bounds.
  const projected = geo.features.map((feature) => ({
    name: feature.properties.State_Name,
    rings: ringsOf(feature.geometry).map((ring) => ring.map(project)),
  }));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { rings } of projected) {
    for (const ring of rings) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const scale = TARGET_WIDTH / (maxX - minX);
  const height = Math.round((maxY - minY) * scale);
  const toCanvas = ([x, y]) => [(x - minX) * scale, (y - minY) * scale];

  // Pass 2 — scale to canvas units, simplify, drop specks, emit path data.
  const states = {};
  const centroids = {};
  let totalPoints = 0;

  for (const { name, rings } of projected) {
    const parts = [];
    let cxSum = 0;
    let cySum = 0;
    let areaSum = 0;

    // Largest ring first, and always keep it however small: a state we cannot
    // draw is a state no scenario can be written about. Lakshadweep is entirely
    // below the speck threshold, so an unconditional filter loses it outright.
    const scaled = rings
      .map((ring) => ring.map(toCanvas))
      .map((canvas) => ({ canvas, area: ringArea(canvas) }))
      .sort((a, b) => b.area - a.area);

    for (const [index, { canvas, area }] of scaled.entries()) {
      if (index > 0 && area < MIN_RING_AREA) continue;

      const reduced = simplify(canvas, index === 0 ? SIMPLIFY_TOLERANCE : SIMPLIFY_TOLERANCE * 2);
      if (reduced.length < 3) continue;
      totalPoints += reduced.length;

      const d = reduced
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
        .join('');
      parts.push(`${d}Z`);

      // Area-weighted centroid, so a state's pin lands on its mainland rather
      // than being dragged out to sea by an offshore island.
      const a = Math.max(area, 1e-6);
      const cx = reduced.reduce((s, p) => s + p[0], 0) / reduced.length;
      const cy = reduced.reduce((s, p) => s + p[1], 0) / reduced.length;
      cxSum += cx * a;
      cySum += cy * a;
      areaSum += a;
    }

    if (!parts.length) continue;
    const canonical = CANONICAL[name] ?? name;
    states[canonical] = parts.join('');
    centroids[canonical] = [
      Number((cxSum / areaSum).toFixed(1)),
      Number((cySum / areaSum).toFixed(1)),
    ];
  }

  const aliases = Object.fromEntries(
    Object.entries(CANONICAL).filter(([raw, canon]) => raw !== canon),
  );

  const payload = {
    generatedFrom: 'public/india_states_FINAL_game.geojson',
    viewBox: `0 0 ${TARGET_WIDTH} ${height}`,
    width: TARGET_WIDTH,
    height,
    states,
    centroids,
    aliases,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload), 'utf-8');

  const srcKb = (fs.statSync(SRC).size / 1024).toFixed(0);
  const outKb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(
    `[build-map-paths] ${Object.keys(states).length} states, ${totalPoints} points, ` +
      `viewBox ${TARGET_WIDTH}x${height} — ${srcKb} KB GeoJSON -> ${outKb} KB paths`,
  );
};

main();
