/**
 * ffmpeg Video Generator v2 — ASS Subtitle Engine
 * 
 * COMPLETE REWRITE: Replaces drawtext-based rendering with professional
 * ASS (Advanced SubStation Alpha) subtitle rendering + animated backgrounds.
 * 
 * Key improvements over v1:
 *   - Text with thick borders, drop shadows, and glow/blur effects
 *   - Smooth fade-in/out and zoom-settle animations on text
 *   - Animated dark gradient background with noise particles + vignette
 *   - Professional speaker badges and branding via ASS styling
 *   - Much simpler ffmpeg filter chain (ASS replaces 15+ drawtext calls)
 * 
 * Two modes (same API as v1):
 *   1. Kinetic Typography (PM Promises) - slide text with zoom/fade animations
 *   2. Subtitle-Style Captions (PM Interview) - phrase-by-phrase synced captions
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ────────────────────────────────────────────────────────────────
// Font Configuration
// ────────────────────────────────────────────────────────────────

// Internal font family names (must match the .ttf file's embedded name)
const HINDI_FONT_NAME = 'Noto Sans Devanagari';
const ENGLISH_FONT_NAME = 'Outfit';

// ────────────────────────────────────────────────────────────────
// Font Resolution — finds bundled fonts, then falls back to system
// ────────────────────────────────────────────────────────────────

function findFont(name: string): string {
    const candidates = [
        path.resolve(__dirname, '..', '..', 'assets', 'fonts', name),
        path.join(process.cwd(), 'assets', 'fonts', name),
        `/usr/share/fonts/truetype/noto/${name}`,
        `/usr/share/fonts/noto/${name}`,
        ...findSystemFontPartial(name),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            console.log(`[ffmpeg] Found font "${name}" at: ${p}`);
            return p;
        }
    }
    console.warn(`[ffmpeg] Font "${name}" not found. Looked in: ${candidates.slice(0, 4).join(', ')}`);
    return name;
}

function findSystemFontPartial(name: string): string[] {
    const dirs = ['/usr/share/fonts/truetype', '/usr/share/fonts', '/usr/local/share/fonts'];
    const results: string[] = [];
    const baseName = name.replace(/\.ttf$/i, '').toLowerCase();
    for (const dir of dirs) {
        try {
            if (!fs.existsSync(dir)) continue;
            const findOutput = execSync(
                `find "${dir}" -iname "*${baseName.replace(/[^a-z0-9]/gi, '*')}*" -type f 2>/dev/null | head -5`,
                { timeout: 3000, encoding: 'utf-8' }
            ).trim();
            if (findOutput) results.push(...findOutput.split('\n').filter(Boolean));
        } catch { /* ignore */ }
    }
    return results;
}

let HINDI_FONT = '';
let ENGLISH_FONT = '';
let FONTS_DIR = '';

function initFonts() {
    if (!HINDI_FONT) {
        HINDI_FONT = findFont('NotoSansDevanagari.ttf');
    }
    if (!ENGLISH_FONT) {
        ENGLISH_FONT = findFont('Outfit.ttf');
        if (!fs.existsSync(ENGLISH_FONT)) {
            ENGLISH_FONT = HINDI_FONT;
        }
    }
    // Resolve the fonts directory for ASS rendering
    if (!FONTS_DIR) {
        FONTS_DIR = path.dirname(HINDI_FONT);
        if (!fs.existsSync(FONTS_DIR)) {
            FONTS_DIR = path.join(process.cwd(), 'assets', 'fonts');
        }
        console.log(`[ffmpeg] Fonts directory for ASS: ${FONTS_DIR}`);
    }
}

// ────────────────────────────────────────────────────────────────
// ASS Subtitle Utilities
// ────────────────────────────────────────────────────────────────

/** Convert seconds to ASS time format: H:MM:SS.cc (centiseconds) */
function toASSTime(seconds: number): string {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.min(99, Math.round((seconds % 1) * 100));
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** Escape text for ASS dialogue lines */
function escapeASSText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '')
        .replace(/}/g, '')
        .replace(/&/g, '\\&');
}

/** Wrap text with ASS hard line breaks (\\N) for centered display */
function wrapASSText(text: string, maxCharsPerLine: number = 20): string {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length > maxCharsPerLine && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);

    return lines.join('\\N');
}

/**
 * Escape a file path for use inside ffmpeg filter parameters.
 * Converts backslashes to forward slashes and escapes colons.
 */
