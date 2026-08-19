import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CANVAS, CONTENT, SAFE_BOTTOM, SAFE_X } from './lib/layout';
import { loadFonts } from './lib/fonts';
import { money, moneyFonts, moneyType } from './lib/moneyTheme';
import { MONEY_OUTRO_SEC, type MoneyStoryboard } from './lib/moneySchema';
import { Visual } from './segments/Visuals';
import { SeriesBar } from './layers/SeriesBar';
import { CaptionBar } from './layers/CaptionBar';

/**
 * Hisaab Kitab — the money composition.
 *
 * Structure: hook card (0-3s) → one beat per idea, each with a moving visual →
 * closing CTA. No frame is ever static: something is entering, counting or
 * sweeping at all times, which is the single biggest difference from the
 * previous ffmpeg build's flat rectangle.
 *
 * Everything rendered is English. The Hindi lives only in the voiceover, which
 * is sent to ElevenLabs and never drawn — Devanagari read poorly at these
 * display sizes. Word-level timings are still produced upstream, because they
 * set the beat boundaries. Each beat also carries an English `caption` — the
 * sound-off version of what the voice is saying — rendered by CaptionBar.
 */

/**
 * The page itself: a ruled ledger, which is what "hisaab kitab" means.
 *
 * Three layers, none of them decoration. The cream wash is the paper. The
 * horizontal rules give the frame a structure to hang numbers on, so a figure
 * reads as an ENTRY rather than as floating type. The red margin line down the
 * left is the detail that makes it unmistakably an account book rather than
 * generic notepaper — every register in India has one.
 *
 * The rules drift upward by a fraction of their own spacing across the whole
 * reel. Enough that the ground is never perfectly still; far too slow to read
 * as movement, which would fight the numbers.
 */
const Background: React.FC<{ variant: 'a' | 'b' | 'c' }> = ({ variant }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const drift = interpolate(frame, [0, durationInFrames], [0, 1]);
  const angle = { a: 165, b: 200, c: 135 }[variant];
  const RULE_GAP = 108;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${money.bgLift} 0%, ${money.bg} 60%, ${money.surface} 100%)`,
      }}
    >
      {/* Ruled lines. */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent ${RULE_GAP - 2}px, ${money.rule} ${RULE_GAP - 2}px, ${money.rule} ${RULE_GAP}px)`,
          transform: `translateY(${-drift * RULE_GAP}px)`,
        }}
      />

      {/* The margin line. */}
      <div
        style={{
          position: 'absolute',
          left: SAFE_X - 28,
          top: 0,
          bottom: 0,
          width: 3,
          background: money.margin,
          opacity: 0.34,
        }}
      />

      {/*
        The bound edge. A ledger is a BOOK, and the strip where the page is
        stitched in is the detail that says so — flat cream with rules could be
        a printed form, but a shadowed gutter and a row of stitch marks could
        only be a diary. Left side, outside the safe area, so it costs no space.
      */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 26,
          background: `linear-gradient(to right, rgba(31,41,51,0.16), rgba(31,41,51,0.04) 60%, transparent)`,
        }}
      />
      {/*
        Stitches stop at the platform-UI line rather than running the full page.
        A real diary's would carry on, but everything below that line is painted
        over by Instagram's chrome, so those stitches would be invisible to the
        viewer while still counting as ink inside the reserved band — which is
        exactly what check-safe-area.mjs flagged on the first attempt. It cannot
        tell page furniture from content, and it should not have to: the rule is
        that nothing is drawn down there.
      */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 11,
            top: 150 + i * ((CANVAS.height - SAFE_BOTTOM - 220) / 6),
            width: 4,
            height: 34,
            borderRadius: 2,
            background: money.text,
            opacity: 0.18,
          }}
        />
      ))}

      {/*
        Paper grain. Real paper is fibrous, and a perfectly flat fill is the
        single biggest tell that a "notebook" was made in a browser. Two very
        low-opacity repeating gradients at odd angles read as tooth without
        costing a texture file or a decode — and staying under ~4% keeps it
        below the threshold where it starts competing with the numbers, which
        are what the frame is for.
      */}
      <AbsoluteFill
        style={{
          opacity: 0.035,
          backgroundImage: `repeating-linear-gradient(37deg, ${money.text} 0px, transparent 1px, transparent 3px),
                            repeating-linear-gradient(122deg, ${money.text} 0px, transparent 1px, transparent 4px)`,
        }}
      />

      {/*
        Paper is never evenly lit. A warm vignette does the work a glow did on
        the dark palette — it separates the centre without adding a colour the
        page could not have.
      */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(72% 48% at 50% ${34 + drift * 4}%, ${money.accent}14, transparent 68%),
                       radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(31,41,51,0.09) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const HookCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.5, stiffness: 130 } });

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_X,
        right: SAFE_X,
        // Sits lower than a beat's text: during the hook there is no visual
        // below it, so anchoring at the beat position leaves the frame
        // bottom-heavy with dead space.
        top: 560,
        textAlign: 'center',
        fontFamily: moneyFonts.display,
        fontSize: moneyType.hook,
        fontWeight: 800,
        lineHeight: 1.18,
        color: money.text,
        textShadow: '0 2px 0 rgba(247, 241, 226, 0.9)',
        transform: `scale(${0.9 + enter * 0.1})`,
        opacity: enter,
      }}
    >
      {text}
    </div>
  );
};

