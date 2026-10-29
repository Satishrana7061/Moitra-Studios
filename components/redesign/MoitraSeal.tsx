import React, { useState } from 'react';

// The studio's logo (chosen by the owner, 28 Oct 2026): the treaty seal - a wax seal with two
// clasped hands under Mitra's rising sun. It stamps down when it first appears and again when
// hovered. The same drawing is public/brand/moitra-seal.svg and the game's MoitraSeal.png.
const MoitraSeal: React.FC<{ size: number; className?: string; label?: string }> = ({ size, className = '', label = 'Moitra Studios' }) => {
  const [play, setPlay] = useState(0);
  const id = React.useId().replace(/:/g, '');
  return (
    <span
      className={`ms-seal ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setPlay(p => p + 1)}
    >
      <span key={play} className="ms-seal-ripple" aria-hidden="true" />
      <svg key={`s${play}`} className="ms-seal-svg" viewBox="0 0 200 200" width={size} height={size} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
        <defs>
          <radialGradient id={`wax${id}`} cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#d4452c" /><stop offset=".6" stopColor="#8e1f17" /><stop offset="1" stopColor="#4f0d0a" />
          </radialGradient>
        </defs>
        <path d="M100 6 C116 10 124 4 138 14 C152 22 162 18 172 32 C182 46 194 50 194 68 C194 84 200 94 194 110 C188 126 196 138 184 152 C172 166 170 178 152 186 C136 194 126 200 108 196 C92 192 80 200 64 190 C48 182 36 184 26 168 C16 154 6 148 6 130 C6 114 0 102 6 86 C12 70 6 58 18 44 C30 30 32 18 50 12 C66 6 82 2 100 6 Z" fill={`url(#wax${id})`} />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#f6c66a" strokeWidth="2" opacity=".7" />
        <g transform="translate(0 10)">
          <g className="ms-seal-rays">
            <path d="M100 30 V42 M64 40 L70 50 M136 40 L130 50 M40 64 L50 70 M160 64 L150 70" stroke="#ffd18a" strokeWidth="4" strokeLinecap="round" opacity=".85" />
          </g>
          <path d="M58 92 A42 42 0 0 1 142 92" fill="none" stroke="#ffd18a" strokeWidth="5" strokeLinecap="round" />
          <path className="ms-seal-left" d="M52 132 C62 118 74 112 92 112 L106 112 C112 112 112 120 106 120 L92 120" fill="none" stroke="#ffe7b8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path className="ms-seal-right" d="M148 132 C138 118 124 112 112 116 L96 124 C90 127 92 134 98 132 L110 128" fill="none" stroke="#ffd18a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
      <span key={`g${play}`} className="ms-seal-glint" aria-hidden="true" />
    </span>
  );
};

export default MoitraSeal;
