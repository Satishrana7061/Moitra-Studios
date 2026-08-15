/**
 * One-time build of the caricature cast.
 *
 * `caricature_prompts_catalog.md` already defines a locked visual style and ~100
 * posed prompts (8 leaders x 10 poses, 10 landmarks, 10 stock characters). Until
 * now nothing has ever run them: `generateImagenAsset()` in wikimediaService.ts
 * is fully written and has zero callers.
 *
 * Generating the cast ONCE and reusing it is deliberate. Per-reel image
 * generation is both expensive and — more importantly — inconsistent: the same
 * character comes back looking different every time, which is exactly what makes
 * AI-generated channels look cheap. A fixed cast is how a channel gets a face.
 *
 * The script is idempotent: anything already present in `media_assets` is
 * skipped, so a run that dies halfway (or a rate limit) just resumes.
 *
 *   npx tsx src/buildCaricatureCast.ts --dry-run      # parse + report, no API calls
 *   npx tsx src/buildCaricatureCast.ts --limit 5      # generate the first 5 only
 *   npx tsx src/buildCaricatureCast.ts --only "Narendra Modi"
 *   npx tsx src/buildCaricatureCast.ts                # full cast
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { generateImagenAsset } from './services/wikimediaService.js';
import './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CATALOG = path.join(REPO_ROOT, 'caricature_prompts_catalog.md');
const MANIFEST_OUT = path.join(REPO_ROOT, 'reel-studio', 'src', 'assets', 'cast.json');

/** Delay between Imagen calls, to stay clear of per-minute quota. */
const DELAY_MS = Number(process.env.IMAGEN_DELAY_MS ?? 6000);

export type CastEntry = {
    /** Stable key, e.g. "narendra-modi-pose-3-yogic-meditation". */
    slug: string;
    /** "Narendra Modi", "Indian Parliament", "Angry Taxpayer". */
    subject: string;
    /** "Yogic Meditation", "Megaphone Rally", or null for single-pose subjects. */
    pose: string | null;
    category: 'leader' | 'landmark' | 'character';
    prompt: string;
};

const slugify = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

/**
 * Parses the catalog markdown.
 *
 * Two shapes appear in the file:
 *   Leaders     `### 1. Narendra Modi (PM)` then `* **Pose 3 (Yogic Meditation):**`
 *   Everything else                          `* **5. Red Fort (Lal Qila):**`
 * In both cases the prompt is the following `  > ...` line.
 */
