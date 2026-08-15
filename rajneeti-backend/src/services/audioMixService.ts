/**
 * Masters the voiceover into the single track Remotion plays.
 *
 * Remotion's <Audio volume> can only SCALE a track; it cannot duck one signal
 * against another. So the voice/music balance has to be settled in ffmpeg
 * before the render, not inside it.
 *
 * The chain, and why each part is there:
 *
 *   voice → loudnorm          bring the read to a consistent level first, so the
 *                             ducking threshold means the same thing every episode
 *   music → volume + sidechaincompress
 *                             the music is pushed down BY the voice rather than
 *                             sitting at a fixed low level. A fixed level is what
 *                             the old pipeline did (volume=0.12, no ducking) and
 *                             it is why music and speech fought each other.
 *   mix   → loudnorm -14 LUFS the level platforms normalise to on playback. An
 *                             un-normalised upload arrives quieter than
 *                             everything around it in the feed.
 */

import { execFileSync, spawnSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

/** Platform playback target. Both Meta and YouTube normalise around this. */
const TARGET_LUFS = -14;
/** The voice is normalised a little hotter, then the final pass pulls the mix down. */
const VOICE_LUFS = -16;

export interface MixOptions {
    /** Path to a background music file. Omitted or missing → voice only. */
    musicPath?: string;
    /** Music level before ducking. */
    musicGain?: number;
    /** Extra silence after the last word, so the outro card is not abrupt. */
    tailSec?: number;
}

/**
 * Resolves an ffmpeg with the audio filters this chain needs.
 *
 * Order matters. @ffmpeg-installer/ffmpeg is already a dependency and ships a
 * full static build, so it is preferred over whatever happens to be on PATH.
 * Do NOT reach for Playwright's bundled ffmpeg: it is built with
 * --disable-everything and carries no audio codecs or filters at all, so
 * loudnorm, sidechaincompress and even lavfi are missing from it.
 */
export const ffmpegBin = (): string => {
    if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
    try {
        // ESM has no `require`; createRequire gives one scoped to this file.
        const installer = createRequire(import.meta.url)('@ffmpeg-installer/ffmpeg');
        if (installer?.path && fs.existsSync(installer.path)) return installer.path;
    } catch {
        /* fall through to PATH */
    }
    return 'ffmpeg';
};

export const ffprobeBin = (): string => process.env.FFPROBE_PATH || 'ffprobe';

const run = (bin: string, args: string[]): string => {
    try {
        return execFileSync(bin, args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err: any) {
        const detail = (err.stderr || err.stdout || err.message || '').toString().slice(-1200);
        throw new Error(`${path.basename(bin)} failed: ${detail}`);
    }
};

/**
 * ffmpeg writes its analysis to stderr and exits 0 on success, so the output
 * has to be captured whether or not the process fails. execFileSync only
 * surfaces stderr when it THROWS, which silently loses the result on the happy
 * path — spawnSync returns both streams either way.
 */
const probe = (bin: string, args: string[]): string => {
    const res = spawnSync(bin, args, { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    return `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
};

/** Duration in seconds, read from the container rather than guessed. */
export function audioDurationSec(filePath: string): number {
    // ffprobe is often absent where only a static ffmpeg exists, so treat it as
    // the optimisation and ffmpeg's own Duration line as the reliable path.
    const probed = spawnSync(
        ffprobeBin(),
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', filePath],
        { encoding: 'utf-8' },
    );
    const direct = parseFloat((probed.stdout ?? '').trim());
    if (Number.isFinite(direct)) return direct;

    const out = probe(ffmpegBin(), ['-i', filePath, '-f', 'null', '-']);
    const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);

    throw new Error(`Could not determine duration of ${filePath}`);
}

/** Integrated loudness in LUFS, measured with ebur128. Used to verify the master. */
export function measureLoudness(filePath: string): number {
    const out = probe(ffmpegBin(), ['-i', filePath, '-af', 'ebur128', '-f', 'null', '-']);
    // The summary block at the end carries the integrated value.
    const m = out.match(/Integrated loudness[\s\S]*?I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/);
    if (m) return parseFloat(m[1]);
    throw new Error(`Could not measure loudness of ${filePath}`);
}

/**
 * Produces the mastered track. Returns the file path and its true duration.
 *
 * `voiceBuffer` is whatever ElevenLabs returned (MP3). Output is WAV so the
 * render pulls a losslessly-decoded track rather than re-decoding a lossy one.
 */
export function masterVoiceover(
    voiceBuffer: Buffer,
    outDir: string,
    opts: MixOptions = {},
): { path: string; durationSec: number } {
    const { musicPath, musicGain = 0.18, tailSec = 0 } = opts;

    fs.mkdirSync(outDir, { recursive: true });
    const voicePath = path.join(outDir, 'voice-raw.mp3');
    fs.writeFileSync(voicePath, voiceBuffer);

    const outPath = path.join(outDir, 'master.wav');
    const hasMusic = Boolean(musicPath && fs.existsSync(musicPath));

    // The tail is bare `apad` (pad forever) capped by an output `-t`, NOT
    // `apad=pad_dur=`. pad_dur only exists from ffmpeg 4.2, and
    // @ffmpeg-installer/ffmpeg ships 4.1 — so pad_dur fails with "Option
    // 'pad_dur' not found" on exactly the machine this is meant to run on.
    // Bare apad has been there since forever, and -t is version-proof.
    const pad = tailSec > 0 ? ',apad' : '';
    const capArgs =
        tailSec > 0 ? ['-t', String(audioDurationSec(voicePath) + tailSec)] : [];

    if (!hasMusic) {
        // Voice only: normalise straight to the platform target.
        run(ffmpegBin(), [
            '-y',
            '-i', voicePath,
            '-af', `loudnorm=I=${TARGET_LUFS}:TP=-1.0:LRA=11${pad}`,
            '-ar', '48000', '-ac', '2',
            ...capArgs,
            outPath,
        ]);
    } else {
        // sidechaincompress takes two inputs: the signal to duck (music) and the
        // key that triggers ducking (voice). The voice is split because it is
        // needed both as the key and in the final mix.
        // Both branches are forced to the same layout and rate BEFORE the
        // sidechain. sidechaincompress refuses to negotiate formats itself and
        // fails with "No channel layout for input 1" otherwise — which is not a
        // synthetic-test artefact: ElevenLabs returns mono MP3 and a music bed
        // may be mono or stereo at any sample rate.
        const norm = 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';
        const filter = [
            // The tail is padded onto the VOICE, before the split, so amix's
            // duration=first runs past the last word and the music carries on
            // under the outro card instead of stopping dead with the speech.
            // The key branch is padded too, so the sidechain sees silence there
            // and lets the music back up.
            `[0:a]loudnorm=I=${VOICE_LUFS}:TP=-1.5:LRA=11,${norm}${pad},asplit=2[voice][key]`,
            `[1:a]volume=${musicGain},${norm}[music]`,
            `[music][key]sidechaincompress=threshold=0.05:ratio=6:attack=20:release=300[ducked]`,
            `[voice][ducked]amix=inputs=2:duration=first:dropout_transition=0[mixed]`,
            `[mixed]loudnorm=I=${TARGET_LUFS}:TP=-1.0:LRA=11[out]`,
        ].join(';');

        run(ffmpegBin(), [
            '-y',
            '-i', voicePath,
            '-stream_loop', '-1', '-i', musicPath!,
            '-filter_complex', filter,
            '-map', '[out]',
            '-ar', '48000', '-ac', '2',
            ...capArgs,
            outPath,
        ]);
    }

    return { path: outPath, durationSec: audioDurationSec(outPath) };
}
