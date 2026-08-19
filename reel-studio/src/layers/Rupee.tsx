import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { money } from '../lib/moneyTheme';

/**
 * Rupee — the figure in the margin.
 *
 * The competitor study found a recurring character doing most of the work of
 * being memorable: people follow a personality, not a template, and a viewer
 * should recognise the next reel as ours before reading a word of it.
 *
 * **He is built from joints, not from path strings.** The first version hard-
 * coded each limb as a fixed `d` attribute, which meant he could hold exactly
 * the poses someone had typed out and could never move between them. Everything
 * here is derived from a skeleton — nine points — so a pose is a *function of
 * time* rather than a drawing. That is the whole difference between a figure
 * that can appear and one that can walk, point, nod and react.
 *
 * **He is drawn in ink, not placed on top.** The ground is a ledger page, so a
 * flat sticker would sit ON the page like a sticker. This is line art in the
 * same ink as the numbers, revealing itself along its own strokes — a doodle
 * appearing in the margin of an account book.
 *
 * **He never appears during a beat.** A beat frame is committed from y=96 to
 * y=1400 — series bar, beat text, visual, caption, disclaimer — with a 160px
 * band spare. A figure there costs the numbers their size, and the numbers are
 * the point. So he bookends the reel: the hook, where the question hangs, and
 * the closing card, where the comment is asked for.
 *
 * All geometry is code. No image asset, so it costs nothing per episode, cannot
 * 404 in CI the way the display font once did, and cannot drift between
 * episodes.
 */

export type RupeePose = 'thinking' | 'cheering' | 'walking' | 'pointing';

interface Skeleton {
    head: [number, number];
    neck: [number, number];
    hip: [number, number];
    lShoulder: [number, number];
    rShoulder: [number, number];
    lHand: [number, number];
    rHand: [number, number];
    lFoot: [number, number];
    rFoot: [number, number];
    /** Elbows are optional: a straight arm just omits them. */
    lElbow?: [number, number];
    rElbow?: [number, number];
    /** Whole-body offset, for a walk that travels or a bob that lifts. */
    offset: [number, number];
    smiling: boolean;
}

const REST: Skeleton = {
    head: [80, 46],
    neck: [80, 72],
    hip: [80, 140],
    lShoulder: [60, 132],
    rShoulder: [100, 132],
    lHand: [46, 174],
    rHand: [114, 174],
    lFoot: [66, 188],
    rFoot: [94, 188],
    offset: [0, 0],
    smiling: false,
};

/**
 * The skeleton for a pose at time `t` seconds since the figure finished drawing.
 *
 * `t` is what makes movement possible at all — a pose that ignores it is a
 * still, and a pose that uses it is an animation. Cycles are written against
 * real seconds rather than frame counts so they read the same if the fps ever
 * changes.
 */
function poseAt(pose: RupeePose, t: number): Skeleton {
    switch (pose) {
        case 'thinking': {
            // A slow think: weight shifts and the head tilts, hand at the chin.
            // The chin sits at y=72, so the hand has to finish just under it —
            // an earlier version stopped at y=118 and read as an arm held out
            // at a strange angle rather than as a pose.
            const sway = Math.sin(t * 1.1) * 2.5;
            return {
                ...REST,
                head: [80 + sway * 0.6, 46],
                rElbow: [124, 108],
                rHand: [92 + sway * 0.4, 82],
                lHand: [46, 174],
                offset: [sway, 0],
                smiling: false,
            };
        }
        case 'cheering': {
            // Both arms up, bouncing. The bounce is the celebration; static
            // raised arms read as a shrug.
            const bounce = Math.abs(Math.sin(t * 3.4)) * 7;
            return {
                ...REST,
                lHand: [28, 88 - bounce],
                rHand: [132, 88 - bounce],
                lFoot: [66, 188],
                rFoot: [94, 188],
                offset: [0, -bounce * 0.5],
                smiling: true,
            };
        }
        case 'walking': {
            // A two-beat gait. Legs and arms are driven by the same phase in
            // opposition, which is what makes a walk read as a walk rather than
            // as a figure vibrating.
            const phase = t * 4.2;
            const swing = Math.sin(phase);
            const bob = Math.abs(Math.cos(phase)) * 3;
            return {
                ...REST,
                head: [80, 46 - bob],
                neck: [80, 72 - bob],
                hip: [80, 140 - bob],
                lShoulder: [60, 132 - bob],
                rShoulder: [100, 132 - bob],
                lFoot: [66 + swing * 22, 188],
                rFoot: [94 - swing * 22, 188],
                lHand: [46 - swing * 14, 172 - bob],
                rHand: [114 + swing * 14, 172 - bob],
                offset: [0, -bob],
                smiling: false,
            };
        }
        case 'pointing': {
            // Arm out and slightly up, with a small insistent push on it — the
            // gesture that says "look at this number".
            const push = Math.sin(t * 5) * 4;
            return {
                ...REST,
                rElbow: [118, 122],
                rHand: [150 + push, 104],
                lHand: [46, 174],
                smiling: false,
            };
        }
    }
}

