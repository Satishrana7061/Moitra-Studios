/**
 * ffmpeg-based Video Generator for Rajneeti Reels
 * 
 * Replaces the Puppeteer screenshot-based approach with pure ffmpeg rendering.
 * Two modes:
 *   1. Kinetic Typography (PM Promises) - text slides with fade-in/out
 *   2. Subtitle-Style Captions (PM Interview) - phrase-by-phrase word-synced captions
 * 
 * All text is rendered using bundled .ttf font files (NotoSansDevanagari + Outfit)
 * so Hindi/Devanagari renders correctly on any system (including GitHub Actions CI).
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ────────────────────────────────────────────────────────────────
// Font resolution — tries bundled fonts first, then system paths
// ────────────────────────────────────────────────────────────────

function findFont(name: string): string {
    const candidates = [
        // Bundled in repo (relative to services/ dir)
        path.resolve(__dirname, '..', '..', 'assets', 'fonts', name),
        // Bundled in repo (relative to cwd)
        path.join(process.cwd(), 'assets', 'fonts', name),
        // System fonts (Ubuntu/Debian - noto package)
        `/usr/share/fonts/truetype/noto/${name}`,
        `/usr/share/fonts/noto/${name}`,
        // Fallback system fonts with partial name match
        ...findSystemFontPartial(name),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            console.log(`[ffmpeg] Found font "${name}" at: ${p}`);
            return p;
        }
    }
    console.warn(`[ffmpeg] Font "${name}" not found in any location. Looked in: ${candidates.slice(0, 4).join(', ')}`);
    // Return a generic fallback — ffmpeg will use its default if this doesn't exist
    return name;
}

function findSystemFontPartial(name: string): string[] {
    const dirs = [
        '/usr/share/fonts/truetype',
        '/usr/share/fonts',
        '/usr/local/share/fonts',
    ];
    const results: string[] = [];
    const baseName = name.replace(/\.ttf$/i, '').toLowerCase();
    
    for (const dir of dirs) {
        try {
            if (!fs.existsSync(dir)) continue;
            const findOutput = execSync(
                `find "${dir}" -iname "*${baseName.replace(/[^a-z0-9]/gi, '*')}*" -type f 2>/dev/null | head -5`,
                { timeout: 3000, encoding: 'utf-8' }
            ).trim();
            if (findOutput) {
                results.push(...findOutput.split('\n').filter(Boolean));
            }
        } catch {
            // find command not available on Windows or timed out
        }
    }
    return results;
}

// Resolve font paths once at module load
let HINDI_FONT = '';
let ENGLISH_FONT = '';

function initFonts() {
    if (!HINDI_FONT) {
        HINDI_FONT = findFont('NotoSansDevanagari.ttf');
    }
    if (!ENGLISH_FONT) {
        ENGLISH_FONT = findFont('Outfit.ttf');
        // Fallback: if Outfit not found, use Hindi font for everything
        if (!fs.existsSync(ENGLISH_FONT)) {
            ENGLISH_FONT = HINDI_FONT;
        }
    }
}

// ────────────────────────────────────────────────────────────────
// Text utilities
// ────────────────────────────────────────────────────────────────

/**
 * Wraps text into lines that fit within maxCharsPerLine.
 * Handles both Hindi (Devanagari) and English text.
 */
function wrapText(text: string, maxCharsPerLine: number = 24): string {
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

    return lines.join('\n');
}

/**
 * Escapes text for use in ffmpeg drawtext filter's text= parameter.
 * Must escape: colon, backslash, semicolon, single quote, brackets, percent.
 */
function escapeDrawtext(text: string): string {
    return text
        .replace(/\\/g, '\\\\\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/%/g, '%%')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n');
}

/**
 * Escapes a file path for use inside ffmpeg filter parameters.
 * On Windows, converts backslashes and handles colons.
 */
function escapeFilterPath(filePath: string): string {
    // Convert Windows backslashes to forward slashes
    let escaped = filePath.replace(/\\/g, '/');
    // Escape colons (C: drive letters)
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
    start: number;  // seconds
    end: number;    // seconds
}

export interface SubtitleSegment {
    speaker: 'reporter' | 'modi' | 'context';
    words: WordTiming[];
    text: string;
    startTime: number;
    endTime: number;
}

// ────────────────────────────────────────────────────────────────
// PM PROMISES — Kinetic Typography Reel Generator
// ────────────────────────────────────────────────────────────────

