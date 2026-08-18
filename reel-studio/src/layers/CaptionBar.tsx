import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CANVAS, SAFE_BOTTOM, SAFE_X } from '../lib/layout';
import { CAPTION, money, moneyFonts, softShadow } from '../lib/moneyTheme';

/**
 * The sound-off channel.
 *
 * Most of a reel's first watch happens muted, so whatever the caption does not
 * say is not received. Stage 3.6 removed captions on the reasoning that the big
 * beat text carried the message; watching a 50k-follower channel in the same
 * niche showed the opposite — two lines running continuously is how a viewer
 * gets the whole argument without audio, and it is what makes a reel worth
 * sending to someone.
 *
 * This is NOT a transcript. The voice speaks Hindi; a literal transcript would
 * put Devanagari back on screen, which needs a 647 KB font and was explicitly
 * rejected on how it looks at display sizes. Instead each beat carries an
 * English `caption` — the same message written for a reader rather than a
 * listener. Sound-on and sound-off each get a version made for them.
 *
 * The whole caption shows for the whole beat, wrapped to at most two lines —
 * it is NOT revealed word by word or in chunks. The first attempt chunked it
 * into five-word groups and the result split noun phrases across a cut
 * ("Keep it in a separate" / "account from your salary"), which is harder to
 * read than the static line it replaced. The beat is only a few seconds; a
 * reader takes it in at a glance and then watches the visual.
 */

export const CaptionBar: React.FC<{ text: string; beatDurationSec: number }> = ({
  text,
  beatDurationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!text.trim()) return null;

  // A quick fade in, and out again just before the beat ends so the swap to the
  // next caption is a clean replace rather than two plates crossing. The beat's
  // own duration has to be passed in: useVideoConfig().durationInFrames inside a
  // <Sequence> reports the whole COMPOSITION length, not the sequence's — the
  // mistake that once left the clock sweep frozen for an entire reel.
  const total = Math.max(1, Math.round(beatDurationSec * fps));
  const opacity = interpolate(
    frame,
    [0, 4, Math.max(5, total - 4), total],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_X,
        right: SAFE_X,
        // Sits ABOVE the disclaimer, which itself sits above the platform
        // chrome line. Bottom-anchored so one- and two-line captions both grow
        // upward and neither can drift into the chrome.
        bottom: SAFE_BOTTOM + CAPTION.liftAboveSafe,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: moneyFonts.display,
          fontSize: CAPTION.fontSize,
          fontWeight: 700,
          lineHeight: CAPTION.lineHeight,
          textAlign: 'center',
          color: money.text,
          // A visible plate, not a text shadow. The caption sits over whatever
          // the visual is drawing, and a shadow alone stops being legible over a
          // bright figure. The first version used the background colour itself,
          // which made the plate invisible and left the text floating.
          background: money.surface,
          border: `${CAPTION.borderWidth}px solid ${money.surfaceEdge}`,
          padding: `${CAPTION.padY}px 30px`,
          borderRadius: 16,
          boxShadow: softShadow,
          maxWidth: CANVAS.width - SAFE_X * 2 - 40,
          opacity,
        }}
      >
        {text}
      </span>
    </div>
  );
};
