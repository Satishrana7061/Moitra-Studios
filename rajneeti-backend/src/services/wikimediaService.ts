import { createClient } from '@supabase/supabase-js';
import '../config.js'; // Ensures dotenv is loaded

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const BUCKET_NAME = 'reel-assets';

let supabase: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * Ensures the 'reel-assets' bucket exists and is public.
 */
async function ensureBucketExists() {
    if (!supabase) return;
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.name === BUCKET_NAME);
        if (!exists) {
            console.log(`[WikimediaService] Creating bucket "${BUCKET_NAME}"...`);
            await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        }
    } catch (err: any) {
        console.warn(`[WikimediaService] Failed to check/create bucket: ${err.message}`);
    }
}

/**
 * Searches Wikimedia Commons for a file title matching the topic.
 */
async function searchWikimediaFile(query: string): Promise<string | null> {
    const url = "https://commons.wikimedia.org/w/api.php?origin=*";
    const params = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: `${query} namespace:6`, // Search specifically in File/Media namespace
        srnamespace: "6",
        format: "json"
    });

    try {
        const res = await fetch(`${url}&${params.toString()}`);
        if (!res.ok) return null;
        const data: any = await res.json();
        const results = data.query?.search || [];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
        const matched = results.find((r: any) => {
            const titleLower = r.title.toLowerCase();
            return allowedExtensions.some(ext => titleLower.endsWith(ext));
        });
        if (matched) {
            return matched.title;
        }
    } catch (err: any) {
        console.error(`[WikimediaService] Error searching Wikimedia:`, err.message);
    }
    return null;
}

/**
 * Fetches file metadata, URL, and license details from Wikimedia Commons.
 */
async function fetchWikimediaFileInfo(fileTitle: string) {
    const url = "https://commons.wikimedia.org/w/api.php?origin=*";
    const params = new URLSearchParams({
        action: "query",
        format: "json",
        prop: "imageinfo",
        titles: fileTitle,
        iiprop: "url|size|mime|user|extmetadata"
    });

    try {
        const res = await fetch(`${url}&${params.toString()}`);
        if (!res.ok) return null;
        const data: any = await res.json();
        const pages = data.query?.pages || {};
        const pageId = Object.keys(pages)[0];
        if (pageId === "-1") return null;

        const info = pages[pageId]?.imageinfo?.[0];
        return info || null;
    } catch (err: any) {
        console.error(`[WikimediaService] Error fetching file info for ${fileTitle}:`, err.message);
    }
    return null;
}

/**
 * Master method: Finds an image in media_assets first.
 * If none exists, queries Wikimedia Commons, downloads it, uploads to Supabase, and logs metadata.
 */
