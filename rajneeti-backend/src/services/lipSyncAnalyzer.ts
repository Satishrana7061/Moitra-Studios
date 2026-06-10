/**
 * lipSyncAnalyzer.ts — Audio volume → mouth state mapper
 * 
 * Analyzes an audio file by downsampling to 8kHz mono PCM,
 * measuring peak amplitude in 100ms windows, and mapping
 * each window to a cartoon mouth state (closed / half / open).
 * 
 * Consecutive identical states are merged into time ranges
 * to minimize the number of FFmpeg enable expressions.
 * 
 * Uses FFmpeg for the audio conversion — no npm dependencies.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface MouthFrame {
    start: number;   // seconds (absolute time in the video)
    end: number;     // seconds
    state: 'closed' | 'half' | 'open';
}

// ────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────

const SAMPLE_RATE   = 8000;   // 8kHz downsample
const WINDOW_MS     = 150;    // 150ms per analysis window (smoother than 100ms)
const WINDOW_SAMPLES = Math.floor(SAMPLE_RATE * WINDOW_MS / 1000);  // 1200 samples

// Amplitude thresholds for 16-bit signed PCM (max ±32768)
const THRESHOLD_CLOSED = 800;    // < 800 = silence → closed
const THRESHOLD_HALF   = 8000;   // 800–8000 = soft speech → half open
                                 // ≥ 8000 = loud speech → wide open

// Minimum duration for a state to be kept (avoids jittery frame swaps)
const MIN_STATE_DURATION_MS = 150;

// ────────────────────────────────────────────────────────────
// Main function
// ────────────────────────────────────────────────────────────

/**
 * Analyze an audio file and return merged lip-sync mouth frames.
 * 
 * @param audioPath - Path to the audio file (mp3, wav, etc.)
 * @returns Array of MouthFrame ranges, sorted by start time
 */
export function analyzeLipSync(audioPath: string): MouthFrame[] {
    if (!fs.existsSync(audioPath)) {
        console.warn(`[LipSync] Audio file not found: ${audioPath}`);
        return [{ start: 0, end: 999, state: 'closed' }];
    }

    // 1. Downsample to 8kHz mono 16-bit PCM via FFmpeg
    const tmpPcm = path.join(os.tmpdir(), `lipsync_${Date.now()}_${Math.random().toString(36).slice(2)}.raw`);

    try {
        execSync(
            `ffmpeg -y -i "${audioPath}" -ar ${SAMPLE_RATE} -ac 1 -f s16le "${tmpPcm}"`,
            { stdio: 'pipe', timeout: 30000 }
        );
    } catch (err: any) {
        console.warn(`[LipSync] FFmpeg resampling failed for ${audioPath}: ${err.message}`);
        return [{ start: 0, end: 999, state: 'closed' }];
    }

    let rawPcm: Buffer;
    try {
        rawPcm = fs.readFileSync(tmpPcm);
    } catch {
        return [{ start: 0, end: 999, state: 'closed' }];
    } finally {
        try { fs.unlinkSync(tmpPcm); } catch {}
    }

    if (rawPcm.length < 2) {
        return [{ start: 0, end: 0.1, state: 'closed' }];
    }

    // 2. Calculate peak amplitude per window
    const totalSamples = Math.floor(rawPcm.length / 2);
    const windowCount = Math.floor(totalSamples / WINDOW_SAMPLES);

    const rawStates: { time: number; state: 'closed' | 'half' | 'open' }[] = [];

    for (let w = 0; w < windowCount; w++) {
        let peak = 0;
        for (let s = 0; s < WINDOW_SAMPLES; s++) {
            const byteIdx = (w * WINDOW_SAMPLES + s) * 2;
            if (byteIdx + 1 < rawPcm.length) {
                peak = Math.max(peak, Math.abs(rawPcm.readInt16LE(byteIdx)));
            }
        }

        let state: 'closed' | 'half' | 'open';
        if (peak < THRESHOLD_CLOSED) {
            state = 'closed';
        } else if (peak < THRESHOLD_HALF) {
            state = 'half';
        } else {
            state = 'open';
        }

        rawStates.push({ time: w * (WINDOW_MS / 1000), state });
    }

    if (rawStates.length === 0) {
        return [{ start: 0, end: 0.1, state: 'closed' }];
    }

    // 3. Merge consecutive identical states into ranges
    const merged: MouthFrame[] = [];
    let currentState = rawStates[0].state;
    let rangeStart = rawStates[0].time;

    for (let i = 1; i < rawStates.length; i++) {
        if (rawStates[i].state !== currentState) {
            merged.push({ start: rangeStart, end: rawStates[i].time, state: currentState });
            currentState = rawStates[i].state;
            rangeStart = rawStates[i].time;
        }
    }
    // Push the final range
    merged.push({
        start: rangeStart,
        end: rawStates[rawStates.length - 1].time + (WINDOW_MS / 1000),
        state: currentState,
    });

    // 4. Remove very short transitions (< MIN_STATE_DURATION_MS)
    //    These cause jittery frame swaps that look unnatural
    const smoothed = smoothShortStates(merged);

    console.log(`[LipSync] ${path.basename(audioPath)}: ${rawStates.length} windows → ${smoothed.length} ranges`);
    return smoothed;
}

/**
 * Remove states shorter than MIN_STATE_DURATION_MS by absorbing them
 * into the surrounding dominant state.
 */
function smoothShortStates(frames: MouthFrame[]): MouthFrame[] {
    if (frames.length <= 1) return frames;

    const minDuration = MIN_STATE_DURATION_MS / 1000;
    const result: MouthFrame[] = [];

    for (const frame of frames) {
        const duration = frame.end - frame.start;

        if (duration < minDuration && result.length > 0) {
            // Absorb short frame into the previous one
            result[result.length - 1].end = frame.end;
        } else {
            result.push({ ...frame });
        }
    }

    // Second pass: merge any now-adjacent frames with the same state
    const merged: MouthFrame[] = [result[0]];
    for (let i = 1; i < result.length; i++) {
        if (result[i].state === merged[merged.length - 1].state) {
            merged[merged.length - 1].end = result[i].end;
        } else {
            merged.push(result[i]);
        }
    }

    return merged;
}