function escapeFilterPath(filePath: string): string {
    let escaped = filePath.replace(/\\/g, '/');
    escaped = escaped.replace(/:/g, '\\:');
    return escaped;
}

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface KineticSlide {
    text: string;
    type: 'headline' | 'fact' | 'verdict';
}

export interface KineticBranding {
    reelNumber: number;
    year: string;
    title: string;
}

export interface WordTiming {
    word: string;
    start: number;
    end: number;
}

export interface SubtitleSegment {
    speaker: 'reporter' | 'modi' | 'context';
    words: WordTiming[];
    text: string;
    startTime: number;
    endTime: number;
}

// ────────────────────────────────────────────────────────────────
// ASS File Builder — PM PROMISES (Kinetic Typography)
// ────────────────────────────────────────────────────────────────

function buildKineticASS(
    slides: KineticSlide[],
    branding: KineticBranding,
    duration: number
): string {
    const slideCount = slides.length || 3;
    const slideDur = duration / slideCount;

    const hf = HINDI_FONT_NAME;
    const ef = ENGLISH_FONT_NAME;

    // ── Script header ──
    let ass = '';
    ass += '\uFEFF'; // UTF-8 BOM for Hindi text safety
    ass += `[Script Info]\n`;
    ass += `Title: Modi Ki Guarantee - Promise #${branding.reelNumber}\n`;
    ass += `ScriptType: v4.00+\n`;
    ass += `WrapStyle: 0\n`;
    ass += `PlayResX: 1080\n`;
    ass += `PlayResY: 1920\n`;
    ass += `ScaledBorderAndShadow: yes\n`;
    ass += `\n`;

    // ── Styles ──
    // Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,
    //         Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle,
    //         BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
    ass += `[V4+ Styles]\n`;
    ass += `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`;

    // Main headline text — large white with thick black border + shadow + glow
    ass += `Style: Headline,${hf},68,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,4,2,5,80,80,0,1\n`;

    // Verdict text — saffron/orange with thick border
    ass += `Style: Verdict,${hf},74,&H0000B8FF,&H0000B8FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,4,2,5,80,80,0,1\n`;

    // Slide label — small text above main content
    ass += `Style: Label,${ef},32,&H80FFFFFF,&H80FFFFFF,&H50000000,&H00000000,1,0,0,0,100,100,2,0,1,2,0,8,0,0,0,1\n`;

    // MODI KI GUARANTEE header — saffron with border
    ass += `Style: Header,${ef},52,&H0000B8FF,&H0000B8FF,&H50000000,&H40000000,1,0,0,0,100,100,2,0,1,3,1,7,70,0,0,1\n`;

    // Sub-header — dimmer white
    ass += `Style: SubHeader,${ef},28,&H60FFFFFF,&H60FFFFFF,&H40000000,&H00000000,0,0,0,0,100,100,1,0,1,1,0,7,70,0,0,1\n`;

    // LIVE badge — white on red (BorderStyle=3 = opaque background box)
    ass += `Style: Live,${ef},34,&H00FFFFFF,&H00FFFFFF,&H000000FF,&H000000FF,1,0,0,0,100,100,0,0,3,0,0,7,0,0,0,1\n`;

    // Footer branding
    ass += `Style: Footer,${ef},26,&H60FFFFFF,&H60FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,1,0,0,0,1\n`;

    // Footer sub-line
    ass += `Style: FooterSub,${hf},22,&H50FFFFFF,&H50FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,1,0,0,0,1\n`;

    ass += `\n`;

    // ── Events (dialogue lines) ──
    ass += `[Events]\n`;
    ass += `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

    const t0 = toASSTime(0);
    const tEnd = toASSTime(duration);

    // ─ Persistent elements ─

    // LIVE badge (top-left)
    ass += `Dialogue: 10,${t0},${tEnd},Live,,60,0,95,,{\\an7\\bord10\\shad0\\3c&H0000FF&\\4c&H0000FF&\\blur0.5}  LIVE  \n`;

    // Header: MODI KI GUARANTEE
    ass += `Dialogue: 10,${t0},${tEnd},Header,,70,0,195,,{\\an7\\blur1}MODI KI GUARANTEE\n`;

    // Sub-header: PROMISE #X | YEAR MANIFESTO
    const subHeader = `PROMISE #${branding.reelNumber} | ${branding.year} MANIFESTO`;
    ass += `Dialogue: 10,${t0},${tEnd},SubHeader,,70,0,270,,{\\an7}${subHeader}\n`;

    // Footer
    ass += `Dialogue: 10,${t0},${tEnd},Footer,,70,0,60,,{\\an1}MOITRA STUDIOS | Rajneeti\n`;
    const footerTitle = branding.title.length > 45 ? branding.title.slice(0, 45) + '...' : branding.title;
    ass += `Dialogue: 10,${t0},${tEnd},FooterSub,,70,0,30,,{\\an1}${escapeASSText(footerTitle)}\n`;

    // ─ Slide content ─
    for (let i = 0; i < slides.length; i++) {
        const start = i * slideDur;
        const end = (i + 1) * slideDur;
        const isVerdict = slides[i].type === 'verdict';
        const isLast = i === slides.length - 1;

        // Slide type label
        const labelText = slides[i].type === 'headline' ? 'THE PROMISE' :
                          slides[i].type === 'verdict' ? 'VERDICT' : 'ANALYSIS';
        const labelColor = isVerdict ? '\\1c&H0000B8FF&' : '';
        const labelFade = isLast ? '\\fad(400,0)' : '\\fad(400,400)';

        ass += `Dialogue: 5,${toASSTime(start)},${toASSTime(end)},Label,,0,0,420,,{\\an8${labelColor}${labelFade}\\blur0.5}${labelText}\n`;

        // Main slide text
        const wrapped = wrapASSText(escapeASSText(slides[i].text), 18);
        const style = isVerdict ? 'Verdict' : 'Headline';

        // Animation: zoom-settle (start 108% → settle to 100%) + fade
        const zoom = '\\fscx108\\fscy108\\t(0,600,\\fscx100\\fscy100)';
        const fade = isLast ? '\\fad(500,0)' : '\\fad(500,400)';

        ass += `Dialogue: 5,${toASSTime(start)},${toASSTime(end)},${style},,0,0,0,,{${zoom}${fade}\\blur1.2}${wrapped}\n`;
    }

    return ass;
}

