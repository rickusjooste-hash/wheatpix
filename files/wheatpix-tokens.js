/**
 * wheatpix-tokens.js
 * ─────────────────────────────────────────────────────────────
 * Brand design tokens for WheatPix.
 * Import wherever you need consistent colours, fonts, spacing.
 *
 * Usage:
 *   import { colors, fonts, logo } from '@/lib/wheatpix-tokens'
 * ─────────────────────────────────────────────────────────────
 */

// ─── Colours ─────────────────────────────────────────────────
export const colors = {

  // Core brand palette
  harvestGold:  '#F5C842',   // primary accent — highlights, CTAs
  amberField:   '#D4890A',   // "Pix" wordmark on dark
  darkChaff:    '#8B5E04',   // "Pix" wordmark on light
  canopyGreen:  '#2D5A1B',   // secondary brand green
  nightField:   '#0E1A07',   // darkest bg — primary dark surface
  deepField:    '#1A2E0D',   // slightly lighter dark surface
  parchment:    '#F5EDDA',   // light bg — "Wheat" on light
  cream:        '#FBF6EC',   // off-white surface
  richSoil:     '#3A2006',   // dark brown — borders, dividers
  cerealSky:    '#A8C5DA',   // accent blue — sky/water contexts

  // Semantic aliases
  background: {
    dark:  '#0E1A07',
    mid:   '#2D5A1B',
    light: '#F5EDDA',
    white: '#FFFFFF',
  },

  text: {
    onDark:  '#F5EDDA',      // "Wheat" on dark bg
    onLight: '#1A3308',      // "Wheat" on light bg
    onWhite: '#0E1A07',      // "Wheat" on white bg
    onGreen: '#F5EDDA',      // "Wheat" on canopy green
    muted:   'rgba(245,237,218,0.5)',
  },

  // Grain gradient stops (for SVG icons)
  grain: {
    dark: {
      top: '#F5C842',
      mid: '#D4890A',
      bot: '#8B5E04',
      stem: '#6B3E06',
    },
    light: {
      top: '#C57E08',
      mid: '#8B5E04',
      bot: '#5A3A02',
      stem: '#4A2A04',
    },
  },

  // Status / data colours for dashboard use
  status: {
    fusariumHigh:   '#C0392B',
    fusariumMed:    '#E67E22',
    fusariumLow:    '#F5C842',
    aphidAlert:     '#8E44AD',
    rustRisk:       '#D35400',
    healthy:        '#27AE60',
    unknown:        '#7F8C8D',
  },
};

// ─── Typography ──────────────────────────────────────────────
export const fonts = {
  serif:  "'DM Serif Display', serif",         // "Wheat" wordmark
  mono:   "'Space Mono', monospace",            // "Pix" wordmark + labels
  sans:   "'Outfit', sans-serif",               // body / UI

  // Google Fonts import URL (add to layout.js or _document.js)
  googleFontsUrl:
    'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Space+Mono:wght@700&family=Outfit:wght@300;400;500;600;700;900&display=swap',
};

// ─── Logo sizing scale ────────────────────────────────────────
// wheat = DM Serif font-size in px
// pix   = Space Mono font-size in px (same as wheat)
// iconH = pixel wheat icon height in px
export const logo = {
  sizes: {
    xl: { wheat: 72, pix: 72, iconH: 100, iconGap: 18 },
    lg: { wheat: 52, pix: 52, iconH:  72, iconGap: 14 },
    md: { wheat: 36, pix: 36, iconH:  50, iconGap: 11 },
    sm: { wheat: 24, pix: 24, iconH:  34, iconGap:  8 },
    xs: { wheat: 16, pix: 16, iconH:  22, iconGap:  6 },
  },

  // Square dot on the i — em-unit offsets for ::before pseudo
  // Calibrated to Space Mono Bold metrics
  squareDot: {
    width:  '0.115em',
    height: '0.115em',
    left:   '0.843em',   // centers over dotless ı
    top:    '0.08em',
  },

  variants: {
    dark:  { wheat: colors.text.onDark,  pix: colors.amberField  },
    light: { wheat: colors.text.onLight, pix: colors.darkChaff   },
    white: { wheat: colors.text.onWhite, pix: colors.darkChaff   },
    green: { wheat: colors.text.onGreen, pix: colors.harvestGold },
  },
};

// ─── Spacing / border-radius ──────────────────────────────────
export const spacing = {
  // pixel grid — everything snaps to multiples of 8
  unit: 8,
  xs:    4,
  sm:    8,
  md:   16,
  lg:   24,
  xl:   40,
  xxl:  64,
};

export const radius = {
  sm:   4,
  md:   8,
  lg:  12,
  xl:  16,
  pill: 9999,
};

// ─── CSS custom properties (paste into :root) ─────────────────
export const cssVars = `
  --wp-color-harvest-gold:  ${colors.harvestGold};
  --wp-color-amber-field:   ${colors.amberField};
  --wp-color-dark-chaff:    ${colors.darkChaff};
  --wp-color-canopy-green:  ${colors.canopyGreen};
  --wp-color-night-field:   ${colors.nightField};
  --wp-color-parchment:     ${colors.parchment};
  --wp-color-cereal-sky:    ${colors.cerealSky};
  --wp-color-rich-soil:     ${colors.richSoil};

  --wp-font-serif:  ${fonts.serif};
  --wp-font-mono:   ${fonts.mono};
  --wp-font-sans:   ${fonts.sans};
`;

// ─── Tailwind theme extension (paste into tailwind.config.js) ─
export const tailwindExtension = {
  colors: {
    'wp-gold':    colors.harvestGold,
    'wp-amber':   colors.amberField,
    'wp-chaff':   colors.darkChaff,
    'wp-green':   colors.canopyGreen,
    'wp-night':   colors.nightField,
    'wp-parchment': colors.parchment,
    'wp-sky':     colors.cerealSky,
    'wp-soil':    colors.richSoil,
  },
  fontFamily: {
    'wp-serif': ['DM Serif Display', 'serif'],
    'wp-mono':  ['Space Mono', 'monospace'],
    'wp-sans':  ['Outfit', 'sans-serif'],
  },
};
