import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors } from '../lib/theme';
import { ALL_STATES, STATE_PATHS, VIEW_BOX, centroidOf, resolveState } from '../lib/states';

/**
 * The India map, styled to match the game's own board (Game FinalGraphics/map.png):
 * a cyan halo around the landmass, a hard black offset shadow under it, flat
 * saturated fills and chunky black borders.
 *
 * Unlike the shipped map.png — which is a flat raster and therefore unusable for
 * this format — this is vector, so the scenario's state can be lifted out,
 * recoloured and pulsed.
 */

export type IndiaMapProps = {
  /** State the scenario is about. Unresolvable names render an un-highlighted map. */
  focusState?: string | null;
  /** Frame at which the highlight animates in, relative to the sequence. */
  highlightAtFrame?: number;
  width: number;
  height: number;
};

export const IndiaMap: React.FC<IndiaMapProps> = ({
  focusState,
  highlightAtFrame = 0,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const focus = useMemo(() => resolveState(focusState), [focusState]);
  const focusPath = focus ? STATE_PATHS[focus] : null;
  const centroid = focus ? centroidOf(focus) : null;

  // Highlight lifts off the board and settles, rather than snapping on.
  const lift = spring({
    frame: frame - highlightAtFrame,
    fps,
    config: { damping: 14, mass: 0.7, stiffness: 110 },
  });

  // Slow continuous breathe so the focused state never sits perfectly still.
  const breathe = Math.sin((frame / fps) * 2.2) * 0.5 + 0.5;
  const glowOpacity = interpolate(breathe, [0, 1], [0.45, 0.95]);
  const focusScale = 1 + lift * 0.06;

  return (
    <svg
      viewBox={VIEW_BOX}
      width={width}
      height={height}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <filter id="seaGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="focusGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.goldBright} />
          <stop offset="100%" stopColor={colors.orange} />
        </linearGradient>
      </defs>

      {/* Cyan halo — the landmass silhouette, blurred. */}
      <g filter="url(#seaGlow)" opacity={0.9}>
        {ALL_STATES.map((name) => (
          <path
            key={`halo-${name}`}
            d={STATE_PATHS[name]}
            fill={colors.mapGlow}
            stroke={colors.mapGlow}
            strokeWidth={18}
          />
        ))}
      </g>

      {/* Hard black offset shadow, the game's signature. */}
      <g transform="translate(0, 12)">
        {ALL_STATES.map((name) => (
          <path key={`shadow-${name}`} d={STATE_PATHS[name]} fill={colors.outline} />
        ))}
      </g>

      {/* Idle states. */}
      <g>
        {ALL_STATES.map((name) => (
          <path
            key={name}
            d={STATE_PATHS[name]}
            fill={name === focus ? 'transparent' : colors.mapIdle}
            stroke={colors.mapIdleStroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        ))}
      </g>

      {/* The focused state, lifted and lit. */}
      {focusPath && centroid && (
        <g
          transform={`translate(${centroid[0]} ${centroid[1]}) scale(${focusScale}) translate(${-centroid[0]} ${-centroid[1]})`}
          opacity={lift}
        >
          <path
            d={focusPath}
            fill={colors.goldBright}
            filter="url(#focusGlow)"
            opacity={glowOpacity * 0.8}
          />
          <path d={focusPath} fill={colors.outline} transform="translate(0, 10)" />
          <path
            d={focusPath}
            fill="url(#focusFill)"
            stroke={colors.outline}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
};