export const parseCatalog = (markdown: string): CastEntry[] => {
    const lines = markdown.split('\n');
    const entries: CastEntry[] = [];

    let category: CastEntry['category'] = 'character';
    let currentSubject: string | null = null;
    let pendingLabel: string | null = null;

    for (const line of lines) {
        const section = line.match(/^##\s+(.*)$/);
        if (section && !line.startsWith('###')) {
            const title = section[1].toLowerCase();
            if (title.includes('political leaders')) category = 'leader';
            else if (title.includes('landmark')) category = 'landmark';
            else if (title.includes('figures') || title.includes('stock')) category = 'character';
            currentSubject = null;
            continue;
        }

        // `### 1. Narendra Modi (PM)` — a leader with multiple poses below it.
        const subject = line.match(/^###\s+\d+\.\s+(.+?)\s*$/);
        if (subject) {
            currentSubject = subject[1].replace(/\s*\(PM\)\s*$/i, '').trim();
            continue;
        }

        // `* **Pose 3 (Yogic Meditation):**` or `* **5. Red Fort (Lal Qila):**`
        const bullet = line.match(/^\*\s+\*\*(.+?):?\*\*\s*$/);
        if (bullet) {
            pendingLabel = bullet[1].replace(/:$/, '').trim();
            continue;
        }

        const prompt = line.match(/^\s*>\s*(.+)$/);
        if (prompt && pendingLabel) {
            const label = pendingLabel;
            pendingLabel = null;

            let subjectName: string;
            let pose: string | null;
            let slug: string;

            const poseLabel = label.match(/^Pose\s+\d+\s*\((.+)\)$/i);
            if (poseLabel && currentSubject) {
                subjectName = currentSubject;
                pose = poseLabel[1].trim();
                slug = `${slugify(subjectName)}-${slugify(pose)}`;
            } else {
                // `5. Red Fort (Lal Qila)` -> subject "Red Fort".
                const numbered = label.replace(/^\d+\.\s*/, '');
                subjectName = numbered.replace(/\s*\(.*\)\s*$/, '').trim() || numbered;
                pose = null;
                // Slug keeps the parenthetical: it is a disambiguator, not a
                // translation, for entries like "TV News Anchor (Female)" and
                // "(Male)" which would otherwise collide onto one slug.
                slug = slugify(numbered);
            }

            entries.push({
                slug,
                subject: subjectName,
                pose,
                category,
                prompt: prompt[1].trim(),
            });
        }
    }

    return entries;
};

const supabase = (() => {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_KEY || '';
    return url && key ? createClient(url, key) : null;
})();

/** Slugs already generated, so a re-run costs nothing for existing images. */
const fetchExisting = async (): Promise<Map<string, string>> => {
    const existing = new Map<string, string>();
    if (!supabase) return existing;

    const { data, error } = await supabase
        .from('media_assets')
        .select('slug, path, bucket')
        .contains('tags', ['caricature-cast']);

    if (error) {
        console.warn(`[cast] Could not read media_assets (${error.message}); treating cast as empty.`);
        return existing;
    }

    for (const row of (data ?? []) as { slug: string; path: string; bucket: string }[]) {
        const { data: pub } = supabase.storage.from(row.bucket).getPublicUrl(row.path);
        existing.set(row.slug, pub.publicUrl);
    }
    return existing;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const limitFlag = args.indexOf('--limit');
    const limit = limitFlag !== -1 ? Number(args[limitFlag + 1]) : Infinity;
    const onlyFlag = args.indexOf('--only');
    const only = onlyFlag !== -1 ? args[onlyFlag + 1]?.toLowerCase() : null;

    if (!fs.existsSync(CATALOG)) {
        console.error(`[cast] Catalog not found: ${CATALOG}`);
        process.exit(1);
    }

    const all = parseCatalog(fs.readFileSync(CATALOG, 'utf-8'));
    const selected = only
        ? all.filter((e) => e.subject.toLowerCase().includes(only))
        : all;

    const byCategory = selected.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + 1;
        return acc;
    }, {});
    console.log(
        `[cast] Parsed ${all.length} prompts from the catalog ` +
            `(${Object.entries(byCategory).map(([k, v]) => `${v} ${k}`).join(', ')})`,
    );

    const duplicates = selected
        .map((e) => e.slug)
        .filter((slug, i, arr) => arr.indexOf(slug) !== i);
    if (duplicates.length) {
        console.warn(`[cast] Duplicate slugs, later entries would overwrite: ${[...new Set(duplicates)].join(', ')}`);
    }

    if (dryRun) {
        for (const e of selected.slice(0, Number.isFinite(limit) ? limit : undefined)) {
            console.log(`  ${e.category.padEnd(9)} ${e.slug.padEnd(46)} ${e.prompt.slice(0, 70)}...`);
        }
        console.log(`[cast] Dry run — no API calls made. ${selected.length} entries would be considered.`);
        return;
    }

    const existing = await fetchExisting();
    console.log(`[cast] ${existing.size} entries already generated; those will be skipped.`);

    const manifest: Record<string, { url: string; subject: string; pose: string | null; category: string }> = {};
    let generated = 0;
    let failed = 0;

    for (const entry of selected) {
        const cached = existing.get(entry.slug);
        if (cached) {
            manifest[entry.slug] = {
                url: cached,
                subject: entry.subject,
                pose: entry.pose,
                category: entry.category,
            };
            continue;
        }

        if (generated >= limit) break;

        console.log(`[cast] Generating ${entry.slug} ...`);
        const result = await generateImagenAsset(
            entry.prompt,
            entry.slug,
            ['caricature-cast', entry.category, slugify(entry.subject)],
            entry.category === 'leader' ? entry.subject : undefined,
        );

        if (result) {
            manifest[entry.slug] = {
                url: result.publicUrl,
                subject: entry.subject,
                pose: entry.pose,
                category: entry.category,
            };
            generated += 1;
        } else {
            console.warn(`[cast] FAILED ${entry.slug} — continuing.`);
            failed += 1;
        }

        await sleep(DELAY_MS);
    }

    fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true });
    fs.writeFileSync(
        MANIFEST_OUT,
        JSON.stringify({ generatedFrom: 'caricature_prompts_catalog.md', cast: manifest }, null, 2),
        'utf-8',
    );

    console.log(
        `[cast] Done. ${generated} generated, ${existing.size} reused, ${failed} failed. ` +
            `Manifest: ${path.relative(REPO_ROOT, MANIFEST_OUT)} (${Object.keys(manifest).length} entries)`,
    );
};

// Only run when invoked directly, so parseCatalog stays importable for tests.
if (process.argv[1] && process.argv[1].includes('buildCaricatureCast')) {
    main().catch((err) => {
        console.error('[cast] Failed:', err);
        process.exit(1);
    });
}
