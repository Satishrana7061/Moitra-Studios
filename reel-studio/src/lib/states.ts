import mapData from '../assets/india-paths.json';

/**
 * State-name resolution.
 *
 * Three vocabularies have to meet here and none of them agree:
 *   - the GeoJSON ships "Tamilnadu", "Chhattishgarh", "Telengana"
 *   - `news_events.state` is written by the news bot (daily_news_automation.py)
 *   - the scenario LLM writes whatever it feels like, sometimes in Hindi
 *
 * Everything funnels through `resolveState` so a scenario can never silently
 * fail to highlight a state because of a spelling difference.
 */

export const VIEW_BOX = mapData.viewBox;
export const MAP_WIDTH = mapData.width;
export const MAP_HEIGHT = mapData.height;

export const STATE_PATHS = mapData.states as Record<string, string>;
// The JSON import widens the centroid pairs to number[], so the tuple shape has
// to be reasserted through unknown.
export const STATE_CENTROIDS = mapData.centroids as unknown as Record<
  string,
  [number, number]
>;

export const ALL_STATES = Object.keys(STATE_PATHS);

/** Extra spellings seen in news_events and in LLM output. */
const EXTRA_ALIASES: Record<string, string> = {
  'tamil nadu': 'Tamil Nadu',
  tamilnadu: 'Tamil Nadu',
  chhattisgarh: 'Chhattisgarh',
  chhattishgarh: 'Chhattisgarh',
  chattisgarh: 'Chhattisgarh',
  telangana: 'Telangana',
  telengana: 'Telangana',
  orissa: 'Odisha',
  odisha: 'Odisha',
  pondicherry: 'Puducherry',
  puducherry: 'Puducherry',
  uttaranchal: 'Uttarakhand',
  'jammu & kashmir': 'Jammu and Kashmir',
  'jammu and kashmir': 'Jammu and Kashmir',
  'j&k': 'Jammu and Kashmir',
  'nct of delhi': 'Delhi',
  'new delhi': 'Delhi',
  delhi: 'Delhi',
  'andaman & nicobar': 'Andaman and Nicobar Islands',
  'andaman and nicobar': 'Andaman and Nicobar Islands',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'up': 'Uttar Pradesh',
  'mp': 'Madhya Pradesh',
};

const NORMALISED: Record<string, string> = (() => {
  const table: Record<string, string> = {};
  for (const name of ALL_STATES) table[name.toLowerCase()] = name;
  for (const [raw, canon] of Object.entries(mapData.aliases ?? {})) {
    table[raw.toLowerCase()] = canon as string;
  }
  for (const [raw, canon] of Object.entries(EXTRA_ALIASES)) table[raw] = canon;
  return table;
})();

/**
 * Returns the canonical state name, or null when the input names no state we
 * can draw. Callers should treat null as "render the map without a highlight"
 * rather than as an error — a missing highlight is survivable, a crashed render
 * at 2am is not.
 */
export const resolveState = (input: string | null | undefined): string | null => {
  if (!input) return null;
  const key = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (NORMALISED[key]) return NORMALISED[key];

  // Last resort: a unique substring match, so "Bihar state" or "in Kerala"
  // still resolve rather than dropping the highlight.
  const hits = ALL_STATES.filter(
    (name) => key.includes(name.toLowerCase()) || name.toLowerCase().includes(key),
  );
  return hits.length === 1 ? hits[0] : null;
};

export const centroidOf = (state: string): [number, number] | null =>
  STATE_CENTROIDS[state] ?? null;
