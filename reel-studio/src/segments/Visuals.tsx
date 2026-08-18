import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CONTENT } from '../lib/layout';
import { CAPTION_TOP, focalGlow, money, moneyFonts, moneyType, softShadow } from '../lib/moneyTheme';

/** Just below the beat text, which sits at y=300 and is at most two lines. */
const VISUAL_TOP = 450;
import type { VisualSpec } from '../lib/moneySchema';
import { LADDER_STEPS } from '../lib/ladder';

/**
 * The visual vocabulary for money content.
 *
 * Everything here is SVG or plain DOM animated with spring/interpolate — the
 * same technique as layers/IndiaMap.tsx. Nothing is a static image, because a
 * still frame is what made the previous reels feel dead.
 */

const useEnter = (delayFrames = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delayFrames,
    fps,
    config: { damping: 16, mass: 0.6, stiffness: 120 },
  });
};

/** Counts a rupee figure up, so the number is an event rather than a label. */
const BigNumber: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const enter = useEnter();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate only the digits, preserving ₹, commas and any suffix.
  const digits = value.replace(/[^\d]/g, '');
  const target = Number(digits || '0');
  const progress = interpolate(frame, [0, fps * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const eased = 1 - Math.pow(1 - progress, 3);
  const shown = target > 0 ? Math.round(target * eased).toLocaleString('en-IN') : null;
  const display = shown === null ? value : value.replace(digits, shown);

  // The highlighter swipe. Drawn left to right like a real marker stroke, and
  // it starts a beat AFTER the digits so it reads as someone marking a number
  // that is already on the page — the gesture, not a background.
  const swipe = interpolate(frame, [fps * 0.55, fps * 1.15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          inset: '-18% -10%',
          background: focalGlow(),
          opacity: enter * 0.7,
        }}
      />
      {/*
        The digits get their own positioning context so the swipe can be sized
        against THEM. Anchored to the outer block instead, it was measured
        against the block's full height — digits plus the label underneath — and
        sat low and short, reading as a misplaced rectangle rather than a stroke
        over the number.
      */}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          transform: `scale(${0.86 + enter * 0.14})`,
        }}
      >
        {/*
          On paper you do not recolour a figure to make it matter — you swipe
          over it. Marker ends are never square and never fully opaque, so this
          is a rounded, semi-transparent band that scales from its left edge.
        */}
        <div
          style={{
            position: 'absolute',
            left: '-4%',
            right: '-4%',
            top: '12%',
            bottom: '10%',
            background: money.accentSoft,
            borderRadius: 12,
            transformOrigin: 'left center',
            transform: `scaleX(${swipe}) skewX(-2.5deg)`,
          }}
        />
        <div
          style={{
            position: 'relative',
            fontFamily: moneyFonts.display,
            fontSize: moneyType.bigNumber,
            fontWeight: 800,
            // Ink. A ledger entry is written, not lit — at 190px the figure does
            // not need a colour to dominate the frame, it needs contrast.
            color: money.text,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {display}
        </div>
      </div>
      {label && (
        <div
          style={{
            marginTop: 24,
            fontFamily: moneyFonts.display,
            fontSize: moneyType.bigNumberLabel,
            color: money.textDim,
            opacity: enter,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

/** Two bars side by side. The right-hand one is framed as the cost. */
const Compare: React.FC<{ a: string; b: string; aLabel?: string; bLabel?: string }> = ({
  a,
  b,
  aLabel,
  bLabel,
}) => {
  const left = useEnter(0);
  const right = useEnter(8);

  const Card: React.FC<{ value: string; label?: string; tone: string; grow: number }> = ({
    value,
    label,
    tone,
    grow,
  }) => (
    <div
      style={{
        flex: 1,
        background: money.surface,
        border: `3px solid ${money.surfaceEdge}`,
        borderRadius: 28,
        padding: '36px 28px',
        boxShadow: softShadow,
        transform: `translateY(${(1 - grow) * 40}px)`,
        opacity: grow,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: moneyFonts.display,
          fontSize: moneyType.compareValue,
          fontWeight: 800,
          color: tone,
        }}
      >
        {value}
      </div>
      {label && (
        <div
          style={{
            marginTop: 12,
            fontFamily: moneyFonts.display,
            fontSize: moneyType.compareLabel,
            color: money.textDim,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 28, width: '100%', alignItems: 'stretch' }}>
      <Card value={a} label={aLabel} tone={money.growth} grow={left} />
      <Card value={b} label={bLabel} tone={money.cost} grow={right} />
    </div>
  );
};

/**
 * One row of an ordered list. Its own component because `useEnter` is a hook —
 * calling it inside a .map() callback breaks the Rules of Hooks.
 */
const StepRow: React.FC<{ item: string; index: number }> = ({ item, index }) => {
  const enter = useEnter(index * 7);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        background: money.surface,
        border: `3px solid ${money.surfaceEdge}`,
        borderRadius: 22,
        padding: '22px 28px',
        transform: `translateX(${(1 - enter) * -60}px)`,
        opacity: enter,
        boxShadow: softShadow,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: '50%',
          background: money.accent,
          // Ink, not money.bg. On the dark palette the page colour WAS the
          // contrast; on cream it would be near-invisible against the accent.
          color: money.text,
          fontFamily: moneyFonts.display,
          fontWeight: 800,
          fontSize: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {index + 1}
      </div>
      <div
        style={{
          fontFamily: moneyFonts.display,
          fontSize: moneyType.stepItem,
          color: money.text,
          lineHeight: 1.25,
        }}
      >
        {item}
      </div>
    </div>
  );
};

/** An ordered list revealed one item at a time. */
const Steps: React.FC<{ items: string[] }> = ({ items }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: '100%' }}>
    {items.map((item, i) => (
      <StepRow key={item} item={item} index={i} />
    ))}
  </div>
);

/** The seven-step ladder with the current rung lit — the series' spine. */
const Ladder: React.FC<{ highlightStep: number }> = ({ highlightStep }) => {
  const enter = useEnter();
  return (
    <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 12, width: '100%' }}>
      {LADDER_STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < highlightStep;
        const active = step === highlightStep;
        const reveal = interpolate(enter, [0, 1], [0, 1]);
        return (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '14px 22px',
              borderRadius: 16,
              background: active ? money.accent : done ? money.surface : 'transparent',
              border: `2px solid ${active ? money.accent : money.surfaceEdge}`,
              // On the dark palette a pending rung at 0.1-0.5 alpha still read,
              // because bright type on near-black starts from a huge contrast
              // ratio. Ink on cream does not: the same values rendered as
              // ghosts. Pending rungs are meant to be quiet, not invisible —
              // they are the "there are six more steps" promise.
              opacity: active ? 1 : done ? 0.9 : 0.45 * reveal + 0.35,
              transform: `scale(${active ? 0.96 + enter * 0.04 : 1})`,
            }}
          >
            <span
              style={{
                fontFamily: moneyFonts.display,
                fontWeight: 800,
                fontSize: 30,
                color: active ? money.text : money.textDim,
                width: 34,
              }}
            >
              {step}
            </span>
            <span
              style={{
                fontFamily: moneyFonts.display,
                fontSize: 38,
                color: money.text,
                fontWeight: active ? 800 : 400,
              }}
            >
              {label}
            </span>
            {done && <span style={{ marginLeft: 'auto', color: money.growth, fontSize: 34 }}>✓</span>}
          </div>
        );
      })}
    </div>
  );
};