const BeatText: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 15, mass: 0.5, stiffness: 130 } });

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_X,
        right: SAFE_X,
        top: 300,
        textAlign: 'center',
        fontFamily: moneyFonts.display,
        fontSize: moneyType.beatText,
        fontWeight: 800,
        lineHeight: 1.2,
        color: money.text,
        textShadow: '0 2px 0 rgba(247, 241, 226, 0.9)',
        transform: `translateY(${(1 - enter) * 26}px)`,
        opacity: enter,
      }}
    >
      {text}
    </div>
  );
};

const CtaCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.6, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          maxWidth: CONTENT.width,
          textAlign: 'center',
          fontFamily: moneyFonts.display,
          fontSize: moneyType.hook,
          fontWeight: 800,
          color: money.text,
          lineHeight: 1.2,
          transform: `scale(${0.92 + enter * 0.08})`,
          opacity: enter,
          // Lifted above the platform action rail.
          marginBottom: SAFE_BOTTOM * 0.5,
        }}
      >
        {text}
        <div
          style={{
            marginTop: 36,
            fontFamily: moneyFonts.display,
            fontSize: 40,
            color: money.accent,
            fontWeight: 700,
          }}
        >
          ↓ Comment below
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Always on screen. Compliance furniture, deliberately quiet but never absent. */
const DisclaimerBar: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: 'absolute',
      left: SAFE_X,
      right: SAFE_X,
      // INSIDE the safe band, not below it. `height - SAFE_BOTTOM` is the first
      // row the platform chrome may cover, so the disclaimer sits above that
      // line -- it is the compliance element and must never be occluded.
      top: CANVAS.height - SAFE_BOTTOM - 44,
      textAlign: 'center',
      fontFamily: moneyFonts.display,
      fontSize: moneyType.disclaimer,
      color: money.legal,
      letterSpacing: '0.02em',
    }}
  >
    {text}
  </div>
);

export const MoneyReel: React.FC<MoneyStoryboard> = (board) => {
  loadFonts();
  const { fps } = useVideoConfig();
  const sec = (s: number) => Math.round(s * fps);

  const lastBeatEnd = board.beats.at(-1)?.endSec ?? 0;
  const ctaStart = Math.max(board.audio.durationSec, lastBeatEnd);

  return (
    <AbsoluteFill style={{ backgroundColor: money.bg }}>
      <Background variant={board.brand.layoutVariant} />

      {board.audio.src && (
        <Audio
          src={board.audio.src.startsWith('http') ? board.audio.src : staticFile(board.audio.src)}
        />
      )}

      <SeriesBar
        seriesName={board.brand.seriesName}
        episode={board.episode}
        stepNumber={board.stepNumber}
        stepTitle={board.stepTitle}
      />

      {/* Hook holds until the first beat begins. */}
      <Sequence durationInFrames={sec(board.beats[0]?.startSec ?? 3)}>
        <HookCard text={board.hook} />
      </Sequence>

      {board.beats.map((beat, i) => (
        <Sequence
          key={`${beat.onScreen}-${i}`}
          from={sec(beat.startSec)}
          durationInFrames={Math.max(1, sec(beat.endSec - beat.startSec))}
        >
          <BeatText text={beat.onScreen} />
          <Visual spec={beat.visual} beatDurationSec={beat.endSec - beat.startSec} />
          {beat.caption && (
            <CaptionBar text={beat.caption} beatDurationSec={beat.endSec - beat.startSec} />
          )}
        </Sequence>
      ))}

      <Sequence from={sec(ctaStart)} durationInFrames={sec(MONEY_OUTRO_SEC)}>
        <CtaCard text={board.cta} />
      </Sequence>

      {/*
        A reel that draws a growth rate says so, in its own words, for its whole
        length. Derived from the storyboard rather than left to whoever writes
        the brand block: the protection and the thing it protects against are
        then impossible to separate, and no future edit can drop one while
        keeping the other.
      */}
      <DisclaimerBar
        text={
          board.beats.some((b) => b.visual?.kind === 'compound')
            ? 'Illustration only — returns are not guaranteed and can be negative'
            : board.brand.disclaimer
        }
      />
    </AbsoluteFill>
  );
};