/**
 * Generates a professional kinetic typography reel for PM Promises.
 * 
 * Visual: Dark gradient background → slide text fades in/out → progress bar → branding
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
        let duration = 15; // default
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

        // ── Calculate slide timings ──────────────────────────────
        const slideCount = slides.length || 3;
        const slideDur = duration / slideCount;
        const FADE = 0.5; // fade-in/out duration in seconds

        console.log(`[ffmpeg-kinetic] ${slideCount} slides, ${slideDur.toFixed(2)}s each, total ${duration.toFixed(2)}s`);

        // ── Write slide texts to temp files ──────────────────────
        const slideFiles: string[] = [];
        for (let i = 0; i < slides.length; i++) {
            const wrapped = wrapText(slides[i].text, 22);
            const filePath = path.join(tmpDir, `slide${i}.txt`);
            fs.writeFileSync(filePath, wrapped, 'utf-8');
            slideFiles.push(filePath);
            console.log(`[ffmpeg-kinetic] Slide ${i} (${slides[i].type}): "${slides[i].text.slice(0, 50)}..."`);
        }

        // ── Check for background audio ──────────────────────────
        const bgAudioPath = path.join(process.cwd(), 'news-bg.wav');
        const hasBgAudio = fs.existsSync(bgAudioPath);
        console.log(`[ffmpeg-kinetic] Background audio: ${hasBgAudio ? 'found' : 'not found'}`);

        // ── Build the filter complex ─────────────────────────────
        const hf = escapeFilterPath(HINDI_FONT);
        const ef = escapeFilterPath(ENGLISH_FONT);

        const filterLines: string[] = [];

        // Base: dark gradient background
        filterLines.push('[0:v]');

        // --- Top section: LIVE badge ---
        filterLines.push(
            `drawtext=fontfile='${ef}':text='  LIVE  ':fontcolor=white:fontsize=36:` +
            `x=70:y=100:box=1:boxcolor=red@0.85:boxborderw=14`
        );

        // --- Header: MODI KI GUARANTEE ---
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext('MODI KI GUARANTEE')}':` +
            `fontcolor=0xFFB800:fontsize=52:x=70:y=200`
        );

        // --- Sub-header: Promise number & year ---
        const subHeader = `PROMISE #${branding.reelNumber} | ${branding.year} MANIFESTO`;
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext(subHeader)}':` +
            `fontcolor=white@0.6:fontsize=30:x=70:y=280`
        );

        // --- Thin separator line (using drawbox) ---
        filterLines.push(
            `drawbox=x=70:y=330:w=940:h=2:color=white@0.1:t=fill`
        );

        // --- Slide texts with fade-in/out ---
        for (let i = 0; i < slides.length; i++) {
            const sf = escapeFilterPath(slideFiles[i]);
            const start = i * slideDur;
            const end = (i + 1) * slideDur;
            const isLast = i === slides.length - 1;
            const isVerdict = slides[i].type === 'verdict';

            // Slide type label (small text above main content)
            const labelText = slides[i].type === 'headline' ? 'THE PROMISE' :
                              slides[i].type === 'verdict' ? 'VERDICT' : `ANALYSIS POINT ${i}`;
            const labelColor = isVerdict ? '0xFF6B00' : 'white@0.5';

            filterLines.push(
                `drawtext=fontfile='${ef}':text='${escapeDrawtext(labelText)}':` +
                `fontcolor=${labelColor}:fontsize=28:x=(w-text_w)/2:y=420:` +
                `enable='between(t\\,${start.toFixed(3)}\\,${end.toFixed(3)})':` +
                `alpha='if(lt(t-${start.toFixed(3)}\\,${FADE})\\,(t-${start.toFixed(3)})/${FADE}\\,` +
                `${isLast ? '1' : `if(gt(t\\,${(end - FADE).toFixed(3)})\\,(${end.toFixed(3)}-t)/${FADE}\\,1)`})'`
            );

            // Main slide text
            const textColor = isVerdict ? '0xFF6B00' : 'white';
            const fontSize = isVerdict ? 62 : 56;

            filterLines.push(
                `drawtext=fontfile='${hf}':textfile='${sf}':` +
                `fontcolor=${textColor}:fontsize=${fontSize}:` +
                `x=(w-text_w)/2:y=(h-text_h)/2-60:line_spacing=24:` +
                `enable='between(t\\,${start.toFixed(3)}\\,${end.toFixed(3)})':` +
                `alpha='if(lt(t-${start.toFixed(3)}\\,${FADE})\\,(t-${start.toFixed(3)})/${FADE}\\,` +
                `${isLast ? '1' : `if(gt(t\\,${(end - FADE).toFixed(3)})\\,(${end.toFixed(3)}-t)/${FADE}\\,1)`})'`
            );
        }

        // --- Progress bar background ---
        filterLines.push(
            `drawbox=x=70:y=1780:w=940:h=10:color=white@0.12:t=fill`
        );

        // --- Progress bar fill (grows with time) ---
        filterLines.push(
            `drawbox=x=70:y=1780:w='940*t/${duration.toFixed(3)}':h=10:color=0xFF6B00:t=fill`
        );

        // --- Footer branding ---
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext('MOITRA STUDIOS | Rajneeti')}':` +
            `fontcolor=white@0.4:fontsize=26:x=70:y=1840`
        );

        // --- Footer: title of promise (truncated) ---
        const footerTitle = branding.title.length > 45 ? branding.title.slice(0, 45) + '...' : branding.title;
        filterLines.push(
            `drawtext=fontfile='${hf}':text='${escapeDrawtext(footerTitle)}':` +
            `fontcolor=white@0.3:fontsize=22:x=70:y=1880`
        );

        filterLines.push('[v]');

        // Join all filter lines
        const filterComplex = filterLines.join(',\n');

        // ── Write filter to temp file ────────────────────────────
        const filterPath = path.join(tmpDir, 'filter.txt');
        fs.writeFileSync(filterPath, filterComplex, 'utf-8');

        // ── Build ffmpeg command ─────────────────────────────────
        const cmd: string[] = ['ffmpeg', '-y'];

        // Input 0: Dark background video
        cmd.push(
            '-f', 'lavfi', '-i',
            `color=c=0x0a0f1a:s=1080x1920:d=${duration.toFixed(3)},format=yuv420p`
        );

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

        // Map audio (mix voice + bg if both exist)
        if (hasVoice && hasBgAudio) {
            // Need to add an audio mix filter — append to filter file
            const audioFilter = `;\n[${voiceIdx}:a]volume=1.0[voice];[${bgIdx}:a]volume=0.15[bg];[voice][bg]amix=inputs=2:duration=first:dropout_transition=0[a]`;
            fs.appendFileSync(filterPath, audioFilter, 'utf-8');
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
        console.log(`[ffmpeg-kinetic] Filter complex written to: ${filterPath}`);

        execSync(fullCmd, { stdio: 'pipe', timeout: 120000 });

        // ── Read and return output ───────────────────────────────
        const videoBuffer = fs.readFileSync(outputPath);
        console.log(`[ffmpeg-kinetic] Video generated: ${videoBuffer.length} bytes (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

        if (videoBuffer.length < 1000) {
            throw new Error(`Generated video too small (${videoBuffer.length} bytes). ffmpeg likely failed.`);
        }

        return videoBuffer;

    } catch (err: any) {
        console.error('[ffmpeg-kinetic] Video generation failed:', err.message);
        // Log filter contents for debugging
        try {
            const filterContent = fs.readFileSync(path.join(tmpDir, 'filter.txt'), 'utf-8');
            console.error('[ffmpeg-kinetic] Filter complex was:\n', filterContent);
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
 * Each phrase appears on screen when the first word is spoken
 * and disappears when the next phrase begins.
 */
