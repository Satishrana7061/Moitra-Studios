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
    turns: DialogueTurn[],
    turnStartTimes: number[],
    metadata: { title: string; reporterName: string; newsContext: string },
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

    const titleLower = (metadata?.title || '').toLowerCase();
    
    // Dynamic caption theme colors based on reel title
    let modiPrimary = '&H00FFFFFF';       // White text
    let modiOutline = '&H00102040';       // Dark navy outline
    let badgeReporterBg = '&H00F6823B';  // Blue box
    let badgeModiBg = '&H0000B8FF';      // Saffron box
    let contextPrimary = '&H0081B910';   // Green text
    let contextBadgeBg = '&H0081B910';   // Green box
    
    if (titleLower.includes('neet') || titleLower.includes('exam')) {
        // NEET Exam Theme: Red Accent for emergency/breakdown
        modiPrimary = '&H00FFFFFF';      // White text
        modiOutline = '&H000000C8';      // Dark Red outline
        badgeModiBg = '&H000000FF';      // Red badge
        contextPrimary = '&H000000FF';   // Red text
        contextBadgeBg = '&H000000FF';   // Red badge
    } else if (titleLower.includes('rupee') || titleLower.includes('century') || titleLower.includes('dollar')) {
        // Rupee Century Theme: Gold text with dark green outline
        modiPrimary = '&H0000D8FF';      // Gold text
        modiOutline = '&H00105000';      // Dark Green outline
        badgeModiBg = '&H0010B000';      // Green badge
        contextPrimary = '&H0000D8FF';   // Gold text
        contextBadgeBg = '&H0010B000';   // Green badge
    } else if (titleLower.includes('rbi') || titleLower.includes('inflation') || titleLower.includes('saving')) {
        // RBI Inflation/Savings Theme: Saffron and Gold accents
        modiPrimary = '&H00FFFFFF';      // White text
        modiOutline = '&H000060A0';      // Bronze/Gold outline
        badgeModiBg = '&H0000B8FF';      // Saffron badge
        contextPrimary = '&H0000B8FF';   // Saffron text
        contextBadgeBg = '&H0000B8FF';   // Saffron badge
    } else if (titleLower.includes('fuel') || titleLower.includes('petrol') || titleLower.includes('fitness')) {
        // Fuel Fitness Theme: Active Cyan / Lime Green
        modiPrimary = '&H00FFFF00';      // Cyan text
        modiOutline = '&H00004000';      // Forest Green outline
        badgeModiBg = '&H0000C000';      // Lime Green badge
        contextPrimary = '&H00FFFF00';   // Cyan text
        contextBadgeBg = '&H0000C000';   // Lime Green badge
    }

    // Reporter phrase text — Alignment 8 (Top Center), MarginV 330, Fontsize 108
    ass += `Style: Reporter,${hf},108,&H00FFFFFF,&H80FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,6.0,2.5,8,80,80,330,1\n`;

    // Modi phrase text — Alignment 8 (Top Center), MarginV 330, Fontsize 108 (Dynamic Theme Outline)
    ass += `Style: Modi,${hf},108,${modiPrimary},&H80FFFFFF,${modiOutline},&H80000000,1,0,0,0,100,100,0,0,1,6.0,2.5,8,80,80,330,1\n`;

    // Context/verdict text — Alignment 8 (Top Center), MarginV 450, Fontsize 56 (Dynamic Theme contextPrimary)
    ass += `Style: Context,${hf},56,${contextPrimary},${contextPrimary},&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,4,1.5,8,80,80,450,1\n`;

    // PM OPEN PRESS CONFERENCE header (enlarged)
    ass += `Style: Header,${ef},64,&H0000B8FF,&H0000B8FF,&H50000000,&H40000000,1,0,0,0,100,100,2,0,1,2.5,1,7,60,0,0,1\n`;

    // Topic title
    ass += `Style: Topic,${ef},32,&H60FFFFFF,&H60FFFFFF,&H40000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,7,60,0,0,1\n`;

    // LIVE badge
    ass += `Style: Live,${ef},40,&H00FFFFFF,&H00FFFFFF,&H000000FF,&H000000FF,1,0,0,0,100,100,0,0,3,0,0,7,0,0,0,1\n`;

    // Network branding (top-right) - highlighted saffron bold (enlarged)
    ass += `Style: Network,${ef},48,&H0000B8FF,&H0000B8FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,2.0,0.0,9,0,60,0,1\n`;

    // Speaker badge — Reporter (blue, opaque box, white text, bottom center)
    ass += `Style: BadgeReporter,${ef},28,&H00FFFFFF,&H00FFFFFF,${badgeReporterBg},${badgeReporterBg},1,0,0,0,100,100,0,0,3,6,0,2,0,0,180,1\n`;

    // Speaker badge — Modi (saffron, opaque box, white text, bottom center)
    ass += `Style: BadgeModi,${ef},28,&H00FFFFFF,&H00FFFFFF,${badgeModiBg},${badgeModiBg},1,0,0,0,100,100,0,0,3,6,0,2,0,0,180,1\n`;

    // Speaker badge — Fact Check (green, opaque box, white text, bottom center)
    ass += `Style: BadgeContext,${ef},28,&H00FFFFFF,&H00FFFFFF,${contextBadgeBg},${contextBadgeBg},1,0,0,0,100,100,0,0,3,6,0,2,0,0,180,1\n`;

    // Footer (Opaque Orange, Bold, Size 56, positioned at MarginV 100)
    ass += `Style: Footer,${ef},56,&H0000B8FF,&H0000B8FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,1.5,0.0,1,0,0,100,1\n`;
    // FooterSub (Opaque White, Size 38, positioned at MarginV 50)
    ass += `Style: FooterSub,${ef},38,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1.0,0.0,1,0,0,50,1\n`;

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
    ass += `Dialogue: 10,${t0},${tEnd},Topic,,60,0,240,,{\\an7}${escapeASSText(topicTitle)}\n`;

    // ─ Speaker badges (timed per turn) ─
    for (let i = 0; i < turns.length; i++) {
        const turn = turns[i];
        const start = turnStartTimes[i];
        const end = turnStartTimes[i + 1] || totalDuration;
        
        if (turn.speaker === 'reporter') {
            ass += `Dialogue: 10,${toASSTime(start)},${toASSTime(end)},BadgeReporter,,0,0,0,,{\\blur0.3}REPORTER ${metadata.reporterName.toUpperCase()}\n`;
        } else {
            ass += `Dialogue: 10,${toASSTime(start)},${toASSTime(end)},BadgeModi,,0,0,0,,{\\blur0.3}PM NARENDRA MODI\n`;
        }
    }
    ass += `Dialogue: 10,${toASSTime(totalDuration)},${tEnd},BadgeContext,,0,0,0,,{\\blur0.3}FACT CHECK VERDICT\n`;

    // ─ Dialogue Text Phrases (timed per turn) ─
    for (let i = 0; i < turns.length; i++) {
        const turn = turns[i];
        const startOffset = turnStartTimes[i];
        const turnEnd = turnStartTimes[i + 1] || totalDuration;
        
        // Offset word timings for this turn
        const offsetWords = turn.wordTimings.map(w => ({
            ...w,
            start: w.start + startOffset,
            end: w.end + startOffset,
        }));
        
        const phrases = groupWordsIntoPhrases(offsetWords, 5); // Display more words at a time (5 words)
        const style = turn.speaker === 'reporter' ? 'Reporter' : 'Modi';
        
        for (let j = 0; j < phrases.length; j++) {
            const phrase = phrases[j];
            const nextStart = j < phrases.length - 1 ? phrases[j + 1].startTime : turnEnd;
            const displayEnd = Math.min(nextStart, phrase.endTime + 0.5);
            
            const wrapped = wrapASSText(escapeASSText(phrase.text), 30); // Wrap at 30 characters max to fit the larger font perfectly
            ass += `Dialogue: 5,${toASSTime(phrase.startTime)},${toASSTime(displayEnd)},${style},,0,0,0,,{\\fad(200,100)\\blur1.2\\fscx102\\fscy102\\t(0,250,\\fscx100\\fscy100)}${wrapped}\n`;
        }
    }

    // ─ Context/verdict slide ─
    const wrappedContext = wrapASSText(escapeASSText(metadata.newsContext), 30);
    ass += `Dialogue: 5,${toASSTime(totalDuration)},${tEnd},Context,,0,0,0,,{\\fad(300,0)\\blur1.2\\fscx104\\fscy104\\t(0,400,\\fscx100\\fscy100)}${wrappedContext}\n`;

    // ─ Footer ─
    ass += `Dialogue: 10,${t0},${tEnd},Footer,,60,0,100,,{\\an1}PM PRESS CONFERENCE\n`;
    ass += `Dialogue: 10,${t0},${tEnd},FooterSub,,60,0,50,,{\\an1}AI Generated Satirical Press Conference. For entertainment only.\n`;

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
    inputPad: string = '[0:v]',
    progressBarY: number = 1780,
    drawCenterGlow: boolean = false,
    drawGradientsAndVignette: boolean = true
): string {
    const af = escapeFilterPath(assPath);
    const fd = escapeFilterPath(fontsDir);

    const filters: string[] = [];
    let currentInput = inputPad;

    // Subtle purple gradient at top (header area glow), starting from the input pad
    if (drawGradientsAndVignette) {
        filters.push(`${currentInput}drawbox=x=0:y=0:w=iw:h=ih/3:color=0x120828@0.12:t=fill`);
        currentInput = '';
        // Subtle darker band at bottom (footer area)
        filters.push(`drawbox=x=0:y=ih*2/3:w=iw:h=ih/3:color=0x060418@0.15:t=fill`);
    }

    // Center area subtle glow (draws eye to text)
    if (drawCenterGlow) {
        const prefix = currentInput;
        currentInput = '';
        filters.push(`${prefix}drawbox=x=100:y=500:w=880:h=800:color=0x1a0a40@0.08:t=fill`);
    }

    // Animated noise particles + vignette
    if (drawGradientsAndVignette) {
        const prefix = currentInput;
        currentInput = '';
        filters.push(`${prefix}noise=alls=6:allf=t`);
        filters.push(`vignette=angle=PI/5`);
    }

    // Thin separator line below header area
    const separatorPrefix = currentInput;
    currentInput = '';
    filters.push(`${separatorPrefix}drawbox=x=60:y=310:w=960:h=2:color=white@0.08:t=fill`);

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
        const videoFilter = buildVideoFilterChain(duration, assPath, FONTS_DIR, '[0:v]', 1720, true);

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
export interface DialogueTurn {
    speaker: 'reporter' | 'modi';
    text: string;
    audioBuffer: Buffer;
    wordTimings: WordTiming[];
    duration?: number;
    filePath?: string;
}

/**
 * Generates a subtitle-style reel for PM Interview (Open Press Conference) using cartoon characters.
 */
export async function generateSubtitleReel(
    turnsOrReporterAudio: DialogueTurn[] | Buffer,
    metadataOrModiAudio?: any,
    reporterWords?: WordTiming[],
    modiWords?: WordTiming[],
    metadataLegacy?: {
        title: string;
        reporterName: string;
        newsContext: string;
    }
): Promise<Buffer> {
    initFonts();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subtitle-'));
    const outputPath = path.join(tmpDir, 'output.mp4');

    try {
        let turns: DialogueTurn[] = [];
        let metadata: { title: string; reporterName: string; newsContext: string };

        if (Array.isArray(turnsOrReporterAudio)) {
            turns = turnsOrReporterAudio;
            metadata = metadataOrModiAudio;
        } else {
            // Reconstruct legacy turns for backward compatibility
            turns = [
                { speaker: 'reporter', text: metadataLegacy?.title || 'Question', audioBuffer: turnsOrReporterAudio, wordTimings: reporterWords || [] },
                { speaker: 'modi', text: metadataLegacy?.title || 'Answer', audioBuffer: metadataOrModiAudio, wordTimings: modiWords || [] }
            ];
            metadata = metadataLegacy!;
        }

        console.log(`[ffmpeg-subtitle] Starting video generation with ${turns.length} turns.`);

        // Dynamic meme audio resolution based on title
        const titleLower = (metadata?.title || '').toLowerCase();
        let selectedMemeFile = '';
        if (titleLower.includes('neet') || titleLower.includes('exam')) {
            selectedMemeFile = 'Modi_hypocracy.wav';
        } else if (titleLower.includes('rupee') || titleLower.includes('century') || titleLower.includes('dollar')) {
            selectedMemeFile = 'Modiji_Wah.wav';
        } else if (titleLower.includes('rbi') || titleLower.includes('inflation') || titleLower.includes('saving')) {
            selectedMemeFile = 'Hum_Bole_to_Bole_Kya.wav';
        } else if (titleLower.includes('fuel') || titleLower.includes('petrol') || titleLower.includes('fitness')) {
            selectedMemeFile = 'Modi_wah_kya_scene_hai.wav';
        }

        if (selectedMemeFile) {
            const memePath = path.join(process.cwd(), 'Meme Audio', selectedMemeFile);
            if (fs.existsSync(memePath)) {
                // Find the last 'modi' turn and attach the meme sound to it
                let lastModiTurnIdx = -1;
                for (let i = turns.length - 1; i >= 0; i--) {
                    if (turns[i].speaker === 'modi') {
                        lastModiTurnIdx = i;
                        break;
                    }
                }
                if (lastModiTurnIdx !== -1) {
                    (turns[lastModiTurnIdx] as any).memeAudioPath = memePath;
                    console.log(`[ffmpeg-subtitle] Attached meme audio "${selectedMemeFile}" to turn ${lastModiTurnIdx}`);
                }
            } else {
                console.warn(`[ffmpeg-subtitle] Meme audio file not found at: ${memePath}`);
            }
        }

        // 1. Process audio files and find durations
        const turnStartTimes: number[] = [];
        const turnEndTimes: number[] = [];
        let accumulatedTime = 0.0;

        for (let i = 0; i < turns.length; i++) {
            const turn = turns[i];
            const audioPath = path.join(tmpDir, `turn_${i}.mp3`);
            
            if (turn.filePath && fs.existsSync(turn.filePath)) {
                fs.copyFileSync(turn.filePath, audioPath);
            } else {
                fs.writeFileSync(audioPath, turn.audioBuffer);
            }
            
            let duration = turn.duration || 5.0;
            if (!turn.duration) {
                try {
                    duration = parseFloat(
                        execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`)
                            .toString().trim()
                    );
                } catch {
                    console.warn(`[ffmpeg-subtitle] ffprobe failed for turn ${i}, using fallback duration.`);
                }
            }

            let finalAudioPath = audioPath;
            const memeAudioPath = (turn as any).memeAudioPath;
            if (memeAudioPath && fs.existsSync(memeAudioPath)) {
                console.log(`[ffmpeg-subtitle] Mixing meme sound for turn ${i}: ${memeAudioPath}`);
                let memeDuration = 2.0;
                try {
                    memeDuration = parseFloat(
                        execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${memeAudioPath}"`)
                            .toString().trim()
                    );
                } catch {
                    console.warn(`[ffmpeg-subtitle] ffprobe failed for meme sound: ${memeAudioPath}`);
                }

                // Concatenate turn speech and meme sound
                const combinedPath = path.join(tmpDir, `turn_${i}_combined.mp3`);
                try {
                    execSync(`ffmpeg -y -i "${audioPath}" -i "${memeAudioPath}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[a]" -map "[a]" "${combinedPath}"`, { stdio: 'ignore' });
                    finalAudioPath = combinedPath;
                    duration = duration + memeDuration;
                    console.log(`[ffmpeg-subtitle] Combined turn ${i} audio: total duration is now ${duration.toFixed(2)}s`);
                } catch (concatErr: any) {
                    console.error(`[ffmpeg-subtitle] Failed to concat meme audio: ${concatErr.message}`);
                }
            }

            turnStartTimes.push(accumulatedTime);
            accumulatedTime += duration;
            turnEndTimes.push(accumulatedTime);
            
            turn.duration = duration;
            turn.filePath = finalAudioPath;
        }

        const totalDuration = accumulatedTime;
        const contextDuration = 4.0;
        const fullDuration = totalDuration + contextDuration;

        console.log(`[ffmpeg-subtitle] Total Dialogue Duration: ${totalDuration.toFixed(2)}s, Full Duration: ${fullDuration.toFixed(2)}s`);

        // 2. Stitch audios together
        const stitchedPath = path.join(tmpDir, 'stitched.mp3');
        const inputsStr = turns.map(t => `-i "${t.filePath}"`).join(' ');
        const concatStr = turns.map((_, idx) => `[${idx}:a]`).join('') + `concat=n=${turns.length}:v=0:a=1[a]`;
        execSync(`ffmpeg -y ${inputsStr} -filter_complex "${concatStr}" -map "[a]" "${stitchedPath}"`, { stdio: 'pipe' });

        // 3. Build ASS subtitle file
        const assContent = buildSubtitleASS(turns, turnStartTimes, metadata, totalDuration, fullDuration);
        const assPath = path.join(tmpDir, 'subtitle.ass');
        fs.writeFileSync(assPath, assContent, 'utf-8');
        console.log(`[ffmpeg-subtitle] ASS subtitle file written to: ${assPath}`);

        // 4. Check for background audio
        const bgAudioPath = path.join(process.cwd(), 'news-bg.wav');
        const hasBgAudio = fs.existsSync(bgAudioPath);

        // 5. Setup dynamic cartoon character overlays
        const avatarsDir = path.resolve(__dirname, '..', '..', 'assets', 'avatars');
        const reporterAvatar = path.join(avatarsDir, 'reporter.png');
        const modi1 = path.join(avatarsDir, 'modi_1.png');
        const modi2 = path.join(avatarsDir, 'modi_2.png');
        const modi3 = path.join(avatarsDir, 'modi_3.png');

        const cmd: string[] = ['ffmpeg', '-y'];

        // Input 0: Color background
        cmd.push('-f', 'lavfi', '-i', `color=c=0x060d1a:s=1080x1920:d=${fullDuration.toFixed(3)},format=yuv420p`);

        // Input 1: stitched audio
        cmd.push('-i', stitchedPath);
        const audioIdx = 1;

        // Input 2: background music
        let bgIdx = -1;
        if (hasBgAudio) {
            cmd.push('-stream_loop', '-1', '-i', bgAudioPath);
            bgIdx = 2;
        }

        // Avatar inputs:
        let repIdx = -1;
        let modi1Idx = -1;
        let modi2Idx = -1;
        let modi3Idx = -1;

        let nextInputIdx = hasBgAudio ? 3 : 2;

        if (fs.existsSync(reporterAvatar)) {
            cmd.push('-i', reporterAvatar);
            repIdx = nextInputIdx++;
        }
        if (fs.existsSync(modi1)) {
            cmd.push('-i', modi1);
            modi1Idx = nextInputIdx++;
        }
        if (fs.existsSync(modi2)) {
            cmd.push('-i', modi2);
            modi2Idx = nextInputIdx++;
        }
        if (fs.existsSync(modi3)) {
            cmd.push('-i', modi3);
            modi3Idx = nextInputIdx++;
        }

        const getModiAvatarName = (turnIdx: number) => {
            let modiCount = 0;
            for (let i = 0; i <= turnIdx; i++) {
                if (turns[i].speaker === 'modi') {
                    modiCount++;
                }
            }
            if (turns[turnIdx].speaker === 'reporter') {
                let lookaheadModiCount = modiCount + 1;
                if (lookaheadModiCount === 2) return 'modi2';
                if (lookaheadModiCount >= 3) return 'modi3';
                return 'modi1';
            }
            if (modiCount === 2) return 'modi2';
            if (modiCount >= 3) return 'modi3';
            return 'modi1';
        };

        const getLastModiAvatarName = () => {
            let modiCount = 0;
            for (const t of turns) {
                if (t.speaker === 'modi') modiCount++;
            }
            if (modiCount >= 3) return 'modi3';
            if (modiCount === 2) return 'modi2';
            return 'modi1';
        };

        const intervals: Record<string, string[]> = {
            'rep': [],
            'modi1': [],
            'modi2': [],
            'modi3': [],
        };

        for (let i = 0; i < turns.length; i++) {
            const turn = turns[i];
            const start = turnStartTimes[i];
            const end = turnEndTimes[i];
            const modiAvatar = getModiAvatarName(i);

            const intervalStr = `between(t,${start.toFixed(3)},${end.toFixed(3)})`;

            if (turn.speaker === 'reporter') {
                intervals['rep'].push(intervalStr);
            } else {
                intervals[modiAvatar].push(intervalStr);
            }
        }

        const usedPads = new Set<string>();
        for (const [padName, list] of Object.entries(intervals)) {
            if (list.length > 0) {
                usedPads.add(padName);
            }
        }

        const overlayFilters: string[] = [];

        // Scale active speaker avatars (1800 width to stretch grey background wall to cover the screen width)
        const prepareAvatarPad = (name: string, inputIdx: number) => {
            if (inputIdx === -1) return;
            const hasNormal = usedPads.has(name);
            
            if (hasNormal) {
                overlayFilters.push(`[${inputIdx}:v] scale=1800:-1,format=rgba [${name}]`);
            }
        };

        prepareAvatarPad('rep', repIdx);
        prepareAvatarPad('modi1', modi1Idx);
        prepareAvatarPad('modi2', modi2Idx !== -1 ? modi2Idx : modi1Idx);
        prepareAvatarPad('modi3', modi3Idx !== -1 ? modi3Idx : (modi2Idx !== -1 ? modi2Idx : modi1Idx));

        // Overlay active speaker sequentially
        let currentPad = '[0:v]';
        let overlayCount = 0;

        const applyOverlay = (padName: string, x: number, y: number) => {
            if (!usedPads.has(padName)) return;
            const exprs = intervals[padName];
            if (exprs.length === 0) return;
            
            const enableExpr = exprs.join('+');
            const nextPad = `[v_overlay_${overlayCount++}]`;
            
            overlayFilters.push(`${currentPad}[${padName}] overlay=x=${x}:y=${y}:enable='${enableExpr}' ${nextPad}`);
            currentPad = nextPad;
        };

        // Overlay active reporter (zoomed and centered, shifted down to align with separator line)
        applyOverlay('rep', -360, 310);

        // Overlay active Modi configurations (zoomed and centered, shifted down to align with separator line)
        applyOverlay('modi1', -360, 310);
        applyOverlay('modi2', -360, 310);
        applyOverlay('modi3', -360, 310);

        currentPad = currentPad;

        // Build background and overlay subtitle chain starting on currentPad (disable vignette/top-bottom gradients)
        const videoFilters = buildVideoFilterChain(fullDuration, assPath, FONTS_DIR, currentPad, 1720, false, false);
        overlayFilters.push(videoFilters);

        let filterComplex = overlayFilters.join(';\n') + '\n[v]';

        if (hasBgAudio) {
            filterComplex += `;\n[1:a]volume=1.0[voice];[2:a]volume=0.12[bg];[voice][bg]amix=inputs=2:duration=first:dropout_transition=0[a]`;
        }

        const filterPath = path.join(tmpDir, 'filter.txt');
        fs.writeFileSync(filterPath, filterComplex, 'utf-8');
        
        // Write a copy to scratch for debugging
        try {
            fs.mkdirSync(path.join(process.cwd(), 'scratch'), { recursive: true });
            fs.writeFileSync(path.join(process.cwd(), 'scratch', 'filter.txt'), filterComplex, 'utf-8');
        } catch {}

        // Build FFmpeg command execution
        cmd.push('-filter_complex_script', filterPath);
        cmd.push('-map', '[v]');

        if (hasBgAudio) {
            cmd.push('-map', '[a]');
        } else {
            cmd.push('-map', `${audioIdx}:a`);
        }

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
