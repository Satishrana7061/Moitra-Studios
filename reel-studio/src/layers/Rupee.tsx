import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { money } from '../lib/moneyTheme';

/**
 * Rupee — the figure in the margin.
 *
 * A recurring character is what makes a channel recognisable: people follow a
 * personality, not a template, and a viewer should know the next reel is ours
 * before reading a word.
 *
 * **Built from joints, and posed over TIME.** The first version hard-coded each
 * limb as a fixed `d` string, so he could hold only the poses someone had typed
 * and could never move between them. The second could move but held one pose
 * per appearance — a moving drawing rather than a performance. This one takes a
 * SEQUENCE of poses with transitions, plus secondary motion layered on top,
 * which is the actual difference between animated and merely moving.
 *
 * **Drawn in ink, not placed on top.** The ground is a ledger page, so a flat
 * sticker would sit ON the page like a sticker. This is line art in the same
 * ink as the numbers, revealing itself along its own strokes.
 *
 * **Never during a beat.** A beat frame is committed from y=96 to y=1400 —
 * series bar, beat text, visual, caption, disclaimer — leaving a 160px band. A
 * figure there costs the numbers their size, and the numbers are the point. So
 * he bookends: the hook, where the question hangs, and the closing card, where
 * the comment is asked for. Those are also the two moments that decide whether
 * anyone watches and whether anyone replies.
 *
 * All geometry is code — no image asset, so it costs nothing per episode,
 * cannot 404 in CI the way the display font once did, and cannot drift.
 */

export type RupeePose =
    | 'thinking'
    | 'celebrating'
    | 'walking'
    | 'pointing'
    | 'worried'
    | 'surprised';

export type Mouth = 'neutral' | 'smile' | 'open' | 'frown';

type P = [number, number];

export interface Skeleton {
    head: P;
    neck: P;
    hip: P;
    lShoulder: P;
    rShoulder: P;
    lHand: P;
    rHand: P;
    lFoot: P;
    rFoot: P;
    lElbow?: P;
    rElbow?: P;
    offset: P;
    mouth: Mouth;
    /** Inner-end lift of each eyebrow. Positive reads worried, negative angry. */
    brow: number;
    /** Vertical scale for squash and stretch. 1 is rest. */
    squash: number;
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
    mouth: 'neutral',
    brow: 0,
    squash: 1,
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpP = (a: P, b: P, k: number): P => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

/**
 * Blends two poses.
 *
 * Without this a pose change is a jump cut on the character while the rest of
 * the frame is easing — which reads as a glitch, not a movement. Elbows blend
 * only when both poses have one, since interpolating a bent arm against a
 * straight one produces a shrug nobody asked for.
 */
export function lerpSkeleton(a: Skeleton, b: Skeleton, k: number): Skeleton {
    const j = k <= 0 ? 0 : k >= 1 ? 1 : k;
    return {
        head: lerpP(a.head, b.head, j),
        neck: lerpP(a.neck, b.neck, j),
        hip: lerpP(a.hip, b.hip, j),
        lShoulder: lerpP(a.lShoulder, b.lShoulder, j),
        rShoulder: lerpP(a.rShoulder, b.rShoulder, j),
        lHand: lerpP(a.lHand, b.lHand, j),
        rHand: lerpP(a.rHand, b.rHand, j),
        lFoot: lerpP(a.lFoot, b.lFoot, j),
        rFoot: lerpP(a.rFoot, b.rFoot, j),
        lElbow: a.lElbow && b.lElbow ? lerpP(a.lElbow, b.lElbow, j) : j < 0.5 ? a.lElbow : b.lElbow,
        rElbow: a.rElbow && b.rElbow ? lerpP(a.rElbow, b.rElbow, j) : j < 0.5 ? a.rElbow : b.rElbow,
        offset: lerpP(a.offset, b.offset, j),
        mouth: j < 0.5 ? a.mouth : b.mouth,
        brow: lerp(a.brow, b.brow, j),
        squash: lerp(a.squash, b.squash, j),
    };
}

/** The skeleton for one pose at `t` seconds into it. */
function poseAt(pose: RupeePose, t: number): Skeleton {
    switch (pose) {
        case 'thinking': {
            // The chin sits at y=72, so the hand has to finish just under it to
            // read as thinking — an earlier version stopped at y=118 and looked
            // like an arm held out at an odd angle.
            const sway = Math.sin(t * 1.1) * 2.5;
            return {
                ...REST,
                head: [80 + sway * 0.6, 46],
                rElbow: [124, 108],
                rHand: [92 + sway * 0.4, 82],
                offset: [sway, 0],
                brow: 0.35,
            };
        }
        case 'celebrating': {
            const bounce = Math.abs(Math.sin(t * 3.4));
            // Squash on the way down, stretch at the top — the oldest trick in
            // animation and the one that makes a jump read as weight rather
            // than as a sprite moving up and down.
            return {
                ...REST,
                lHand: [26, 86 - bounce * 8],
                rHand: [134, 86 - bounce * 8],
                offset: [0, -bounce * 9],
                squash: 1 + bounce * 0.06 - (1 - bounce) * 0.05,
                mouth: 'smile',
                brow: -0.2,
            };
        }
        case 'walking': {
            // Legs and arms on one phase in opposition, which is what makes a
            // walk read as a walk rather than a figure vibrating on the spot.
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
            };
        }
        case 'pointing': {
            // Points UP. He sits below the closing question, so an arm held out
            // sideways gestures at nothing — the whole purpose of the pose is
            // to aim the eye at the thing being asked.
            const push = Math.sin(t * 5) * 3;
            return {
                ...REST,
                rElbow: [116, 106],
                rHand: [138 + push, 68 - push],
                mouth: 'smile',
                brow: -0.15,
            };
        }
        case 'worried': {
            // Slumped: shoulders down, head forward, hands up near the face.
            const fret = Math.sin(t * 2.2) * 2;
            return {
                ...REST,
                head: [80 + fret, 52],
                neck: [80, 78],
                lShoulder: [61, 136],
                rShoulder: [99, 136],
                lElbow: [40, 120],
                rElbow: [120, 120],
                lHand: [62 + fret, 88],
                rHand: [98 + fret, 88],
                offset: [fret * 0.5, 2],
                mouth: 'frown',
                brow: 0.9,
            };
        }
        case 'surprised': {
            // Arms flung out and a small recoil — the body reacts before the
            // face does, which is what makes a reaction believable.
            const jolt = Math.max(0, 1 - t * 3);
            return {
                ...REST,
                head: [80, 44 - jolt * 3],
                // Angled up, not straight out. At shoulder height (y=132) the
                // arms merged with the shoulder line into one long horizontal
                // bar and read as a scarecrow rather than a startle.
                lHand: [20, 106],
                rHand: [140, 106],
                lFoot: [60, 188],
                rFoot: [100, 188],
                offset: [0, -jolt * 4],
                squash: 1 + jolt * 0.05,
                mouth: 'open',
                brow: 0.7,
            };
        }
    }
}

