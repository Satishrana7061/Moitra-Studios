import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { money } from '../lib/moneyTheme';

/**
 * Rupee — the figure in the margin.
 *
 * The competitor study found a recurring character doing most of the work of
 * being memorable: people follow a personality, not a template, and a viewer
 * should recognise the next reel as ours before reading a word of it. We had
 * colours and a font, which is not a personality.
 *
 * Two decisions shaped this, and both came from measuring rather than taste.
 *
 * **It is drawn in ink, not placed on top.** The ground is a ledger page, so a
 * flat sticker character would sit ON the page like a sticker. This is line art
 * in the same ink as the numbers, and it DRAWS ITSELF via stroke-dashoffset —
 * a doodle appearing in the margin of an account book, which is a thing people
 * genuinely do in account books.
 *
 * **It never appears during a beat.** The vertical budget of a beat frame is
 * spoken for from y=96 to y=1400 — series bar, beat text, visual, caption,
 * disclaimer — with a 160px band spare. Putting a figure there means shrinking
 * the numbers, and the numbers are the point. The hook and the closing card are
 * nearly empty, and they are also the two moments that matter most: the first
 * second decides whether anyone watches, the last decides whether anyone
 * comments. So Rupee bookends the reel rather than living inside it.
 *
 * All geometry is path data in code. No image asset, so it costs nothing per
 * episode, cannot 404 in CI the way the display font once did, and cannot drift
 * between episodes.
 */

export type RupeePose = 'thinking' | 'cheering';

/** One stroke of the drawing, revealed along its own length. */
const Stroke: React.FC<{
  d: string;
  length: number;
  progress: number;
  /** Where in the 0-1 draw this stroke starts, so the figure builds in order. */
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
      // A generous dash length: an underestimate leaves the stroke visibly
      // unfinished, which looks like a rendering fault rather than a drawing.
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
  // Drawn over about a second. Faster reads as a pop-in and loses the point;
  // slower and it is still being drawn when the beat has moved on.
  const progress = interpolate(frame, [start, start + Math.round(fps * 1.05)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // A small settle once drawn, so the figure is alive rather than a decal.
  const settle = spring({
    frame: frame - start - Math.round(fps * 0.9),
    fps,
    config: { damping: 11, mass: 0.4, stiffness: 120 },
  });

  // The chin sits at y=72 (head centred at 46, radius 26), so the hand has to
  // finish just under it to read as thinking. The first attempt ran the forearm
  // out to the right and stopped at y=118 — nowhere near the face — and read as
  // an arm sticking out at an odd angle rather than a pose.
  const armsThinking = (
    <>
      <Stroke d="M 100 132 L 124 108 L 92 82" length={92} progress={progress} from={0.62} to={0.86} />
      <Stroke d="M 60 132 L 46 174" length={45} progress={progress} from={0.86} to={1} />
    </>
  );

  const armsCheering = (
    <>
      <Stroke d="M 100 132 L 132 88" length={56} progress={progress} from={0.62} to={0.84} />
      <Stroke d="M 60 132 L 28 88" length={56} progress={progress} from={0.84} to={1} />
    </>
  );

  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 160 200"
      style={{
        overflow: 'visible',
        transform: `rotate(${(1 - settle) * -3}deg) translateY(${(1 - settle) * 6}px)`,
      }}
    >
      {/* head */}
      <Stroke d="M 80 46 m -26 0 a 26 26 0 1 0 52 0 a 26 26 0 1 0 -52 0" length={164} progress={progress} from={0} to={0.3} />
      {/* body */}
      <Stroke d="M 80 72 L 80 140" length={68} progress={progress} from={0.3} to={0.48} />
      {/* legs — a narrow stance reads as standing; wider looked like walking */}
      <Stroke d="M 80 140 L 66 188" length={50} progress={progress} from={0.48} to={0.62} />
      <Stroke d="M 80 140 L 94 188" length={50} progress={progress} from={0.48} to={0.62} />
      {/* shoulders, so the arms have somewhere to leave from */}
      <Stroke d="M 60 132 L 100 132" length={40} progress={progress} from={0.56} to={0.66} width={6} />

      {pose === 'cheering' ? armsCheering : armsThinking}

      {/* eyes, last — a face appearing completes the figure */}
      <Stroke d="M 71 42 l 0 6" length={6} progress={progress} from={0.28} to={0.36} width={6} />
      <Stroke d="M 89 42 l 0 6" length={6} progress={progress} from={0.3} to={0.38} width={6} />
      {pose === 'cheering' ? (
        <Stroke d="M 69 56 q 11 10 22 0" length={26} progress={progress} from={0.38} to={0.5} width={5} />
      ) : (
        <Stroke d="M 70 58 l 20 0" length={20} progress={progress} from={0.38} to={0.5} width={5} />
      )}
    </svg>
  );
};
