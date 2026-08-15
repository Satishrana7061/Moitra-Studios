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
      fontFamily: moneyFonts.hindi,
      fontSize: moneyType.seriesBar,
      color: money.textDim,
    }}
  >
    <span style={{ color: money.gold, fontWeight: 700 }}>{seriesName}</span>
    <span style={{ opacity: 0.4 }}>·</span>
    <span>कदम {stepNumber}</span>
    <span style={{ opacity: 0.4 }}>·</span>
    <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
      {stepTitle}
    </span>
    <span
      style={{
        fontFamily: moneyFonts.display,
        fontWeight: 700,
        color: money.text,
        background: money.surface,
        border: `2px solid ${money.surfaceEdge}`,
        borderRadius: 999,
        padding: '6px 20px',
      }}
    >
      #{episode}
    </span>
  </div>
);
