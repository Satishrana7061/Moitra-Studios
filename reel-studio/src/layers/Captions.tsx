import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { SAFE_X, SLOTS } from '../lib/layout';
import { money, moneyFonts, moneyType } from '../lib/moneyTheme';
import type { MoneyCaption } from './captionTypes';

/**
 * Word-synced captions.
 *
 * These are driven by the real per-word timestamps ElevenLabs returns from
 * /with-timestamps (elevenLabsService.ts:131), not by dividing the duration
 * evenly. That distinction is the whole reason captions land on the spoken word
 * instead of drifting — the complaint that "the audio text" never came out
 * right in the old build.
 *
 * Words are grouped into pages of 4-5 so the viewer reads a phrase rather than
 * tracking a single word, and the word currently being spoken is lit.
 */

const WORDS_PER_PAGE = 4;

type Page = { words: MoneyCaption[]; startSec: number; endSec: number };

const paginate = (captions: MoneyCaption[]): Page[] => {
  const pages: Page[] = [];
  for (let i = 0; i < captions.length; i += WORDS_PER_PAGE) {
    const words = captions.slice(i, i + WORDS_PER_PAGE);
    if (!words.length) continue;
    pages.push({
      words,
      startSec: words[0].startSec,
      // Hold the page until the next one starts so there is never a blank gap.
      endSec: captions[i + WORDS_PER_PAGE]?.startSec ?? words[words.length - 1].endSec + 0.4,
    });
  }
  return pages;
};

export const Captions: React.FC<{ captions: MoneyCaption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const pages = useMemo(() => paginate(captions), [captions]);
  const page = pages.find((p) => t >= p.startSec && t < p.endSec);
  if (!page) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_X,
        right: SAFE_X,
        top: SLOTS.captions.top,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0 16px',
        fontFamily: moneyFonts.hindi,
        fontSize: moneyType.caption,
        fontWeight: 700,
        lineHeight: 1.3,
        textAlign: 'center',
      }}
    >
      {page.words.map((w, i) => {
        const spoken = t >= w.startSec && t < w.endSec;
        return (
          <span
            key={`${w.word}-${i}-${w.startSec}`}
            style={{
              color: spoken ? money.gold : money.text,
              textShadow: '0 4px 18px rgba(0,0,0,0.85)',
              transform: spoken ? 'translateY(-2px)' : 'none',
              display: 'inline-block',
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
