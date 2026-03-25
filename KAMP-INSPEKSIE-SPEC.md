# Kamp Inspeksie — Feature Spec for Farm Manager Dashboard

## Context

This feature digitizes a paper-based weed inspection form ("Kamp Inspeksie") used on grain/crop farms in the Western Cape, South Africa. An inspector walks each block (kamp) on the farm, identifies which weed species are present, and rates their severity. This data is currently captured on a printed grid with handwritten X marks.

The app is a **Next.js + Supabase** farm manager dashboard. This feature should integrate into the existing app structure, routing, and auth system.

A working **React prototype** is attached as `kamp-inspeksie.jsx` — use it as the UI reference for layout, interaction patterns, colours, and component structure. The prototype is fully functional for the tap-to-cycle and long-press tooltip interactions.

---

## Feature Flow

### 1. Start Screen (pre-inspection)

Before any block inspections begin, the inspector must:

1. **Select an inspection stage (stadium)** from a list. Default stages are:
   - `Voor Plant` (pre-planting)
   - `Opkoms` (emergence)
2. Stages are **editable** — the user can add new stages (e.g. "Na-opkoms", "Voor Oes") or remove existing ones. Stage configuration should persist per farm in the database.
3. The **"Begin Inspeksie"** button is disabled until a stage is selected.
4. The selected stage is saved with the inspection and displayed in the header throughout.

### 2. Block Navigation

- **Primary**: Auto-select the current block based on **GPS location** using polygon containment against the existing block geometry data in Supabase (the `blocks` table already has polygon geometry from the Orchard Analysis feature).
- **Fallback**: Searchable block list selector (tap block name in header to open).
- **Sequential**: ◀ ▶ arrow buttons to step through blocks in order.
- Show a **progress bar** of how many blocks have been inspected in this session.

### 3. Weed Inspection Grid

Each block shows a grid of weed species buttons, organised into two sections:

**Grasse (Grasses):**
| Abbreviation | Full Name |
|---|---|
| WH | Wilde Hawer |
| PL | Predikantstuis |
| RG | Raaigras |
| KS | Kanariesaad |
| VL | Vulpia |

**Breeblaar (Broadleaf):**
| Abbreviation | Full Name |
|---|---|
| MX | Emex |
| KB | Kiesieblaar |
| S | Sierings |
| TK | Turknaels |
| RS | Rumnas |
| GB | Gousbloem |
| SM | Sterremier |
| CN | Canola |
| KD | Koperdraad |
| SK | Stinkkruid |
| MD | Medics |
| LP | Suuring |
| HB | Hongerbos |
| GK | Ganskos |

The weed species list should be **configurable per farm** — the above are seeded as defaults, but farms can add custom species or hide irrelevant ones.

### 4. Severity Scale (5 levels)

Tapping a weed button cycles through these states:

| Level | DB Value | Display | Afrikaans Name | Colour |
|---|---|---|---|---|
| 0 | 0 | *(blank)* | Niks | Grey (inactive) |
| 1 | 1 | − | Baie Min | Green `#5a8a5a` |
| 2 | 2 | X | Min | Yellow `#d4a017` |
| 3 | 3 | XX | Redelik | Orange `#e87b35` |
| 4 | 4 | XXX | Baie | Red `#e8413c` |

Tapping cycles: 0 → 1 → 2 → 3 → 4 → 0 (back to blank).

### 5. Long-Press Tooltip

Holding a weed button for ~400ms shows the **full weed name** in a tooltip above the button (without cycling the severity). This is important because inspectors may not memorise all abbreviations.

Implementation detail: distinguish between tap (cycle severity) and long-press (show tooltip) using a timer. Suppress the mobile context menu (`onContextMenu preventDefault`).

### 6. Notes

Each block inspection has an optional free-text **notes** field.

### 7. Save & Summary

- **Save** stores the inspection for the current block to Supabase.
- **Opsomming (Summary)** button opens a scrollable heatmap table showing all inspected blocks × all weed species with colour-coded severity marks. This mirrors the layout of the original paper form. The selected stage is shown in the summary header.

---

## Supabase Data Model

### `inspection_stages`
Configurable timeline stages per farm.

