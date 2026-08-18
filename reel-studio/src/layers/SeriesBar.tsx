import React from 'react';
import { SAFE_X } from '../lib/layout';
import { money, moneyFonts, moneyType } from '../lib/moneyTheme';

/**
 * Series identity: the name plus the episode number.
 *
 * The episode number is the point. A standalone clip gives a viewer no reason
 * to follow; "एपिसोड #47" of a numbered ladder implies 46 they missed and one
 * more tomorrow, which is what converts a view into a subscription.
 */
export const SeriesBar: React.FC<{
  seriesName: string;
  episode: number;
  stepNumber: number;
  stepTitle: string;
}> = ({ seriesName, episode, stepNumber, stepTitle }) => (
  <div
    style={{
      position: 'absolute',
      top: 96,
      left: SAFE_X,
      right: SAFE_X,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      fontFamily: moneyFonts.display,
      fontSize: moneyType.seriesBar,
      color: money.textDim,
    }}
  >
    {/*
      Ink, not the accent. On the dark palette the accent carried this line at
      32px; on paper it measures about 2.6:1 against the ground, which is below
      readable for text this size. The accent moves to the episode pill, where
      it is a FILL and can be as saturated as it likes.
    */}
    <span style={{ color: money.text, fontWeight: 800 }}>{seriesName}</span>
    <span style={{ opacity: 0.4 }}>·</span>
    <span>Step {stepNumber}</span>
    <span style={{ opacity: 0.4 }}>·</span>
    <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
      {stepTitle}
    </span>
    <span
      style={{
        fontFamily: moneyFonts.display,
        fontWeight: 800,
        // Ink on the accent — the one saturated shape in the top third. The
        // episode number is what turns a view into a follow ("there are 46 I
        // missed"), so it is the element that earns the colour.
        color: money.text,
        background: money.accent,
        borderRadius: 999,
        padding: '6px 20px',
      }}
    >
      #{episode}
    </span>
  </div>
);