export interface PoseStep {
    pose: RupeePose;
    /** Seconds from the start of the appearance. */
    atSec: number;
}

/**
 * Seconds of actual performance a sequence gets, after the delay and the draw.
 *
 * Exported so the checks can assert every pose lands inside its own window.
 * Twice now an animation has been written that could never be seen — a blink
 * whose first firing fell after the character left, and a third pose scheduled
 * at 1.75s inside a 1.53s window. Both looked correct in the source and were
 * simply absent from the video, which is the least detectable kind of wrong.
 */
export const performanceWindowSec = (windowSec: number, delaySec: number): number =>
    windowSec - delaySec - 0.85;

/**
 * The pose at a moment in a sequence, blended across the handover.
 *
 * Transitions use a spring rather than a linear ramp so a movement settles
 * instead of arriving — and settling is most of what separates a character
 * from a diagram.
 */
function sequenceAt(steps: PoseStep[], t: number, fps: number, frame: number): Skeleton {
    const ordered = [...steps].sort((a, b) => a.atSec - b.atSec);
    let i = 0;
    for (let k = 0; k < ordered.length; k++) if (t >= ordered[k].atSec) i = k;

    const cur = ordered[i];
    const nxt = ordered[i + 1];
    const curPose = poseAt(cur.pose, Math.max(0, t - cur.atSec));
    if (!nxt) return curPose;

    const BLEND = 0.34;
    if (t < nxt.atSec - BLEND) return curPose;

    const k = spring({
        frame: frame - Math.round((nxt.atSec - BLEND) * fps),
        fps,
        config: { damping: 13, mass: 0.5, stiffness: 130 },
    });
    return lerpSkeleton(curPose, poseAt(nxt.pose, Math.max(0, t - nxt.atSec)), k);
}

/**
 * Blink, breath and sway, applied over whatever pose is running.
 *
 * This layer is why a figure looks alive rather than operated. A character that
 * never blinks reads as a mannequin however well its limbs move, and it is the
 * cheapest single thing on the list.
 */