```sql
CREATE TABLE inspection_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed defaults for each farm
-- INSERT: 'Voor Plant' (sort_order 0, is_default true)
-- INSERT: 'Opkoms' (sort_order 1, is_default true)
```

### `weed_species`
Master list of weed species, configurable per farm with global defaults.

```sql
CREATE TABLE weed_species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES farms(id),  -- NULL = global default
  name TEXT NOT NULL,
  abbreviation VARCHAR(4) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('grass', 'broadleaf')),
  is_default BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed all 19 default species from the table above
-- grass: WH, PL, RG, KS, VL
-- broadleaf: MX, KB, S, TK, RS, GB, SM, CN, KD, SK, MD, LP, HB, GK
```

### `camp_inspections`
One row per block visit within an inspection session.

```sql
CREATE TABLE camp_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  block_id UUID NOT NULL REFERENCES blocks(id),
  stage_id UUID NOT NULL REFERENCES inspection_stages(id),
  inspector_id UUID NOT NULL REFERENCES auth.users(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  crop TEXT,
  cultivar TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `camp_inspection_weeds`
Individual weed severity marks per inspection.

```sql
CREATE TABLE camp_inspection_weeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES camp_inspections(id) ON DELETE CASCADE,
  weed_species_id UUID NOT NULL REFERENCES weed_species(id),
  severity SMALLINT NOT NULL DEFAULT 0 CHECK (severity BETWEEN 0 AND 4),
  UNIQUE (inspection_id, weed_species_id)
);
```

### RLS Policies

Apply standard farm-scoped RLS: users can only read/write inspections for farms they belong to. Follow the existing RLS patterns in the project.

### Useful Queries

```sql
-- All blocks with XXX (Baie) raaigras across both farms
SELECT b.name, ci.inspection_date, s.name AS stage
FROM camp_inspection_weeds ciw
JOIN camp_inspections ci ON ciw.inspection_id = ci.id
JOIN blocks b ON ci.block_id = b.id
JOIN weed_species ws ON ciw.weed_species_id = ws.id
JOIN inspection_stages s ON ci.stage_id = s.id
WHERE ws.abbreviation = 'RG' AND ciw.severity = 4;

-- Weed pressure trend for a block across stages in the same season
SELECT s.name AS stage, ws.abbreviation, ciw.severity
FROM camp_inspection_weeds ciw
JOIN camp_inspections ci ON ciw.inspection_id = ci.id
JOIN inspection_stages s ON ci.stage_id = s.id
JOIN weed_species ws ON ciw.weed_species_id = ws.id
WHERE ci.block_id = '<block_uuid>'
  AND ci.inspection_date >= '2025-01-01'
ORDER BY s.sort_order, ws.sort_order;
```

---

## UI / UX Requirements

### Mobile-First Field Design
- **Big tap targets**: 48px+ minimum button size. The grid uses square aspect-ratio buttons in a 5-column grid.
- **One-handed operation**: all primary actions reachable with thumb.
- **Works with dirty/gloved hands**: large touch areas, no precision gestures needed.
- **Dark theme**: reduce glare in bright outdoor conditions (the prototype uses dark background `#0a0a0a`).
- **Minimal text input**: the only text field is optional notes.

### Visual Design
- Use the prototype's colour scheme and typography (JetBrains Mono for data, system sans-serif for body).
- Severity colours provide instant visual feedback: grey → green → yellow → orange → red.
- Section headers use coloured block indicators (▌ Grasse in green, ▌ Breeblaar in amber).
- GPS status indicator with animated pulse while searching.

### Offline Support (Critical)
Inspections MUST work without mobile signal — farms often have poor coverage. Implementation:
- Use a **service worker** with the existing PWA setup.
- Queue inspections in **IndexedDB** when offline.
- Auto-sync to Supabase when connectivity returns.
- Show clear offline/online status indicator.
- Conflict resolution: last-write-wins is acceptable for this use case.

---

## Component Structure

Suggested file structure within the existing Next.js app:

```
app/
  inspections/
    page.tsx                    -- Inspections list/history page
    new/
      page.tsx                  -- Start screen (stage selection)
    [inspectionId]/
      page.tsx                  -- Active inspection (block grid)
      summary/
        page.tsx                -- Summary heatmap view

components/
  inspections/
    WeedButton.tsx              -- Tap-to-cycle button with long-press tooltip
    SeverityLegend.tsx          -- Colour-coded legend bar
    BlockSelector.tsx           -- Modal block picker (GPS fallback)
    InspectionGrid.tsx          -- Main grid layout (Grasse + Breeblaar sections)
    InspectionSummary.tsx       -- Heatmap summary table
    StageSelector.tsx           -- Stage picker + editor on start screen

hooks/
  useGeoLocation.ts             -- GPS watcher with block polygon matching
  useOfflineSync.ts             -- IndexedDB queue + Supabase sync

lib/
  inspection-utils.ts           -- Severity constants, default weed data
```

---

## GPS Block Matching

The existing `blocks` table has polygon geometry. Use the Geolocation API to get the inspector's position, then match against block polygons:

```typescript
// Point-in-polygon check using ray casting
function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect = ((yi > point.lng) !== (yj > point.lng))
      && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
```

If the GPS position falls inside a block polygon, auto-select that block. If it falls outside all polygons or GPS is unavailable, show the manual block selector.

---

## Settings / Admin Screens (Lower Priority)

These can be built after the core inspection flow:

1. **Weed Species Manager** — per-farm config to add/remove/reorder weed species. Toggle `is_active` to hide species without deleting historical data.
2. **Stage Manager** — add/remove/reorder inspection stages per farm (the start screen has a basic inline editor, but a dedicated settings page would be cleaner).
3. **Inspection History** — list past inspections filtered by farm, block, stage, date range. View historical data.
4. **Heatmap Dashboard** — farm-wide weed pressure visualisation across blocks and seasons, building on the summary view.

---

## Reference: Prototype File

The file `kamp-inspeksie.jsx` is the working React prototype built during design. Key things to preserve from it:

- The tap-to-cycle interaction on `WeedButton` (quick tap = cycle, long press = tooltip)
- The 5-level severity scale with exact colours and labels
- The dark theme colour palette
- The start screen with stage selection + inline stage editor
- The summary heatmap table layout
- The GPS status indicator
- The progress bar tracking completed blocks

Adapt the inline styles to your project's styling approach (Tailwind, CSS modules, etc.) but keep the visual design consistent with the prototype.

---

## Design Tokens & Visual Reference

### Colour Palette

```
Background:
  page:              #0a0a0a
  card/input:        #111111
  elevated:          #1a1a1a
  border-subtle:     #1a1a1a
  border-default:    #222222
  border-strong:     #333333
  border-tooltip:    #444444

Text:
  primary:           #eeeeee
  secondary:         #cccccc
  tertiary:          #888888
  muted:             #666666
  disabled:          #444444
  faint:             #555555
  dark:              #333333

Accent (green / success):
  gps-active:        #4a9a4a
  selected-text:     #6dbb6d
  selected-bg:       #1a2a1a
  button-gradient:   linear-gradient(135deg, #2a6a2a, #3a8a3a)
  button-border:     #4a9a4a
  progress-gradient: linear-gradient(90deg, #2a6a2a, #4a9a4a)
  saved-bg:          #1a3a1a

Section headers:
  grasse:            #4a7a4a
  breeblaar:         #7a6a3a

GPS searching:       #8a7a2a
```

### Severity Levels (complete styling per level)

```
Level 0 — Niks (blank):
  label:    ""  (empty)
  color:    #2a2a2a
  bg:       #1a1a1a
  border:   #333333
  abbr:     #666666  (muted)

Level 1 — Baie Min:
  label:    "−"  (en-dash)
  color:    #5a8a5a
  bg:       #1a2a1a
  border:   #3a5a3a
  glow:     radial-gradient(circle at center, #5a8a5a15, transparent 70%)

Level 2 — Min:
  label:    "X"
  color:    #d4a017
  bg:       #2c2510
  border:   #6b5210
  glow:     radial-gradient(circle at center, #d4a01715, transparent 70%)

Level 3 — Redelik:
  label:    "XX"
  color:    #e87b35
  bg:       #2c1a0e
  border:   #7a3d15
  glow:     radial-gradient(circle at center, #e87b3515, transparent 70%)

Level 4 — Baie:
  label:    "XXX"
  color:    #e8413c
  bg:       #2c0e0e
  border:   #7a1515
  glow:     radial-gradient(circle at center, #e8413c15, transparent 70%)
```