// ────────────────────────────────────────────────────────────────
// ASS File Builder — PM INTERVIEW (Subtitle-Style Captions)
// ────────────────────────────────────────────────────────────────

function buildSubtitleASS(
    reporterPhrases: SubtitleSegment[],
    modiPhrases: SubtitleSegment[],
    metadata: { title: string; reporterName: string; newsContext: string },
    reporterDuration: number,
    totalDuration: number,
    fullDuration: number
): string {
    const hf = HINDI_FONT_NAME;
    const ef = ENGLISH_FONT_NAME;

    let ass = '';
    ass += '\uFEFF'; // UTF-8 BOM
    ass += `[Script Info]\n`;
    ass += `Title: PM Open Press Conference - ${metadata.title}\n`;
    ass += `ScriptType: v4.00+\n`;
    ass += `WrapStyle: 0\n`;
    ass += `PlayResX: 1080\n`;
    ass += `PlayResY: 1920\n`;
    ass += `ScaledBorderAndShadow: yes\n`;
    ass += `\n`;

    ass += `[V4+ Styles]\n`;
    ass += `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`;

    // Reporter phrase text — white with thick border and glow
    ass += `Style: Reporter,${hf},60,&H00FFFFFF,&H80FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3.5,1.5,5,80,80,0,1\n`;

    // Modi phrase text — white with saffron tint border
    ass += `Style: Modi,${hf},60,&H00FFFFFF,&H80FFFFFF,&H00102040,&H80000000,1,0,0,0,100,100,0,0,1,3.5,1.5,5,80,80,0,1\n`;

    // Context/verdict text — green
    ass += `Style: Context,${hf},52,&H0081B910,&H0081B910,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3.5,1.5,5,80,80,0,1\n`;

    // PM OPEN PRESS CONFERENCE header
    ass += `Style: Header,${ef},42,&H0000B8FF,&H0000B8FF,&H50000000,&H40000000,1,0,0,0,100,100,2,0,1,2.5,1,7,60,0,0,1\n`;

    // Topic title
    ass += `Style: Topic,${ef},28,&H60FFFFFF,&H60FFFFFF,&H40000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,7,60,0,0,1\n`;

    // LIVE badge
    ass += `Style: Live,${ef},34,&H00FFFFFF,&H00FFFFFF,&H000000FF,&H000000FF,1,0,0,0,100,100,0,0,3,0,0,7,0,0,0,1\n`;

    // Network branding (top-right)
    ass += `Style: Network,${ef},26,&H50FFFFFF,&H50FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,9,0,60,0,1\n`;

    // Speaker badge — Reporter (blue, opaque box)
    ass += `Style: BadgeReporter,${ef},30,&H00F6823B,&H00F6823B,&H00F6823B,&H20F6823B,1,0,0,0,100,100,0,0,3,0,0,8,0,0,0,1\n`;

    // Speaker badge — Modi (saffron, opaque box)
    ass += `Style: BadgeModi,${ef},30,&H0000B8FF,&H0000B8FF,&H0000B8FF,&H200000B8,1,0,0,0,100,100,0,0,3,0,0,8,0,0,0,1\n`;

    // Speaker badge — Fact Check (green, opaque box)
    ass += `Style: BadgeContext,${ef},30,&H0081B910,&H0081B910,&H0081B910,&H2000B981,1,0,0,0,100,100,0,0,3,0,0,8,0,0,0,1\n`;

    // Footer
    ass += `Style: Footer,${ef},24,&H6000B8FF,&H6000B8FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,1,0,0,0,1\n`;
    ass += `Style: FooterSub,${ef},20,&H50FFFFFF,&H50FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,1,0,0,0,1\n`;

    ass += `\n`;

    ass += `[Events]\n`;
    ass += `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

    const t0 = toASSTime(0);
    const tEnd = toASSTime(fullDuration);

    // ─ Persistent elements ─

    // LIVE badge
    ass += `Dialogue: 10,${t0},${tEnd},Live,,60,0,75,,{\\an7\\bord10\\shad0\\3c&H0000FF&\\4c&H0000FF&\\blur0.5}  LIVE  \n`;

    // Network branding (top-right)
    ass += `Dialogue: 10,${t0},${tEnd},Network,,0,60,85,,{\\an9}RAJNEETI TV NETWORK\n`;

    // Header
    ass += `Dialogue: 10,${t0},${tEnd},Header,,60,0,165,,{\\an7\\blur0.8}PM OPEN PRESS CONFERENCE\n`;

    // Topic title
    const topicTitle = metadata.title.length > 40 ? metadata.title.slice(0, 40) + '...' : metadata.title;
    ass += `Dialogue: 10,${t0},${tEnd},Topic,,60,0,235,,{\\an7}${escapeASSText(topicTitle)}\n`;

    // ─ Speaker badges (timed) ─
    ass += `Dialogue: 10,${t0},${toASSTime(reporterDuration)},BadgeReporter,,0,0,375,,{\\an8\\bord12\\shad0\\blur0.5}  REPORTER ${metadata.reporterName.toUpperCase()}  \n`;
    ass += `Dialogue: 10,${toASSTime(reporterDuration)},${toASSTime(totalDuration)},BadgeModi,,0,0,375,,{\\an8\\bord12\\shad0\\blur0.5}  PM NARENDRA MODI  \n`;
    ass += `Dialogue: 10,${toASSTime(totalDuration)},${tEnd},BadgeContext,,0,0,375,,{\\an8\\bord12\\shad0\\blur0.5}  FACT CHECK VERDICT  \n`;

    // ─ Reporter phrases ─
    const allReporter = reporterPhrases;
    for (let i = 0; i < allReporter.length; i++) {
        const phrase = allReporter[i];
        const nextStart = i < allReporter.length - 1 ? allReporter[i + 1].startTime : reporterDuration;
        const displayEnd = Math.min(nextStart, phrase.endTime + 0.5);

        const wrapped = wrapASSText(escapeASSText(phrase.text), 18);
        ass += `Dialogue: 5,${toASSTime(phrase.startTime)},${toASSTime(displayEnd)},Reporter,,0,0,0,,{\\fad(250,100)\\blur1\\fscx104\\fscy104\\t(0,300,\\fscx100\\fscy100)}${wrapped}\n`;
    }

    // ─ Modi phrases ─
    for (let i = 0; i < modiPhrases.length; i++) {
        const phrase = modiPhrases[i];
        const nextStart = i < modiPhrases.length - 1 ? modiPhrases[i + 1].startTime : totalDuration;
        const displayEnd = Math.min(nextStart, phrase.endTime + 0.5);

        const wrapped = wrapASSText(escapeASSText(phrase.text), 18);
        ass += `Dialogue: 5,${toASSTime(phrase.startTime)},${toASSTime(displayEnd)},Modi,,0,0,0,,{\\fad(250,100)\\blur1\\fscx104\\fscy104\\t(0,300,\\fscx100\\fscy100)}${wrapped}\n`;
    }

    // ─ Context/verdict slide ─
    const wrappedContext = wrapASSText(escapeASSText(metadata.newsContext), 20);
    ass += `Dialogue: 5,${toASSTime(totalDuration)},${tEnd},Context,,0,0,0,,{\\fad(400,0)\\blur1.2\\fscx106\\fscy106\\t(0,500,\\fscx100\\fscy100)}${wrappedContext}\n`;

    // ─ Footer ─
    ass += `Dialogue: 10,${t0},${tEnd},Footer,,60,0,100,,{\\an1}PM PRESS CONFERENCE\n`;
    ass += `Dialogue: 10,${t0},${tEnd},FooterSub,,60,0,70,,{\\an1}Factual Q\\&A verified against official sources\n`;

    return ass;
}

// ────────────────────────────────────────────────────────────────
// Background Filter Chain Builder
// ────────────────────────────────────────────────────────────────

/**
 * Builds the video filter chain:
 *   1. Dark navy base color
 *   2. Subtle purple gradient overlays (top & bottom)
 *   3. Animated noise particles
 *   4. Vignette depth effect
 *   5. Separator line
 *   6. Progress bar (bg + animated fill)
 *   7. ASS subtitle rendering
 */
function buildVideoFilterChain(
    duration: number,
    assPath: string,
    fontsDir: string,
    progressBarY: number = 1780
): string {
    const af = escapeFilterPath(assPath);
    const fd = escapeFilterPath(fontsDir);

    const filters: string[] = [];

    // Subtle purple gradient at top (header area glow), starting from the [0:v] input pad
    filters.push(`[0:v]drawbox=x=0:y=0:w=iw:h=ih/3:color=0x120828@0.12:t=fill`);

    // Subtle darker band at bottom (footer area)
    filters.push(`drawbox=x=0:y=ih*2/3:w=iw:h=ih/3:color=0x060418@0.15:t=fill`);

    // Center area subtle glow (draws eye to text)
    filters.push(`drawbox=x=100:y=500:w=880:h=800:color=0x1a0a40@0.08:t=fill`);

    // Animated noise particles (alls=strength, allf=t means temporal/animated)
    filters.push(`noise=alls=6:allf=t`);

    // Vignette — darkens edges, creates depth
    filters.push(`vignette=angle=PI/5`);

    // Thin separator line below header area
    filters.push(`drawbox=x=60:y=310:w=960:h=2:color=white@0.08:t=fill`);

    // Progress bar background (semi-transparent white track)
    filters.push(`drawbox=x=60:y=${progressBarY}:w=960:h=10:color=white@0.12:t=fill`);

    // Progress bar fill (animated, grows with time)
    filters.push(`drawbox=x=60:y=${progressBarY}:w='960*t/${duration.toFixed(3)}':h=10:color=0xFF6B00:t=fill`);

    // ASS subtitle rendering (the main text engine)
    filters.push(`ass='${af}':fontsdir='${fd}'`);

    // Output video pad
    // Note: [v] is appended separately to avoid trailing comma issues

    return filters.join(',\n');
}

// ────────────────────────────────────────────────────────────────
// PM PROMISES — Kinetic Typography Reel Generator
// ────────────────────────────────────────────────────────────────

/**
 * Generates a professional kinetic typography reel for PM Promises.
 * 
 * Visual: Animated dark gradient with noise particles → ASS styled text with
 *         borders/shadows/glow → zoom-settle + fade animations → progress bar
 * Audio: ElevenLabs voiceover + optional background music
 * Output: 1080×1920 vertical MP4 at 30fps
 */
export async function generateKineticReel(
    audioBuffer: Buffer,
    slides: KineticSlide[],
    branding: KineticBranding
): Promise<Buffer> {
    initFonts();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-'));
    const outputPath = path.join(tmpDir, 'output.mp4');

    try {
        // ── Write audio to temp file ─────────────────────────────
        const audioPath = path.join(tmpDir, 'voice.mp3');
        const hasVoice = audioBuffer && audioBuffer.length > 0;
        if (hasVoice) {
            fs.writeFileSync(audioPath, audioBuffer);
        }

        // ── Get audio duration ───────────────────────────────────
        let duration = 15;
        if (hasVoice) {
            try {
                duration = parseFloat(
                    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`)
                        .toString().trim()
                ) + 0.5;
                console.log(`[ffmpeg-kinetic] Audio duration: ${duration.toFixed(2)}s`);
            } catch {
                console.warn('[ffmpeg-kinetic] ffprobe failed, using default 15s');
            }
        }

        // ── Log slide info ───────────────────────────────────────
        const slideCount = slides.length || 3;
        const slideDur = duration / slideCount;
        console.log(`[ffmpeg-kinetic] ${slideCount} slides, ${slideDur.toFixed(2)}s each, total ${duration.toFixed(2)}s`);
        for (let i = 0; i < slides.length; i++) {
            console.log(`[ffmpeg-kinetic] Slide ${i} (${slides[i].type}): "${slides[i].text.slice(0, 50)}..."`);
        }

        // ── Build ASS subtitle file ──────────────────────────────
        const assContent = buildKineticASS(slides, branding, duration);
        const assPath = path.join(tmpDir, 'subtitle.ass');
        fs.writeFileSync(assPath, assContent, 'utf-8');
        console.log(`[ffmpeg-kinetic] ASS subtitle file written to: ${assPath}`);

        // ── Check for background audio ──────────────────────────
        const bgAudioPath = path.join(process.cwd(), 'news-bg.wav');
        const hasBgAudio = fs.existsSync(bgAudioPath);
        console.log(`[ffmpeg-kinetic] Background audio: ${hasBgAudio ? 'found' : 'not found'}`);

        // ── Build filter chain ───────────────────────────────────
        const videoFilter = buildVideoFilterChain(duration, assPath, FONTS_DIR);

        // Compose the full filter_complex
        let filterComplex = videoFilter + '\n[v]';

        // Audio mixing
        if (hasVoice && hasBgAudio) {
            filterComplex += `;\n[1:a]volume=1.0[voice];[2:a]volume=0.15[bg];[voice][bg]amix=inputs=2:duration=first:dropout_transition=0[a]`;
        }

        // Write filter to temp file
        const filterPath = path.join(tmpDir, 'filter.txt');
        fs.writeFileSync(filterPath, filterComplex, 'utf-8');
        console.log(`[ffmpeg-kinetic] Filter complex written to: ${filterPath}`);

        // ── Build ffmpeg command ─────────────────────────────────
        const cmd: string[] = ['ffmpeg', '-y'];

        // Input 0: Dark background
        cmd.push('-f', 'lavfi', '-i',
            `color=c=0x060d1a:s=1080x1920:d=${duration.toFixed(3)},format=yuv420p`);

        // Input 1: Voice audio
        let voiceIdx = -1;
        if (hasVoice) {
            cmd.push('-i', audioPath);
            voiceIdx = 1;
        }

        // Input 2: Background music (looped)
        let bgIdx = -1;
        if (hasBgAudio) {
            cmd.push('-stream_loop', '-1', '-i', bgAudioPath);
            bgIdx = hasVoice ? 2 : 1;
        }

        // Filter complex
        cmd.push('-filter_complex_script', filterPath);

        // Map video
        cmd.push('-map', '[v]');

        // Map audio
        if (hasVoice && hasBgAudio) {
            cmd.push('-map', '[a]');
        } else if (hasVoice) {
            cmd.push('-map', `${voiceIdx}:a`);
        } else if (hasBgAudio) {
            cmd.push('-map', `${bgIdx}:a`);
        }

        // Encoding settings
        cmd.push(
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-r', '30'
        );

        if (hasVoice || hasBgAudio) {
            cmd.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
        }

        cmd.push('-movflags', '+faststart', outputPath);

        const fullCmd = cmd.join(' ');
        console.log(`[ffmpeg-kinetic] Executing: ${fullCmd.slice(0, 200)}...`);

        execSync(fullCmd, { stdio: 'pipe', timeout: 180000 });

        // ── Read and return output ───────────────────────────────
        const videoBuffer = fs.readFileSync(outputPath);
        console.log(`[ffmpeg-kinetic] ✅ Video generated: ${videoBuffer.length} bytes (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

        if (videoBuffer.length < 1000) {
            throw new Error(`Generated video too small (${videoBuffer.length} bytes). ffmpeg likely failed.`);
        }

        return videoBuffer;

    } catch (err: any) {
        console.error('[ffmpeg-kinetic] Video generation failed:', err.message);
        try {
            const filterContent = fs.readFileSync(path.join(tmpDir, 'filter.txt'), 'utf-8');
            console.error('[ffmpeg-kinetic] Filter complex was:\n', filterContent);
        } catch {}
        try {
            const assContent = fs.readFileSync(path.join(tmpDir, 'subtitle.ass'), 'utf-8');
            console.error('[ffmpeg-kinetic] ASS file was:\n', assContent.slice(0, 1000));
        } catch {}
        throw err;
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
}


// ────────────────────────────────────────────────────────────────
// PM INTERVIEW — Subtitle-Style Phrase-Synced Reel Generator
// ────────────────────────────────────────────────────────────────

/**
 * Groups word timings into display phrases of ~4-6 words each.
 */
function groupWordsIntoPhrases(words: WordTiming[], wordsPerPhrase: number = 5): SubtitleSegment[] {
    const phrases: SubtitleSegment[] = [];
    for (let i = 0; i < words.length; i += wordsPerPhrase) {
        const chunk = words.slice(i, i + wordsPerPhrase);
        if (chunk.length === 0) continue;
        phrases.push({
            speaker: 'reporter',
            words: chunk,
            text: chunk.map(w => w.word).join(' '),
            startTime: chunk[0].start,
            endTime: chunk[chunk.length - 1].end,
        });
    }
    return phrases;
}

/**
 * Generates a subtitle-style reel for PM Interview (Open Press Conference).
 * 
 * Visual: Animated dark background → phrase-by-phrase ASS captions with borders/glow
 *         → speaker badges → progress bar
 * Audio: Reporter question + PM Modi answer (stitched)
 * Output: 1080×1920 vertical MP4 at 30fps
 */
export async function generateSubtitleReel(
    reporterAudio: Buffer,
    modiAudio: Buffer,
    reporterWords: WordTiming[],
    modiWords: WordTiming[],
    metadata: {
        title: string;
        reporterName: string;
        newsContext: string;
    }
): Promise<Buffer> {
    initFonts();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subtitle-'));
    const outputPath = path.join(tmpDir, 'output.mp4');

    try {
        // ── Write audio files ────────────────────────────────────
        const reporterPath = path.join(tmpDir, 'reporter.mp3');
        const modiPath = path.join(tmpDir, 'modi.mp3');
        const stitchedPath = path.join(tmpDir, 'stitched.mp3');

        const hasReporterAudio = reporterAudio && reporterAudio.length > 0;
        const hasModiAudio = modiAudio && modiAudio.length > 0;

        if (hasReporterAudio) fs.writeFileSync(reporterPath, reporterAudio);
        if (hasModiAudio) fs.writeFileSync(modiPath, modiAudio);

        // ── Get individual audio durations ───────────────────────
        let reporterDuration = 5.0;
        let modiDuration = 10.0;

        if (hasReporterAudio) {
            try {
                reporterDuration = parseFloat(
                    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${reporterPath}"`)
                        .toString().trim()
                );
            } catch {}
        }
        if (hasModiAudio) {
            try {
                modiDuration = parseFloat(
                    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${modiPath}"`)
                        .toString().trim()
                );
            } catch {}
        }

        // ── Stitch audio ─────────────────────────────────────────
        if (hasReporterAudio && hasModiAudio) {
            execSync(
                `ffmpeg -y -i "${reporterPath}" -i "${modiPath}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[a]" -map "[a]" "${stitchedPath}"`,
                { stdio: 'pipe' }
            );
        } else if (hasReporterAudio) {
            fs.copyFileSync(reporterPath, stitchedPath);
        } else if (hasModiAudio) {
            fs.copyFileSync(modiPath, stitchedPath);
        } else {
            execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 15 -q:a 9 "${stitchedPath}"`, { stdio: 'pipe' });
        }

        const totalDuration = reporterDuration + modiDuration;
        const contextDuration = 4.0;
        const fullDuration = totalDuration + contextDuration;

        console.log(`[ffmpeg-subtitle] Durations: Reporter=${reporterDuration.toFixed(2)}s, Modi=${modiDuration.toFixed(2)}s, Total=${totalDuration.toFixed(2)}s`);

        // ── Group words into phrases ─────────────────────────────
        const reporterPhrases = groupWordsIntoPhrases(reporterWords, 5);
        const offsetModiWords = modiWords.map(w => ({
            ...w,
            start: w.start + reporterDuration,
            end: w.end + reporterDuration,
        }));
        const modiPhrases = groupWordsIntoPhrases(offsetModiWords, 5);

        reporterPhrases.forEach(p => p.speaker = 'reporter');
        modiPhrases.forEach(p => p.speaker = 'modi');

        console.log(`[ffmpeg-subtitle] ${reporterPhrases.length} reporter phrases + ${modiPhrases.length} Modi phrases`);

        // ── Build ASS subtitle file ──────────────────────────────
        const assContent = buildSubtitleASS(
            reporterPhrases, modiPhrases, metadata,
            reporterDuration, totalDuration, fullDuration
        );
        const assPath = path.join(tmpDir, 'subtitle.ass');
        fs.writeFileSync(assPath, assContent, 'utf-8');
        console.log(`[ffmpeg-subtitle] ASS subtitle file written to: ${assPath}`);

        // ── Check for background audio ───────────────────────────
        const bgAudioPath = path.join(process.cwd(), 'news-bg.wav');
        const hasBgAudio = fs.existsSync(bgAudioPath);

        // ── Build filter chain ───────────────────────────────────
        const videoFilter = buildVideoFilterChain(fullDuration, assPath, FONTS_DIR);

        let filterComplex = videoFilter + '\n[v]';

        // Audio mixing
        if (hasBgAudio) {
            filterComplex += `;\n[1:a]volume=1.0[voice];[2:a]volume=0.12[bg];[voice][bg]amix=inputs=2:duration=first:dropout_transition=0[a]`;
        }

        const filterPath = path.join(tmpDir, 'filter.txt');
        fs.writeFileSync(filterPath, filterComplex, 'utf-8');

        // ── Build ffmpeg command ─────────────────────────────────
        const cmd: string[] = ['ffmpeg', '-y'];

        // Input 0: Dark background
        cmd.push('-f', 'lavfi', '-i',
            `color=c=0x060d1a:s=1080x1920:d=${fullDuration.toFixed(3)},format=yuv420p`);

        // Input 1: Stitched audio
        cmd.push('-i', stitchedPath);
        const audioIdx = 1;

        // Input 2: Background music
        let bgIdx = -1;
        if (hasBgAudio) {
            cmd.push('-stream_loop', '-1', '-i', bgAudioPath);
            bgIdx = 2;
        }

        // Filter complex
        cmd.push('-filter_complex_script', filterPath);
        cmd.push('-map', '[v]');

        // Audio
        if (hasBgAudio) {
            cmd.push('-map', '[a]');
        } else {
            cmd.push('-map', `${audioIdx}:a`);
        }

        // Encoding
        cmd.push(
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-shortest',
            '-movflags', '+faststart',
            outputPath
        );

        const fullCmd = cmd.join(' ');
        console.log(`[ffmpeg-subtitle] Executing: ${fullCmd.slice(0, 200)}...`);

        execSync(fullCmd, { stdio: 'pipe', timeout: 180000 });

        // ── Return output ────────────────────────────────────────
        const videoBuffer = fs.readFileSync(outputPath);
        console.log(`[ffmpeg-subtitle] ✅ Video generated: ${videoBuffer.length} bytes (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

        if (videoBuffer.length < 1000) {
            throw new Error(`Generated video too small (${videoBuffer.length} bytes). ffmpeg likely failed.`);
        }

        return videoBuffer;

    } catch (err: any) {
        console.error('[ffmpeg-subtitle] Video generation failed:', err.message);
        try {
            const filterContent = fs.readFileSync(path.join(tmpDir, 'filter.txt'), 'utf-8');
            console.error('[ffmpeg-subtitle] Filter complex was:\n', filterContent);
        } catch {}
        try {
            const assContent = fs.readFileSync(path.join(tmpDir, 'subtitle.ass'), 'utf-8');
            console.error('[ffmpeg-subtitle] ASS file was:\n', assContent.slice(0, 1000));
        } catch {}
        throw err;
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
}


// ────────────────────────────────────────────────────────────────
// Utility: Estimate word timings from text + audio duration
// ────────────────────────────────────────────────────────────────

/**
 * Generates estimated word timings when ElevenLabs timestamps are unavailable.
 * Distributes words evenly across the audio duration.
 */
export function estimateWordTimings(text: string, audioDuration: number): WordTiming[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const wordDuration = audioDuration / words.length;
    return words.map((word, i) => ({
        word,
        start: i * wordDuration,
        end: (i + 1) * wordDuration,
    }));
}
