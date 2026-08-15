import React from 'react';
import { Composition } from 'remotion';
import { CANVAS } from './lib/layout';
import { MoneyReel } from './MoneyReel';
import { moneyDurationSec, moneyStoryboardSchema, type MoneyStoryboard } from './lib/moneySchema';
import fixture from '../fixtures/money-sample.json';

/**
 * Duration always follows the real voiceover length rather than a fixed guess,
 * so a longer script simply produces a longer reel instead of being cut off.
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="MoneyReel"
      component={MoneyReel}
      width={CANVAS.width}
      height={CANVAS.height}
      fps={CANVAS.fps}
      durationInFrames={30}
      defaultProps={fixture as unknown as MoneyStoryboard}
      calculateMetadata={({ props }) => {
        const board = moneyStoryboardSchema.parse(props);
        return {
          durationInFrames: Math.ceil(moneyDurationSec(board) * CANVAS.fps),
          props: board,
        };
      }}
    />
  </>
);