### Typography

```
Monospace (data, labels, buttons):
  font-family: 'JetBrains Mono', 'Fira Code', monospace
  Import: https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800

System (body, notes):
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

Sizes:
  page-title:        11px, weight 600, letter-spacing 2px, uppercase
  date:              10px
  stage-indicator:   10px, weight 600, letter-spacing 1px, uppercase
  block-name:        18px, weight 700
  block-meta:        12px (crop · cultivar)
  section-header:    10px, weight 700, letter-spacing 2px, uppercase
  weed-abbr:         13px, weight 700, letter-spacing 0.5px
  weed-severity:     14-18px, weight 800 (smaller for XXX, larger for X)
  legend:            11px
  progress:          10px
  tooltip:           12px, weight 600
  summary-header:    9px
  summary-cell:      9-10px, weight 700
  summary-block:     11px, weight 600
  button-label:      15-16px, weight 700, letter-spacing 0.5px
  notes-input:       14px
```

### Component Dimensions & Spacing

```
WeedButton:
  aspect-ratio: 1 (square)
  grid: 5 columns, 8px gap
  border: 2px solid
  border-radius: 10px
  min touch target: 48px+

Tooltip:
  position: absolute, bottom calc(100% + 8px)
  background: #222222
  border: 1px solid #444444
  border-radius: 6px
  padding: 6px 10px
  arrow: 8x8px rotated 45deg, same bg/border

Block header button:
  padding: 14px 20px
  full width, background #111111

Progress bar:
  height: 3px
  border-radius: 2px

Bottom action bar:
  position: fixed bottom
  padding: 12px 20px (30px top for gradient fade)
  background: linear-gradient(transparent, #0a0a0a 30%)
  nav buttons: padding 14px, border-radius 10px
  save button: flex 1, padding 14px, border-radius 10px

Page max-width: 480px (mobile-optimised)
Page padding: 20px horizontal
Section spacing: 12-16px top padding between sections
Notes area: bottom padding 100px (clearance for fixed bottom bar)
```

### Icons & Symbols (Unicode — no icon library needed)

```
Section indicators:
  Grasse header:     ▌  (U+258C, left half block)
  Breeblaar header:  ▌  (U+258C, left half block)

Navigation:
  Previous block:    ◀  (U+25C0)
  Next block:        ▶  (U+25B6)
  Block dropdown:    ▾  (U+25BE)

Status:
  GPS indicator:     ●  (6x6px circle div with bg colour, not a character)
  GPS pulse:         CSS animation: opacity 0.4 → 1 → 0.4, 1.5s ease-in-out infinite
  Stage indicator:   ●  (U+25CF, in green #4a9a4a)
  Saved checkmark:   ✓  (U+2713)
  Close modal:       ✕  (U+2715)
  Selected stage:    ✓  (U+2713, in green #4a9a4a)

Buttons:
  Summary:           ☰ Opsomming  (U+2630 hamburger)
  Start:             Begin Inspeksie →  (U+2192 arrow)
  Add stage:         + Voeg by
  Edit stages:       ▼ Wysig stadiums / ▲ Klaar met wysig  (U+25BC / U+25B2)
  Delete stage:      ✕  (U+2715, colour #663333)
```

### CSS Animations

```css
/* GPS searching pulse */
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* Tooltip entrance */
@keyframes tooltipIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
```

### Interaction Details

```
Tap (weed button):
  - Quick tap cycles severity: 0 → 1 → 2 → 3 → 4 → 0
  - Transition: all 0.15s ease on border/background colour change
  - WebkitTapHighlightColor: transparent
  - user-select: none

Long press (weed button):
  - Hold 400ms triggers tooltip
  - Does NOT cycle severity
  - Releasing after tooltip shown = dismiss tooltip only
  - onContextMenu preventDefault (suppress mobile menu)

Save button:
  - Disabled when no weed data entered (hasData = false)
  - On save: text changes "Stoor Inspeksie" → "✓ Gestoor"
  - Reverts after 2000ms
  - transition: all 0.2s ease

Stage selection:
  - Selected stage: green border 2px #4a9a4a, bg #1a2a1a, text #6dbb6d
  - Unselected: border 2px #222222, bg #111111, text #cccccc
  - transition: all 0.15s ease
```