function addLife(s: Skeleton, t: number): { skeleton: Skeleton; eyeOpen: number } {
    // Two numbers here were wrong on the first pass, and both mattered.
    //
    // The window was 0.06 of the cycle — about 0.19s, of which only ~2 frames
    // read as closed. That is faster than a real blink and lands as a glitch or
    // is missed entirely. Widened to 0.10, which closes the eyes for ~3 frames.
    //
    // Worse: with no offset the first blink fell at 2.8s, and he is only on the
    // hook for about 1.5s after drawing — so he never blinked there at all. An
    // animation nobody sees is not an animation. The offset puts the first one
    // at roughly 0.6s, inside every appearance.
    const cycle = 3.1;
    const phase = ((t + 2.3) % cycle) / cycle;
    const blinking = phase > 0.9;
    const eyeOpen = blinking ? Math.abs(Math.cos((phase - 0.9) / 0.1 * Math.PI)) : 1;

    const breath = Math.sin(t * 1.6) * 1.4;
    const sway = Math.sin(t * 0.7) * 1.1;

    return {
        eyeOpen,
        skeleton: {
            ...s,
            neck: [s.neck[0], s.neck[1] - breath * 0.5],
            lShoulder: [s.lShoulder[0], s.lShoulder[1] - breath],
            rShoulder: [s.rShoulder[0], s.rShoulder[1] - breath],
            head: [s.head[0] + sway * 0.4, s.head[1] - breath * 0.7],
            offset: [s.offset[0] + sway * 0.3, s.offset[1]],
        },
    };
}

const line = (...pts: (P | undefined)[]): string => {
    const kept = pts.filter(Boolean) as P[];
    return kept.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
};

/**
 * An arm drawn as an ARC rather than two straight segments.
 *
 * Limbs travel on curves. Straight-line interpolation between joints is the
 * single most mechanical-looking thing a rigged figure can do, and a quadratic
 * through the elbow fixes it for the cost of one control point.
 */
const arm = (shoulder: P, hand: P, elbow?: P): string => {
    if (elbow) return `M ${shoulder[0]} ${shoulder[1]} Q ${elbow[0]} ${elbow[1]} ${hand[0]} ${hand[1]}`;
    const mid: P = [(shoulder[0] + hand[0]) / 2, (shoulder[1] + hand[1]) / 2];
    // Bows the arm slightly away from the body, which is how a relaxed arm hangs.
    const bow = shoulder[0] < 80 ? -7 : 7;
    return `M ${shoulder[0]} ${shoulder[1]} Q ${mid[0] + bow} ${mid[1]} ${hand[0]} ${hand[1]}`;
};