function groupWordsIntoPhrases(words: WordTiming[], wordsPerPhrase: number = 5): SubtitleSegment[] {
    const phrases: SubtitleSegment[] = [];
    for (let i = 0; i < words.length; i += wordsPerPhrase) {
        const chunk = words.slice(i, i + wordsPerPhrase);
        if (chunk.length === 0) continue;
        phrases.push({
            speaker: 'reporter', // will be overridden by caller
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
 * Visual: Dark background → phrase-by-phrase captions synced to audio → speaker badges → progress bar
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
            // Generate 15s silence
            execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 15 -q:a 9 "${stitchedPath}"`, { stdio: 'pipe' });
        }

        const totalDuration = reporterDuration + modiDuration;
        console.log(`[ffmpeg-subtitle] Durations: Reporter=${reporterDuration.toFixed(2)}s, Modi=${modiDuration.toFixed(2)}s, Total=${totalDuration.toFixed(2)}s`);

        // ── Add context slide duration ───────────────────────────
        const contextDuration = 4.0; // seconds for the context/verdict slide
        const fullDuration = totalDuration + contextDuration;

        // ── Group words into phrases ─────────────────────────────
        const reporterPhrases = groupWordsIntoPhrases(reporterWords, 5);
        
        // Offset Modi word timings by reporter duration
        const offsetModiWords = modiWords.map(w => ({
            ...w,
            start: w.start + reporterDuration,
            end: w.end + reporterDuration,
        }));
        const modiPhrases = groupWordsIntoPhrases(offsetModiWords, 5);

        // Set speaker labels
        reporterPhrases.forEach(p => p.speaker = 'reporter');
        modiPhrases.forEach(p => p.speaker = 'modi');

        const allPhrases = [...reporterPhrases, ...modiPhrases];
        console.log(`[ffmpeg-subtitle] ${reporterPhrases.length} reporter phrases + ${modiPhrases.length} Modi phrases = ${allPhrases.length} total`);

        // ── Check for background audio ───────────────────────────
        const bgAudioPath = path.join(process.cwd(), 'news-bg.wav');
        const hasBgAudio = fs.existsSync(bgAudioPath);

        // ── Build the filter complex ─────────────────────────────
        const hf = escapeFilterPath(HINDI_FONT);
        const ef = escapeFilterPath(ENGLISH_FONT);

        const filterLines: string[] = [];
        filterLines.push('[0:v]');

        // --- LIVE badge (always visible) ---
        filterLines.push(
            `drawtext=fontfile='${ef}':text='  LIVE  ':fontcolor=white:fontsize=34:` +
            `x=60:y=80:box=1:boxcolor=red@0.85:boxborderw=12`
        );

        // --- Network branding (always visible) ---
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext('RAJNEETI TV NETWORK')}':` +
            `fontcolor=white@0.5:fontsize=26:x=(w-text_w-60):y=90`
        );

        // --- Title: PM OPEN PRESS CONFERENCE ---
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext('PM OPEN PRESS CONFERENCE')}':` +
            `fontcolor=0xFFB800:fontsize=42:x=60:y=170`
        );

        // --- Topic title ---
        const topicTitle = metadata.title.length > 40 ? metadata.title.slice(0, 40) + '...' : metadata.title;
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext(topicTitle)}':` +
            `fontcolor=white@0.6:fontsize=28:x=60:y=240`
        );

        // --- Separator ---
        filterLines.push(
            `drawbox=x=60:y=290:w=960:h=2:color=white@0.1:t=fill`
        );

        // --- Speaker badge: REPORTER (visible during reporter section) ---
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext(`REPORTER ${metadata.reporterName.toUpperCase()}`)}':` +
            `fontcolor=0x3B82F6:fontsize=32:x=(w-text_w)/2:y=380:` +
            `box=1:boxcolor=0x3B82F6@0.12:boxborderw=14:` +
            `enable='lt(t\\,${reporterDuration.toFixed(3)})'`
        );

        // --- Speaker badge: PM MODI (visible during Modi section) ---
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext('PM NARENDRA MODI')}':` +
            `fontcolor=0xFF6B00:fontsize=32:x=(w-text_w)/2:y=380:` +
            `box=1:boxcolor=0xFF6B00@0.12:boxborderw=14:` +
            `enable='between(t\\,${reporterDuration.toFixed(3)}\\,${totalDuration.toFixed(3)})'`
        );

        // --- Speaker badge: FACT CHECK (visible during context section) ---
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext('FACT CHECK VERDICT')}':` +
            `fontcolor=0x10B981:fontsize=32:x=(w-text_w)/2:y=380:` +
            `box=1:boxcolor=0x10B981@0.12:boxborderw=14:` +
            `enable='gte(t\\,${totalDuration.toFixed(3)})'`
        );

        // --- Phrase captions (reporter + modi) ---
        const FADE = 0.3;
        for (let i = 0; i < allPhrases.length; i++) {
            const phrase = allPhrases[i];
            const nextStart = i < allPhrases.length - 1 ? allPhrases[i + 1].startTime : totalDuration;
            const displayEnd = Math.min(nextStart, phrase.endTime + 0.5);

            // Write phrase text to file for safe encoding
            const phraseFile = path.join(tmpDir, `phrase${i}.txt`);
            const wrappedPhrase = wrapText(phrase.text, 20);
            fs.writeFileSync(phraseFile, wrappedPhrase, 'utf-8');
            const pf = escapeFilterPath(phraseFile);

            // Phrase color: blue tint for reporter, warm for Modi
            const phraseColor = phrase.speaker === 'reporter' ? 'white' : 'white';

            filterLines.push(
                `drawtext=fontfile='${hf}':textfile='${pf}':` +
                `fontcolor=${phraseColor}:fontsize=58:` +
                `x=(w-text_w)/2:y=(h-text_h)/2-40:line_spacing=28:` +
                `enable='between(t\\,${phrase.startTime.toFixed(3)}\\,${displayEnd.toFixed(3)})':` +
                `alpha='if(lt(t-${phrase.startTime.toFixed(3)}\\,${FADE})\\,(t-${phrase.startTime.toFixed(3)})/${FADE}\\,1)'`
            );
        }

        // --- Context slide (fact check verdict at the end) ---
        const contextStart = totalDuration;
        const contextFile = path.join(tmpDir, 'context.txt');
        const wrappedContext = wrapText(metadata.newsContext, 22);
        fs.writeFileSync(contextFile, wrappedContext, 'utf-8');
        const cf = escapeFilterPath(contextFile);

        filterLines.push(
            `drawtext=fontfile='${hf}':textfile='${cf}':` +
            `fontcolor=0x10B981:fontsize=50:` +
            `x=(w-text_w)/2:y=(h-text_h)/2-40:line_spacing=24:` +
            `enable='gte(t\\,${contextStart.toFixed(3)})':` +
            `alpha='if(lt(t-${contextStart.toFixed(3)}\\,0.4)\\,(t-${contextStart.toFixed(3)})/0.4\\,1)'`
        );

        // --- Progress bar ---
        filterLines.push(
            `drawbox=x=60:y=1780:w=960:h=10:color=white@0.12:t=fill`
        );
        filterLines.push(
            `drawbox=x=60:y=1780:w='960*t/${fullDuration.toFixed(3)}':h=10:color=0xFF6B00:t=fill`
        );

        // --- Footer ---
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext('PM PRESS CONFERENCE')}':` +
            `fontcolor=0xFF6B00@0.6:fontsize=24:x=60:y=1830`
        );
        filterLines.push(
            `drawtext=fontfile='${ef}':text='${escapeDrawtext('Factual Q&A verified against official sources')}':` +
            `fontcolor=white@0.3:fontsize=20:x=60:y=1870`
        );

        filterLines.push('[v]');

        // Join and write filter
        const filterComplex = filterLines.join(',\n');
        const filterPath = path.join(tmpDir, 'filter.txt');
        fs.writeFileSync(filterPath, filterComplex, 'utf-8');

        // ── Build ffmpeg command ─────────────────────────────────
        const cmd: string[] = ['ffmpeg', '-y'];

        // Input 0: Dark background
        cmd.push(
            '-f', 'lavfi', '-i',
            `color=c=0x080d17:s=1080x1920:d=${fullDuration.toFixed(3)},format=yuv420p`
        );

        // Input 1: Stitched audio
        cmd.push('-i', stitchedPath);
        let audioIdx = 1;

        // Input 2: Background music
        let bgIdx = -1;
        if (hasBgAudio) {
            cmd.push('-stream_loop', '-1', '-i', bgAudioPath);
            bgIdx = 2;
        }

        // Filter complex
        cmd.push('-filter_complex_script', filterPath);
        cmd.push('-map', '[v]');

        // Audio mixing
        if (hasBgAudio) {
            const audioFilter = `;\n[${audioIdx}:a]volume=1.0[voice];[${bgIdx}:a]volume=0.12[bg];[voice][bg]amix=inputs=2:duration=first:dropout_transition=0[a]`;
            fs.appendFileSync(filterPath, audioFilter, 'utf-8');
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

        execSync(fullCmd, { stdio: 'pipe', timeout: 120000 });

        // ── Return output ────────────────────────────────────────
        const videoBuffer = fs.readFileSync(outputPath);
        console.log(`[ffmpeg-subtitle] Video generated: ${videoBuffer.length} bytes (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

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