/**
 * A sweeping arc for anything about duration.
 *
 * The sweep spans the beat's OWN length, passed in explicitly. Relying on
 * `useVideoConfig().durationInFrames` here would be wrong — inside a Sequence
 * that is the composition duration, not the sequence's — and a fixed sweep
 * window left the ring sitting complete and motionless for the rest of the beat.
 */
const Clock: React.FC<{ label?: string; beatDurationSec: number }> = ({ label, beatDurationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sweep = interpolate(frame, [0, Math.max(1, beatDurationSec * fps)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const r = 150;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={380} height={380} viewBox="0 0 380 380">
        <circle cx={190} cy={190} r={r} fill="none" stroke={money.surface} strokeWidth={26} />
        <circle
          cx={190}
          cy={190}
          r={r}
          fill="none"
          stroke={money.accent}
          strokeWidth={26}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - sweep)}
          transform="rotate(-90 190 190)"
        />
      </svg>
      {label && (
        <div
          style={{
            marginTop: 8,
            fontFamily: moneyFonts.display,
            fontSize: moneyType.bigNumberLabel,
            color: money.text,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

export const Visual: React.FC<{ spec: VisualSpec; beatDurationSec: number }> = ({
  spec,
  beatDurationSec,
}) => {
  const body = (() => {
    switch (spec.kind) {
      case 'bigNumber':
        return <BigNumber value={spec.value} label={spec.label} />;
      case 'compare':
        return <Compare a={spec.a} b={spec.b} aLabel={spec.aLabel} bLabel={spec.bLabel} />;
      case 'steps':
        return <Steps items={spec.items} />;
      case 'ladder':
        return <Ladder highlightStep={spec.highlightStep} />;
      case 'clock':
        return <Clock label={spec.label} beatDurationSec={beatDurationSec} />;
    }
  })();

  return (
    <div
      style={{
        position: 'absolute',
        left: CONTENT.left,
        width: CONTENT.width,
        // Spans from just under the beat text down to just above the CAPTION,
        // and centres within that. Derived rather than typed: this box was a
        // hardcoded 880px tall, sized for a layout that had no captions, and
        // when captions returned it overlapped them by 150px — the plate landed
        // squarely on the ladder's lit rung.
        top: VISUAL_TOP,
        height: CAPTION_TOP - VISUAL_TOP - 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {body}
    </div>
  );
};