const lengthOf = (...pts: (P | undefined)[]): number => {
    const kept = pts.filter(Boolean) as P[];
    let n = 0;
    for (let i = 1; i < kept.length; i++) n += Math.hypot(kept[i][0] - kept[i - 1][0], kept[i][1] - kept[i - 1][1]);
    // Generous: an underestimate leaves a stroke visibly unfinished, which
    // looks like a rendering fault rather than a drawing.
    return n * 1.2 + 10;
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
    /** A single pose, or a timeline of them. */
    pose?: RupeePose;
    sequence?: PoseStep[];
    /** Seconds to wait before starting to draw. */
    delaySec?: number;
    size?: number;
    /** Slides in from this many px left (negative) or right. 0 draws in place. */
    enterFrom?: number;
}> = ({ pose = 'thinking', sequence, delaySec = 0, size = 300, enterFrom = 0 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const start = Math.round(delaySec * fps);

    // Drawing and walking on are alternatives, not a sequence. Doing both made
    // him assemble himself in place and THEN slide across, which reads as two
    // unrelated events rather than an entrance.
    //
    // So the first appearance draws — ink arriving on the page, which is the
    // identity — and any later one walks on, because by then he exists and
    // redrawing him says otherwise. `enterFrom` picks which.
    //
    // 0.85s, down from 1.05: the hook runs 3.07s in total, so every tenth of a
    // second spent drawing is taken from the performance, and the performance
    // is the part that has to land inside the window.
    const drawFrames = enterFrom === 0 ? Math.round(fps * 0.85) : 0;

    const progress = drawFrames === 0
        ? (frame >= start ? 1 : 0)
        : interpolate(frame, [start, start + drawFrames], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
          });

    // Movement waits until he is fully drawn — animating a half-drawn figure
    // slides the strokes around and reads as a glitch.
    const t = Math.max(0, (frame - start - drawFrames) / fps);
    const steps = sequence ?? [{ pose, atSec: 0 }];
    const posed = sequenceAt(steps, t, fps, frame - start - drawFrames);
    const { skeleton: s, eyeOpen } = addLife(posed, t);

    const settle = spring({
        frame: frame - start - drawFrames,
        fps,
        config: { damping: 11, mass: 0.4, stiffness: 120 },
    });

    // Anticipation on the entrance: he overshoots slightly past his mark and
    // eases back, rather than arriving and stopping dead.
    const slide = enterFrom * (1 - settle);
    const [ox, oy] = s.offset;
    const R = 26;
    const eyeH = 8 * eyeOpen;

    // Each mouth carries its OWN dash length. A single shared 30 was wrong for
    // the open mouth, whose two arcs run about 47 units — so it drew only the
    // first two thirds of itself and came out as a hook-shaped squiggle across
    // the face. A dash length shorter than its path is not a subtle bug: the
    // stroke is simply unfinished, and it looks like a rendering fault.
    const [mouthPath, mouthLen] = ((): [string, number] => {
        const [hx, hy] = s.head;
        switch (s.mouth) {
            case 'smile': return [`M ${hx - 11} ${hy + 10} q 11 11 22 0`, 30];
            case 'frown': return [`M ${hx - 10} ${hy + 16} q 10 -9 20 0`, 28];
            case 'open': return [`M ${hx} ${hy + 13} m -6.5 0 a 6.5 7 0 1 0 13 0 a 6.5 7 0 1 0 -13 0`, 56];
            default: return [`M ${hx - 10} ${hy + 13} l 20 0`, 22];
        }
    })();

    return (
        <svg
            width={size}
            height={size * 1.15}
            viewBox="0 0 160 200"
            style={{
                overflow: 'visible',
                transform:
                    `translate(${ox + slide}px, ${oy}px) ` +
                    `rotate(${(1 - settle) * -3}deg) ` +
                    `scaleY(${s.squash}) scaleX(${2 - s.squash})`,
                transformOrigin: '80px 188px',
            }}
        >
            <Stroke d={`M ${s.head[0]} ${s.head[1] - R} a ${R} ${R} 0 1 0 0.01 0`} length={2 * Math.PI * R * 1.15} progress={progress} from={0} to={0.3} />
            <Stroke d={line(s.neck, s.hip)} length={lengthOf(s.neck, s.hip)} progress={progress} from={0.3} to={0.48} />
            <Stroke d={line(s.hip, s.lFoot)} length={lengthOf(s.hip, s.lFoot)} progress={progress} from={0.48} to={0.62} />
            <Stroke d={line(s.hip, s.rFoot)} length={lengthOf(s.hip, s.rFoot)} progress={progress} from={0.48} to={0.62} />
            <Stroke d={line(s.lShoulder, s.rShoulder)} length={lengthOf(s.lShoulder, s.rShoulder)} progress={progress} from={0.56} to={0.66} width={6} />
            <Stroke d={arm(s.rShoulder, s.rHand, s.rElbow)} length={lengthOf(s.rShoulder, s.rElbow, s.rHand)} progress={progress} from={0.62} to={0.86} />
            <Stroke d={arm(s.lShoulder, s.lHand, s.lElbow)} length={lengthOf(s.lShoulder, s.lElbow, s.lHand)} progress={progress} from={0.86} to={1} />

            {/*
              Brows, eyes and mouth on three clearly separated bands inside a
              26px head: ~31, ~41, ~59. The first attempt put brows and eyes 8px
              apart and they merged into one blob at render size — a stick
              figure is readable or it is nothing, and the face is where that is
              won or lost.
            */}
            <Stroke d={`M ${s.head[0] - 15} ${s.head[1] - 15 + s.brow * 4} l 9 ${-s.brow * 5}`} length={13} progress={progress} from={0.34} to={0.44} width={3.5} />
            <Stroke d={`M ${s.head[0] + 6} ${s.head[1] - 15 - s.brow * 1} l 9 ${s.brow * 5}`} length={13} progress={progress} from={0.34} to={0.44} width={3.5} />

            {/* Eyes. Height is driven by the blink, so they flatten and reopen. */}
            <Stroke d={`M ${s.head[0] - 9} ${s.head[1] - 6} l 0 ${Math.max(0.5, eyeH)}`} length={9} progress={progress} from={0.28} to={0.36} width={6} />
            <Stroke d={`M ${s.head[0] + 9} ${s.head[1] - 6} l 0 ${Math.max(0.5, eyeH)}`} length={9} progress={progress} from={0.3} to={0.38} width={6} />

            <Stroke d={mouthPath} length={mouthLen} progress={progress} from={0.38} to={0.5} width={5} />
        </svg>
    );
};
