# KML Import for Kampe — Design Spec

**Date:** 2026-05-28
**Feature:** Bulk-import kampe (blocks) from KML files on the farm map page

## Overview

Allow users to upload a KML file on the farm map page (`/dashboard/farms/[id]/map`) to bulk-create kampe. The file is parsed client-side for an instant preview with satellite imagery, then confirmed kampe are batch-inserted via a server action.

## UI Flow

### Step 1: Trigger

- "Importeer KML" button in the side panel, below the kampe list
- Clicking opens a native file picker accepting `.kml` files only

### Step 2: Preview (map + table)

The normal map view transitions into a preview mode:

**Map area:**
- Satellite imagery (ArcGIS) remains visible — essential for verifying polygon placement
- Existing kampe rendered dimmed (green, reduced opacity)
- New KML polygons rendered in gold dashed outlines
- Selected polygon switches to solid gold with a subtle pulse animation
- Legend in bottom-left: "Bestaande kampe" (green), "Nuwe kampe (KML)" (gold dashed), "Gekies" (gold solid)
- Instruction toast: "Klik op 'n kamp om te wysig"
- Map auto-fits to show both existing and new polygons

**Side panel (replaces normal kampe list):**
- Header: "KML Voorskou" with count and filename
- Each parsed polygon shown as a row: checkbox, name, hectares, status badge
- Status badges: "Nuut" (green) or "Duplikaat" (orange)
- Duplicates detected by case-insensitive name match against existing blocks
- Duplicates unchecked by default; new kampe checked by default
- Header checkbox for select all / deselect all
- Footer: "Kanselleer" and "Importeer N" buttons (N = count of checked items)

**Click-to-select interaction:**
- Clicking a polygon on the map or a row in the table selects that kamp
- Selected row expands into an inline edit form
- Editable fields: Name (text input), Kultivar (optional text input)
- Read-only field: Hektaar (calculated from geometry, always via Turf.js)
- Clicking another polygon or clicking away collapses the edit form; changes persist in local state
- Clicking a row also pans/zooms the map to that polygon

### Step 3: Confirm

- "Importeer N kampe" triggers a batch insert via server action
- On success: brief success feedback, map re-renders with new polygons as permanent blocks, side panel returns to normal kampe list
- On error: error message displayed, preview state preserved so user can retry

## Technical Architecture

### KML Parser — `src/lib/kml-parser.ts`

Client-side pure utility (~60 lines), no React dependencies.

**Input:** KML file content as string
**Output:** Array of `{ name: string; geometry: { lat: number; lng: number }[]; cultivar?: string }`

Behaviour:
- Uses browser `DOMParser` to parse the XML
- Iterates all `<Placemark>` elements
- Skips any Placemark without a `<Polygon>` child (points, lines silently ignored)
- Extracts `<name>` text content as the block name
- Parses `<coordinates>` from `<Polygon> > <outerBoundaryIs> > <LinearRing> > <coordinates>`
- Converts KML coordinate format (`lng,lat,altitude`) to `{ lat, lng }[]`
- Handles ring closure: removes the closing duplicate coordinate if first and last points match (KML rings typically repeat the first point); if they don't match, leaves as-is (Leaflet and Turf.js don't require closed rings)
- Optionally parses `<description>` CDATA/HTML for cultivar (looks for "Cultivar:" pattern)

### Area Calculation

Uses `@turf/area` and `@turf/helpers` (already project dependencies) to calculate hectares from polygon geometry. Same approach as the existing `calcHectares()` in `FarmMap.tsx`.

### Preview State

Managed in the map page component. Each parsed block held as:
```typescript
interface KmlPreviewBlock {
  name: string;
  geometry: { lat: number; lng: number }[];
  areaHa: number;
  cultivar: string | null;
  isSelected: boolean;  // checkbox state
  isDuplicate: boolean; // name matches existing block
}
```

Duplicate detection: case-insensitive comparison of parsed name against existing `blocks` array.

### Server Action — `src/app/(dashboard)/dashboard/farms/[id]/map/actions.ts`

New `importBlocks` server action:

**Input:** `farmId: string`, array of `{ name: string; geometry: { lat: number; lng: number }[]; area_hectares: number; cultivar?: string }`

**Behaviour:**
- Single Supabase `.insert()` call on `blocks` table with full array (batch insert)
- Sets `is_active: true`, `sort_order` based on existing block count + index
- If any block has a cultivar, creates corresponding `block_seasons` entries for the current year with `status: 'planned'`
- Returns the inserted blocks (with IDs) for the map to render
- RLS enforces authorization (same `is_farm_member()` check as existing block creation)

### Component Structure

**`KmlImportPreview`** — new component in `src/components/dashboard/KmlImportPreview.tsx`
- Receives: parsed blocks, existing blocks, farmId
- Manages: selection state, edit state, confirm action
- Renders: the side panel preview table with inline edit forms

**`FarmMap` changes:**
- New optional prop: `previewBlocks?: { name: string; geometry: { lat: number; lng: number }[]; isSelected?: boolean }[]`
- When present, renders preview polygons in gold dashed style alongside dimmed existing blocks
- Clicking a preview polygon calls a new `onPreviewBlockClicked` callback
- Hovering a preview polygon adds a highlight effect

**Map page orchestration:**
- Map page manages the import flow state: `idle | previewing | importing`
- In `previewing` state, passes preview data to both `FarmMap` and `KmlImportPreview`
- On confirm, calls the server action, refreshes block list, returns to `idle`

## Data Flow

```
[File Picker] → KML string
    ↓
[kml-parser.ts] → parsed blocks array
    ↓
[Map page state] → adds areaHa (Turf.js), detects duplicates
    ↓
[KmlImportPreview] ←→ [FarmMap preview polygons]
    ↓ (user confirms)
[importBlocks server action] → Supabase batch insert
    ↓
[Map page] → refreshes blocks, returns to normal view
```

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Import location | Farm map page | User is already managing kampe visually |
| Metadata handling | Preview table with per-kamp editing | User stays in control of what gets imported |
| Duplicate handling | Flagged in preview, unchecked by default, user decides | Flexible — user can override |
| Non-polygon features | Silently skipped | Only polygons make sense as kampe |
| Area calculation | Always recalculated from geometry | Consistent with draw tool; geometry is source of truth |
| Parsing | Client-side (DOMParser) | Instant preview, no upload round-trip |
| Persistence | Server action batch insert | Secure, follows existing patterns, RLS enforced |
| KML formats supported | Both hand-crafted and Google Earth exports | Handles coordinate variations in both formats |

## Out of Scope

- KMZ file support (zipped KML)
- Drag-and-drop file upload
- Exporting kampe back to KML
- Multi-polygon placemarks (inner boundaries / holes)
- Editing polygon geometry during preview (only name and cultivar)
