/**
 * WheatPixLogo
 * ─────────────────────────────────────────────────────────────
 * V1 brand wordmark for WheatPix — crop protection intelligence.
 *
 * Typography:  "Wheat" → DM Serif Display (serif)
 *              "Pıx"  → Space Mono Bold (monospace)
 *              The dot on the i is a hard square pixel.
 *
 * Usage:
 *   <WheatPixLogo />
 *   <WheatPixLogo size="lg" variant="light" showIcon />
 *   <WheatPixLogo size="sm" variant="green" showIcon={false} />
 *
 * Props:
 *   size      'xl' | 'lg' | 'md' | 'sm' | 'xs'   default 'md'
 *   variant   'dark' | 'light' | 'white' | 'green' default 'dark'
 *   showIcon  boolean                               default false
 *   className string
 *   style     object
 * ─────────────────────────────────────────────────────────────
 */

'use client';

import { useEffect } from 'react';

// ─── Design tokens ───────────────────────────────────────────
const SIZES = {
  xl: { wheat: 72, gap: 18, iconH: 100 },
  lg: { wheat: 52, gap: 14, iconH:  72 },
  md: { wheat: 36, gap: 11, iconH:  50 },
  sm: { wheat: 24, gap:  8, iconH:  34 },
  xs: { wheat: 16, gap:  6, iconH:  22 },
};

const VARIANTS = {
  dark:  { wheat: '#F5EDDA', pix: '#D4890A', grainTop: '#F5C842', grainMid: '#D4890A', grainBot: '#8B5E04', rachis: '#D4890A', stem: '#6B3E06' },
  light: { wheat: '#1A3308', pix: '#8B5E04', grainTop: '#C57E08', grainMid: '#8B5E04', grainBot: '#5A3A02', rachis: '#8B5E04', stem: '#4A2A04' },
  white: { wheat: '#0E1A07', pix: '#8B5E04', grainTop: '#C57E08', grainMid: '#8B5E04', grainBot: '#5A3A02', rachis: '#8B5E04', stem: '#4A2A04' },
  green: { wheat: '#F5EDDA', pix: '#F5C842', grainTop: '#F5C842', grainMid: '#D4890A', grainBot: '#8B5E04', rachis: '#D4890A', stem: '#6B3E06' },
};

// ─── Inject Google Fonts + dot styles once ───────────────────
const STYLE_ID = 'wheatpix-logo-styles';

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  // Google Fonts link
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Space+Mono:wght@700&display=swap';
  document.head.appendChild(link);

  // Square-dot styles
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .wp-pix {
      font-family: 'Space Mono', monospace;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1;
      position: relative;
      display: inline-block;
    }
    /* Square dot — centered over the dotless ı */
    .wp-pix::before {
      content: '';
      display: block;
      position: absolute;
      background: currentColor;
      width:  0.115em;
      height: 0.115em;
      left:   0.843em;
      top:    0.08em;
    }
    .wp-wheat {
      font-family: 'DM Serif Display', serif;
      letter-spacing: -0.02em;
      line-height: 1;
    }
  `;
  document.head.appendChild(style);
}

// ─── Pixel Wheat Icon ────────────────────────────────────────
function WheatIcon({ height, colors }) {
  const { grainTop, grainMid, grainBot, rachis, stem } = colors;
  const id = `wpg-${grainTop.replace('#', '')}`;

  return (
    <svg
      viewBox="0 0 40 67"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ height, width: 'auto', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={grainTop} />
          <stop offset="55%"  stopColor={grainMid} />
          <stop offset="100%" stopColor={grainBot} />
        </linearGradient>
      </defs>
      {/* tip */}
      <rect x="14" y="0"  width="7" height="7" rx="1.5" fill={`url(#${id})`} opacity=".75" />
      {/* pair 1 */}
      <rect x="7"  y="9"  width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      <rect x="14" y="9"  width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      <rect x="21" y="9"  width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      {/* rachis */}
      <rect x="14" y="18" width="7" height="7" rx="1.5" fill={rachis} opacity=".38" />
      {/* pair 2 — widest */}
      <rect x="0"  y="27" width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      <rect x="7"  y="27" width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      <rect x="14" y="27" width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      <rect x="21" y="27" width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      <rect x="28" y="27" width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      {/* rachis */}
      <rect x="14" y="36" width="7" height="7" rx="1.5" fill={rachis} opacity=".38" />
      {/* pair 3 */}
      <rect x="7"  y="45" width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      <rect x="14" y="45" width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      <rect x="21" y="45" width="7" height="7" rx="1.5" fill={`url(#${id})`} />
      {/* stem */}
      <rect x="14" y="54" width="7" height="7" rx="1.5" fill={stem} opacity=".6" />
      {/* glints */}
      <circle cx="17.5" cy="3.5"  r="1.4" fill="#FDF0A0" opacity=".5" />
      <circle cx="17.5" cy="30.5" r="1.8" fill="#FDF0A0" opacity=".3" />
    </svg>
  );
}

// ─── Main component ──────────────────────────────────────────
export default function WheatPixLogo({
  size = 'md',
  variant = 'dark',
  showIcon = false,
  className = '',
  style = {},
}) {
  useEffect(() => { injectStyles(); }, []);

  const s = SIZES[size]   ?? SIZES.md;
  const c = VARIANTS[variant] ?? VARIANTS.dark;

  return (
    <div
      className={`wp-lockup ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: 1,
        gap: 0,
        ...style,
      }}
    >
      {showIcon && (
        <div style={{ marginRight: s.gap }}>
          <WheatIcon height={s.iconH} colors={c} />
        </div>
      )}

      <span
        className="wp-wheat"
        style={{ fontSize: s.wheat, color: c.wheat }}
      >
        Wheat
      </span>

      {/* dotless ı (U+0131) — square dot injected via ::before */}
      <span
        className="wp-pix"
        style={{ fontSize: s.wheat, color: c.pix }}
      >
        {/* P + dotless-i + x */}
        P&#x0131;x
      </span>
    </div>
  );
}

// ─── Named size/variant exports for convenience ──────────────
export const WheatPixDark  = (props) => <WheatPixLogo variant="dark"  {...props} />;
export const WheatPixLight = (props) => <WheatPixLogo variant="light" {...props} />;
export const WheatPixWhite = (props) => <WheatPixLogo variant="white" {...props} />;
export const WheatPixGreen = (props) => <WheatPixLogo variant="green" {...props} />;