/** A polyline through the given points, as SVG path data. */
const line = (...pts: ([number, number] | undefined)[]): string => {
    const kept = pts.filter(Boolean) as [number, number][];
    return kept.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
};

/** Rough length of a polyline, for the draw-on dash. */
const lengthOf = (...pts: ([number, number] | undefined)[]): number => {
    const kept = pts.filter(Boolean) as [number, number][];
    let n = 0;
    for (let i = 1; i < kept.length; i++) {
        n += Math.hypot(kept[i][0] - kept[i - 1][0], kept[i][1] - kept[i - 1][1]);
    }
    // Generous: an underestimate leaves a stroke visibly unfinished, which
    // looks like a rendering fault rather than a drawing.
    return n * 1.15 + 8;
};

const Stroke: React.FC<{
    d: string;
    length: number;
    progress: number;
    from: number;
    to: number;
    width?: number;
}> = ({ d, length, progress, from, to, width = 7 }) => {
    const local = interpolate(progress, [from, to], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    return (
        <path
            d={d}
            fill="none"
            stroke={money.text}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={length}
            strokeDashoffset={length * (1 - local)}
        />
    );
};

export const Rupee: React.FC<{
    pose: RupeePose;
    /** Seconds to wait before starting to draw. */
    delaySec?: number;
    size?: number;
}> = ({ pose, delaySec = 0, size = 300 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const start = Math.round(delaySec * fps);
    const drawFrames = Math.round(fps * 1.05);

    // Drawn over about a second. Faster reads as a pop-in and loses the point;
    // slower and he is still being drawn once the beat has moved on.
    const progress = interpolate(frame, [start, start + drawFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    // Movement begins only once he is fully drawn. Animating a half-drawn
    // figure makes the strokes appear to slide, which reads as a glitch.
    const t = Math.max(0, (frame - start - drawFrames) / fps);
    const s = poseAt(pose, t);

    const settle = spring({
        frame: frame - start - drawFrames,
        fps,
        config: { damping: 11, mass: 0.4, stiffness: 120 },
    });

    const [ox, oy] = s.offset;
    const R = 26;

    return (
        <svg
            width={size}
            height={size * 1.15}
            viewBox="0 0 160 200"
            style={{
                overflow: 'visible',
                transform: `translate(${ox}px, ${oy}px) rotate(${(1 - settle) * -3}deg)`,
            }}
        >
            {/* head */}
            <Stroke
                d={`M ${s.head[0]} ${s.head[1] - R} a ${R} ${R} 0 1 0 0.01 0`}
                length={2 * Math.PI * R * 1.1}
                progress={progress} from={0} to={0.3}
            />
            {/* spine */}
            <Stroke d={line(s.neck, s.hip)} length={lengthOf(s.neck, s.hip)} progress={progress} from={0.3} to={0.48} />
            {/* legs */}
            <Stroke d={line(s.hip, s.lFoot)} length={lengthOf(s.hip, s.lFoot)} progress={progress} from={0.48} to={0.62} />
            <Stroke d={line(s.hip, s.rFoot)} length={lengthOf(s.hip, s.rFoot)} progress={progress} from={0.48} to={0.62} />
            {/* shoulders */}
            <Stroke d={line(s.lShoulder, s.rShoulder)} length={lengthOf(s.lShoulder, s.rShoulder)} progress={progress} from={0.56} to={0.66} width={6} />
            {/* arms, elbow optional */}
            <Stroke d={line(s.rShoulder, s.rElbow, s.rHand)} length={lengthOf(s.rShoulder, s.rElbow, s.rHand)} progress={progress} from={0.62} to={0.86} />
            <Stroke d={line(s.lShoulder, s.lElbow, s.lHand)} length={lengthOf(s.lShoulder, s.lElbow, s.lHand)} progress={progress} from={0.86} to={1} />
            {/* face, last — a face appearing is what completes a figure */}
            <Stroke d={`M ${s.head[0] - 9} ${s.head[1] - 4} l 0 6`} length={6} progress={progress} from={0.28} to={0.36} width={6} />
            <Stroke d={`M ${s.head[0] + 9} ${s.head[1] - 4} l 0 6`} length={6} progress={progress} from={0.3} to={0.38} width={6} />
            {s.smiling ? (
                <Stroke d={`M ${s.head[0] - 11} ${s.head[1] + 10} q 11 10 22 0`} length={26} progress={progress} from={0.38} to={0.5} width={5} />
            ) : (
                <Stroke d={`M ${s.head[0] - 10} ${s.head[1] + 12} l 20 0`} length={20} progress={progress} from={0.38} to={0.5} width={5} />
            )}
        </svg>
    );
};
