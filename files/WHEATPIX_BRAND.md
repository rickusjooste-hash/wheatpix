# WheatPix Brand Reference

Crop protection intelligence for cereals and grain farms.

---

## Files in this package

| File | Purpose |
|------|---------|
| `WheatPixLogo.jsx` | React component — drop into `components/` |
| `wheatpix-tokens.js` | Design tokens — colours, fonts, spacing |
| `wheatpix-pwa-512.svg` | PWA icon 512×512 — `manifest.json` |
| `wheatpix-pwa-192.svg` | PWA icon 192×192 — `manifest.json` |
| `wheatpix-favicon.svg` | Favicon 32×32 — `<link rel="icon">` |

---

## Wordmark

The wordmark combines two typefaces into one lockup:

- **"Wheat"** — DM Serif Display (serif), tracks −0.02em
- **"Pıx"** — Space Mono Bold (monospace), tracks −0.03em
- **The dot on the i is a hard square** — the dotless-ı character (U+0131) is used and a CSS `::before` square is positioned above it

### React usage

```jsx
import WheatPixLogo from '@/components/WheatPixLogo'

// Default — md, dark variant, no icon
<WheatPixLogo />

// Large with pixel wheat icon
<WheatPixLogo size="lg" showIcon />

// Light variant (parchment bg)
<WheatPixLogo size="md" variant="light" />

// All sizes: 'xl' | 'lg' | 'md' | 'sm' | 'xs'
// All variants: 'dark' | 'light' | 'white' | 'green'
```

### Size scale

| Token | Font size | Use case |
|-------|-----------|----------|
| `xl`  | 72px | Hero / splash screens |
| `lg`  | 52px | Page headers |
| `md`  | 36px | Section headers |
| `sm`  | 24px | Sidebar / nav |
| `xs`  | 16px | Compact nav / mobile |

---

## Colour palette

| Name | Hex | Use |
|------|-----|-----|
| Harvest Gold | `#F5C842` | Primary accent, highlights |
| Amber Field | `#D4890A` | "Pix" on dark backgrounds |
| Dark Chaff | `#8B5E04` | "Pix" on light backgrounds |
| Canopy Green | `#2D5A1B` | Secondary brand green |
| Night Field | `#0E1A07` | Primary dark surface |
| Parchment | `#F5EDDA` | Primary light surface |
| Cream | `#FBF6EC` | Off-white surface |
| Rich Soil | `#3A2006` | Borders, dividers |
| Cereal Sky | `#A8C5DA` | Accent blue |

### Variant pairings

| Variant | Background | "Wheat" | "Pix" |
|---------|-----------|---------|-------|
| `dark`  | `#0E1A07` Night Field | `#F5EDDA` Parchment | `#D4890A` Amber Field |
| `light` | `#F5EDDA` Parchment | `#1A3308` Deep Green | `#8B5E04` Dark Chaff |
| `white` | `#FFFFFF` White | `#0E1A07` Night Field | `#8B5E04` Dark Chaff |
| `green` | `#2D5A1B` Canopy Green | `#F5EDDA` Parchment | `#F5C842` Harvest Gold |

---

## Typography

```js
// Google Fonts — add to layout.js
const fontsUrl =
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Space+Mono:wght@700&family=Outfit:wght@300;400;500;600;700;900&display=swap'

// Families
'DM Serif Display', serif    // Wordmark "Wheat" + hero headings
'Space Mono', monospace      // Wordmark "Pix" + data labels + codes
'Outfit', sans-serif         // All body, UI, captions
```

---

## PWA manifest.json

```json
{
  "name": "WheatPix",
  "short_name": "WheatPix",
  "description": "Crop protection intelligence for cereals",
  "theme_color": "#0E1A07",
  "background_color": "#0E1A07",
  "display": "standalone",
  "icons": [
    {
      "src": "/icons/wheatpix-pwa-192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/wheatpix-pwa-512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

---

## Next.js layout.js setup

```jsx
// app/layout.js
import { Inter } from 'next/font/google'

export const metadata = {
  title: 'WheatPix',
  description: 'Crop protection intelligence for cereals',
  icons: {
    icon: '/icons/wheatpix-favicon.svg',
    apple: '/icons/wheatpix-pwa-192.svg',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Space+Mono:wght@700&family=Outfit:wght@300;400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

## Tailwind config

```js
// tailwind.config.js
import { tailwindExtension } from './lib/wheatpix-tokens'

export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors:     tailwindExtension.colors,
      fontFamily: tailwindExtension.fontFamily,
    },
  },
}

// Usage in JSX:
// <div className="bg-wp-night text-wp-parchment font-wp-serif">
```

---

## Pixel wheat icon — SVG safe area

The icon uses a 5-column pixel grid:

```
col:   0   1   2   3   4
       .   .   ■   .   .   ← tip
       .   ■   ■   ■   .   ← pair 1
       .   .   ░   .   .   ← rachis (faded)
       ■   ■   ■   ■   ■   ← pair 2 (widest)
       .   .   ░   .   .   ← rachis (faded)
       .   ■   ■   ■   .   ← pair 3
       .   .   ▓   .   .   ← stem
```

Pixel size: 7px · Gap: 2px · ViewBox: 40×67

---

## Design rules

1. Never stretch or distort the wordmark
2. "Wheat" and "Pix" must always appear together — never separate
3. The icon mark can appear alone (e.g. favicon, app icon) but the wordmark cannot appear without the correct typefaces loaded
4. Minimum clear space = 0.5× the wordmark height on all sides
5. Do not recolour the pixel wheat icon — only the four approved variant colour sets
6. The square dot on the i is non-negotiable — do not substitute a round dot