export async function findOrImportWikimediaImage(
    topic: string,
    tags: string[],
    leader?: string,
    yearContext?: number,
    customSlug?: string
): Promise<{ path: string; publicUrl: string } | null> {
    if (!supabase) {
        console.error("[WikimediaService] Supabase is not initialized.");
        return null;
    }

    await ensureBucketExists();

    // ── STEP 1: Search local library first (Reuse-first logic) ──
    const searchTarget = customSlug ? `slug: "${customSlug}"` : `topic: "${topic}"`;
    console.log(`[WikimediaService] Searching local media_assets for ${searchTarget}...`);
    try {
        // Query database to see if we already have this asset
        let query = (supabase as any).from('media_assets').select('*');
        if (customSlug) {
            query = query.eq('slug', customSlug);
        } else {
            query = query.eq('topic', topic);
        }
        const { data: existingAssets, error: dbError } = await query.limit(1);

        if (!dbError && existingAssets && existingAssets.length > 0) {
            const asset = existingAssets[0];
            const { data: publicUrlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(asset.path);
            console.log(`[WikimediaService] Reusing existing asset: ${asset.path}`);
            return {
                path: asset.path,
                publicUrl: publicUrlData.publicUrl
            };
        }
    } catch (err: any) {
        console.warn(`[WikimediaService] DB search failed: ${err.message}. Continuing to Wikimedia search.`);
    }

    // ── STEP 2: Query Wikimedia Commons ──
    console.log(`[WikimediaService] Querying Wikimedia Commons for topic: "${topic}"...`);
    let fileTitle = await searchWikimediaFile(topic);
    
    // Fallback search with tag keywords if primary query failed
    if (!fileTitle && tags.length > 0) {
        for (const tag of tags.slice(0, 2)) {
            console.log(`[WikimediaService] Fallback search using tag: "${tag}"...`);
            fileTitle = await searchWikimediaFile(tag);
            if (fileTitle) break;
        }
    }

    if (!fileTitle) {
        console.log(`[WikimediaService] No images found on Wikimedia for query/tags.`);
        return null;
    }

    console.log(`[WikimediaService] Found file title: "${fileTitle}". Fetching URL & metadata...`);
    const fileInfo = await fetchWikimediaFileInfo(fileTitle);
    if (!fileInfo || !fileInfo.url) {
        console.log(`[WikimediaService] Could not retrieve file info/URL.`);
        return null;
    }

    // ── STEP 3: Download image from Wikimedia ──
    console.log(`[WikimediaService] Downloading image from: ${fileInfo.url}`);
    let fileBuffer: Buffer;
    try {
        const downloadRes = await fetch(fileInfo.url);
        if (!downloadRes.ok) throw new Error(`HTTP status ${downloadRes.status}`);
        fileBuffer = Buffer.from(await downloadRes.arrayBuffer());
    } catch (err: any) {
        console.error(`[WikimediaService] Image download failed: ${err.message}`);
        return null;
    }

    // ── STEP 4: Upload to Supabase Storage ──
    const fileExt = fileInfo.url.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanTitle = fileTitle.replace(/^File:/i, '');
    const slug = customSlug || cleanTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    let filePath = '';
    if (leader) {
        filePath = `leaders/${leader.toLowerCase()}/${slug}.${fileExt}`;
    } else {
        const safeTopic = topic.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        filePath = `themes/${safeTopic}/${slug}.${fileExt}`;
    }

    console.log(`[WikimediaService] Uploading image to Supabase Storage path: "${filePath}"...`);
    try {
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, fileBuffer, {
                contentType: fileInfo.mime || `image/${fileExt}`,
                upsert: true
            });

        if (uploadError) {
            console.error(`[WikimediaService] Storage upload failed:`, uploadError.message);
            return null;
        }
    } catch (err: any) {
        console.error(`[WikimediaService] Storage upload encountered error:`, err.message);
        return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    // ── STEP 5: Insert record in database ──
    console.log(`[WikimediaService] Saving asset metadata to media_assets table...`);
    const ext = fileInfo.extmetadata || {};
    const artist = ext.Artist?.value || fileInfo.user || 'Unknown';
    const license = ext.LicenseShortName?.value || 'CC-BY-SA';
    const attribution = ext.Attribution?.value || `${artist} / Wikimedia Commons / ${license}`;

    try {
        const { error: insertError } = await (supabase as any)
            .from('media_assets')
            .insert({
                slug: slug,
                title: cleanTitle,
                topic: topic,
                subtopic: tags[0] || null,
                bucket: BUCKET_NAME,
                path: filePath,
                source_type: 'wikimedia',
                source_page_url: fileInfo.descriptionurl || null,
                source_file_url: fileInfo.url,
                license: license,
                artist: artist,
                attribution_text: attribution,
                width: fileInfo.width || null,
                height: fileInfo.height || null,
                mime_type: fileInfo.mime || `image/${fileExt}`,
                tags: tags,
                year_context: yearContext || null,
                leader: leader || null
            });

        if (insertError) {
            console.warn(`[WikimediaService] DB insertion error (non-fatal for reel): ${insertError.message}`);
        }
    } catch (err: any) {
        console.warn(`[WikimediaService] DB insertion encountered error: ${err.message}`);
    }

    return {
        path: filePath,
        publicUrl: publicUrlData.publicUrl
    };
}

/**
 * Generates a custom image using Google GenAI Imagen 3 API and uploads it to Supabase Storage.
 */
export async function generateImagenAsset(
    prompt: string,
    slugSeed: string,
    tags: string[] = [],
    leader?: string,
    yearContext?: number
): Promise<{ path: string; publicUrl: string } | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        console.warn('[WikimediaService] GEMINI_API_KEY not configured. Skipping Imagen 3 generation.');
        return null;
    }

    if (!supabase) {
        console.error('[WikimediaService] Supabase not initialized.');
        return null;
    }

    await ensureBucketExists();

    console.log(`[WikimediaService] Generating image using Gemini Imagen 4 for prompt: "${prompt}"`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                instances: [
                    {
                        prompt: prompt
                    }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: '9:16',
                    outputMimeType: 'image/jpeg'
                }
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            console.warn(`[WikimediaService] Imagen API call failed with status ${res.status}: ${errText}`);
            return null;
        }

        const data: any = await res.json();
        const prediction = data.predictions?.[0];
        const base64Str = prediction?.bytesBase64Encoded || prediction?.structValue?.fields?.bytesBase64Encoded?.stringValue;

        if (!base64Str) {
            console.warn('[WikimediaService] Imagen response did not contain image bytes.');
            return null;
        }

        const fileBuffer = Buffer.from(base64Str, 'base64');
        const cleanSlug = slugSeed.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const filePath = `generated/${cleanSlug}_${Date.now()}.jpg`;

        console.log(`[WikimediaService] Uploading generated image to Supabase Storage path: "${filePath}"...`);
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, fileBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (uploadError) {
            console.error(`[WikimediaService] Generated image storage upload failed:`, uploadError.message);
            return null;
        }

        const { data: publicUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        console.log(`[WikimediaService] Saving generated image metadata to media_assets...`);
        try {
            await (supabase as any)
                .from('media_assets')
                .insert({
                    slug: cleanSlug,
                    title: prompt.slice(0, 80),
                    topic: prompt,
                    subtopic: tags[0] || null,
                    bucket: BUCKET_NAME,
                    path: filePath,
                    source_type: 'imagen3',
                    attribution_text: 'Generated by Gemini Imagen 3',
                    width: 1080,
                    height: 1920,
                    mime_type: 'image/jpeg',
                    tags: [...tags, 'generated', 'imagen3'],
                    year_context: yearContext || null,
                    leader: leader || null
                });
        } catch (dbErr: any) {
            console.warn(`[WikimediaService] DB insertion error (non-fatal): ${dbErr.message}`);
        }

        return {
            path: filePath,
            publicUrl: publicUrlData.publicUrl
        };

    } catch (err: any) {
        console.error('[WikimediaService] Imagen generation error:', err.message);
        return null;
    }
}

