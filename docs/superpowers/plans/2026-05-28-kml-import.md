# KML Import for Kampe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to bulk-import kampe from KML files on the farm map page with a visual preview.

**Architecture:** Client-side KML parsing via DOMParser for instant preview. A new `KmlImportPreview` component manages the side panel preview table. The existing `FarmMap` component gets a new `previewBlocks` prop. Batch insert via client-side Supabase (matching the existing block creation pattern). No new API routes or server actions needed.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (client-side), Leaflet, Turf.js (`@turf/area`, `@turf/helpers`)

**Note:** This project has no test framework installed. Steps will use manual verification with the dev server and the existing KML files in `kml file/` for testing.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/kml-parser.ts` | Create | Pure utility: parse KML string → array of block objects |
| `src/components/dashboard/KmlImportPreview.tsx` | Create | Side panel: preview table with checkboxes, inline edit, confirm/cancel |
| `src/components/dashboard/FarmMap.tsx` | Modify | Add `previewBlocks` prop, render gold dashed polygons, click/hover callbacks |
| `src/app/(dashboard)/dashboard/farms/[id]/map/page.tsx` | Modify | Orchestrate import flow: file picker, state management, batch insert |

---

### Task 1: KML Parser Utility

**Files:**
- Create: `src/lib/kml-parser.ts`

- [ ] **Step 1: Create the parser module**

Create `src/lib/kml-parser.ts`:

```typescript
export interface ParsedBlock {
  name: string;
  geometry: { lat: number; lng: number }[];
  cultivar: string | null;
}

export function parseKml(kmlString: string): ParsedBlock[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlString, "text/xml");
  const placemarks = doc.querySelectorAll("Placemark");
  const blocks: ParsedBlock[] = [];

  placemarks.forEach((pm) => {
    const polygon = pm.querySelector("Polygon");
    if (!polygon) return;

    const name = pm.querySelector("name")?.textContent?.trim() || "Naamloos";

    const coordsText = polygon.querySelector(
      "outerBoundaryIs > LinearRing > coordinates"
    )?.textContent?.trim();
    if (!coordsText) return;

    const points = coordsText
      .split(/\s+/)
      .filter((s) => s.length > 0)
      .map((coord) => {
        const [lng, lat] = coord.split(",").map(Number);
        return { lat, lng };
      })
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));

    if (points.length < 3) return;

    // Remove closing duplicate if first and last points match
    const first = points[0];
    const last = points[points.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) {
      points.pop();
    }

    // Parse cultivar from description HTML if present
    let cultivar: string | null = null;
    const desc = pm.querySelector("description")?.textContent || "";
    const cultivarMatch = desc.match(/Cultivar:<\/b>\s*([^<]+)/i);
    if (cultivarMatch) {
      cultivar = cultivarMatch[1].trim();
    }

    blocks.push({ name, geometry: points, cultivar });
  });

  return blocks;
}
```

- [ ] **Step 2: Verify the parser works with both KML formats**

Run the dev server and open the browser console. Test with both KML formats:

```bash
npm run dev
```

In the browser console (on any page of the app), run:

```javascript
// Quick sanity check — paste a mini KML and parse it
const kml = `<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<Placemark>
  <name>Test Camp</name>
  <description><![CDATA[<b>Cultivar:</b> SST 0147]]></description>
  <Polygon><outerBoundaryIs><LinearRing>
    <coordinates>18.87,-33.10,0 18.86,-33.11,0 18.87,-33.11,0 18.87,-33.10,0</coordinates>
  </LinearRing></outerBoundaryIs></Polygon>
</Placemark>
<Placemark>
  <name>Point (should skip)</name>
  <Point><coordinates>18.87,-33.10,0</coordinates></Point>
</Placemark>
</Document></kml>`;

// Dynamically import the parser
const { parseKml } = await import('/src/lib/kml-parser.ts');
console.log(parseKml(kml));
// Expected: 1 block, name "Test Camp", 3 points (closed dupe removed), cultivar "SST 0147"
```

Alternatively, just confirm the module compiles by checking there are no TypeScript errors in the dev server output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/kml-parser.ts
git commit -m "feat: add KML parser utility for camp import"
```

---

### Task 2: FarmMap Preview Polygons

**Files:**
- Modify: `src/components/dashboard/FarmMap.tsx`

The FarmMap component needs three new optional props for preview mode. When `previewBlocks` is provided, existing blocks are dimmed and preview blocks are rendered in gold dashed style.

- [ ] **Step 1: Add preview props to the FarmMap interface**

In `src/components/dashboard/FarmMap.tsx`, update the `FarmMapProps` interface (around line 20):

```typescript
interface PreviewBlock {
  index: number;
  name: string;
  geometry: { lat: number; lng: number }[];
  areaHa: number;
  isChecked: boolean;
}

interface FarmMapProps {
  farmId: string;
  farmName: string;
  blocks: Block[];
  center?: [number, number];
  onBlockCreated: (name: string, geometry: { lat: number; lng: number }[], areaHa: number) => Promise<void>;
  onBlockUpdated: (blockId: string, geometry: { lat: number; lng: number }[], areaHa: number) => Promise<void>;
  onBlockSelected: (block: Block | null) => void;
  selectedBlockId: string | null;
  previewBlocks?: PreviewBlock[];
  activePreviewIndex?: number | null;
  onPreviewBlockClicked?: (index: number) => void;
}
```

- [ ] **Step 2: Add the preview props to the component signature**

Update the destructured props in the component function (around line 48):

```typescript
export default function FarmMap({
  farmId,
  farmName,
  blocks,
  center,
  onBlockCreated,
  onBlockUpdated,
  onBlockSelected,
  selectedBlockId,
  previewBlocks,
  activePreviewIndex,
  onPreviewBlockClicked,
}: FarmMapProps) {
```

- [ ] **Step 3: Hide draw controls during preview mode**

In the map init `useEffect` (around line 64), after the draw control is added, store a reference to the drawn items layer. Then add a new `useEffect` that hides/shows the draw control based on preview mode.

After the existing `mapRef.current = map;` line (around line 153), add a new `useEffect`:

```typescript
  // Hide draw controls during preview
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !drawControlRef.current) return;
    if (previewBlocks && previewBlocks.length > 0) {
      map.removeControl(drawControlRef.current);
    } else {
      map.addControl(drawControlRef.current);
    }
  }, [previewBlocks]);
```

- [ ] **Step 4: Modify the block rendering useEffect to handle preview mode**

Replace the existing "Render block polygons" `useEffect` (lines 161-215) with a version that dims existing blocks during preview and renders preview polygons:

```typescript
  // Render block polygons + preview polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing
    blockLayersRef.current.forEach((layer) => map.removeLayer(layer));
    blockLayersRef.current.clear();

    // Clear preview layers
    previewLayersRef.current.forEach((layer) => map.removeLayer(layer));
    previewLayersRef.current.clear();

    // Clear labels
    labelLayersRef.current.forEach((layer) => map.removeLayer(layer));
    labelLayersRef.current = [];

    const bounds: L.LatLng[] = [];
    const inPreview = previewBlocks && previewBlocks.length > 0;

    // Existing blocks (dimmed if in preview mode)
    blocks.forEach((block, i) => {
      if (!block.geometry || block.geometry.length < 3) return;

      const latlngs = geometryToLatLngs(block.geometry);
      bounds.push(...latlngs);

      const isSelected = block.id === selectedBlockId;
      const color = BLOCK_COLORS[i % BLOCK_COLORS.length];
      const dimmed = inPreview;

      const polygon = L.polygon(latlngs, {
        color: isSelected && !dimmed ? "#F5C842" : color,
        weight: isSelected && !dimmed ? 3 : 2,
        fillColor: color,
        fillOpacity: dimmed ? 0.08 : isSelected ? 0.3 : 0.15,
        opacity: dimmed ? 0.3 : 1,
      });

      const center = polygon.getBounds().getCenter();
      const label = L.divIcon({
        className: "",
        html: `<div style="
          font-size: 11px;
          font-weight: 700;
          color: ${dimmed ? "rgba(74,154,74,0.4)" : "#F5EDDA"};
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          white-space: nowrap;
          font-family: 'JetBrains Mono', monospace;
          pointer-events: none;
        ">${block.name}${block.area_hectares ? ` · ${block.area_hectares.toFixed(1)}ha` : ""}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const labelMarker = L.marker(center, { icon: label, interactive: false }).addTo(map);
      labelLayersRef.current.push(labelMarker);

      if (!dimmed) {
        polygon.on("click", () => onBlockSelected(block));
      }

      polygon.addTo(map);
      blockLayersRef.current.set(block.id, polygon);
    });

    // Preview blocks (gold dashed or solid if active)
    if (previewBlocks) {
      previewBlocks.forEach((pb) => {
        if (!pb.isChecked) return;

        const latlngs = pb.geometry.map((p) => L.latLng(p.lat, p.lng));
        bounds.push(...latlngs);

        const isActive = pb.index === activePreviewIndex;

        const polygon = L.polygon(latlngs, {
          color: "#F5C842",
          weight: isActive ? 3 : 2,
          fillColor: "#F5C842",
          fillOpacity: isActive ? 0.25 : 0.1,
          dashArray: isActive ? undefined : "8,4",
        });

        const center = polygon.getBounds().getCenter();
        const label = L.divIcon({
          className: "",
          html: `<div style="
            font-size: 10px;
            font-weight: 700;
            color: ${isActive ? "#fff" : "#F5C842"};
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            white-space: nowrap;
            font-family: 'JetBrains Mono', monospace;
            pointer-events: none;
          ">${pb.name} · ${pb.areaHa.toFixed(1)}ha</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        const labelMarker = L.marker(center, { icon: label, interactive: false }).addTo(map);
        labelLayersRef.current.push(labelMarker);

        polygon.on("click", () => {
          onPreviewBlockClicked?.(pb.index);
        });

        polygon.addTo(map);
        previewLayersRef.current.set(pb.index, polygon);
      });
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.1));
    }
  }, [blocks, selectedBlockId, onBlockSelected, previewBlocks, activePreviewIndex, onPreviewBlockClicked]);
```

- [ ] **Step 5: Add the new refs for preview layers and labels**

Near the top of the component function, after the existing refs (around line 58-61), add:

```typescript
  const previewLayersRef = useRef<Map<number, L.Polygon>>(new Map());
  const labelLayersRef = useRef<L.Marker[]>([]);
```

- [ ] **Step 6: Add the legend overlay during preview**

In the JSX return, after the `{isDrawing && ...}` block (around line 246), add the preview legend:

```typescript
      {previewBlocks && previewBlocks.length > 0 && (
        <>
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "12px",
              zIndex: 1000,
              background: "rgba(14,26,7,0.9)",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #2D5A1B",
              fontSize: "11px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "18px", height: "3px", background: "#4a9a4a", opacity: 0.4 }} />
              <span style={{ color: "rgba(245,237,218,0.5)" }}>Bestaande kampe</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "18px", height: "0", borderTop: "2px dashed #F5C842" }} />
              <span style={{ color: "#F5C842" }}>Nuwe kampe (KML)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "18px", height: "3px", background: "#F5C842" }} />
              <span style={{ color: "#fff" }}>Gekies</span>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              background: "rgba(14,26,7,0.9)",
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #2D5A1B",
              fontSize: "11px",
              color: "rgba(245,237,218,0.7)",
            }}
          >
            Klik op &apos;n kamp om te wysig
          </div>
        </>
      )}
```

- [ ] **Step 7: Pan/zoom to active preview block**

Add a `useEffect` that pans the map to the active preview polygon when the user clicks a row in the side panel. Place this after the rendering `useEffect`:

```typescript
  // Pan to active preview block when selected from side panel
  useEffect(() => {
    const map = mapRef.current;
    if (!map || activePreviewIndex == null) return;
    const layer = previewLayersRef.current.get(activePreviewIndex);
    if (layer) {
      map.fitBounds(layer.getBounds().pad(0.3));
    }
  }, [activePreviewIndex]);
```

- [ ] **Step 8: Clean up label markers on unmount**

Update the cleanup in the map init `useEffect` return (around line 155). Change:

```typescript
    return () => {
      map.remove();
      mapRef.current = null;
    };
```

To:

```typescript
    return () => {
      labelLayersRef.current.forEach((l) => map.removeLayer(l));
      labelLayersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
```

- [ ] **Step 9: Verify the map still renders correctly without preview props**

Run `npm run dev`, navigate to an existing farm's map page. Confirm:
- Existing blocks render as before (green polygons with labels)
- Draw control is visible
- Clicking a block selects it

- [ ] **Step 10: Commit**

```bash
git add src/components/dashboard/FarmMap.tsx
git commit -m "feat: add preview polygon rendering to FarmMap"
```

---

### Task 3: KML Import Preview Component

**Files:**
- Create: `src/components/dashboard/KmlImportPreview.tsx`

This component renders the side panel content during KML preview: header, scrollable table rows with checkboxes and inline edit, and footer action buttons.

- [ ] **Step 1: Create the KmlImportPreview component**

Create `src/components/dashboard/KmlImportPreview.tsx`:

```typescript
"use client";

import { useState } from "react";

export interface KmlPreviewBlock {
  name: string;
  geometry: { lat: number; lng: number }[];
  areaHa: number;
  cultivar: string | null;
  isChecked: boolean;
  isDuplicate: boolean;
}

interface KmlImportPreviewProps {
  fileName: string;
  previewBlocks: KmlPreviewBlock[];
  activeIndex: number | null;
  onToggleCheck: (index: number) => void;
  onToggleAll: (checked: boolean) => void;
  onSelectBlock: (index: number | null) => void;
  onUpdateBlock: (index: number, updates: { name?: string; cultivar?: string | null }) => void;
  onConfirm: () => void;
  onCancel: () => void;
  importing: boolean;
}

export default function KmlImportPreview({
  fileName,
  previewBlocks,
  activeIndex,
  onToggleCheck,
  onToggleAll,
  onSelectBlock,
  onUpdateBlock,
  onConfirm,
  onCancel,
  importing,
}: KmlImportPreviewProps) {
  const checkedCount = previewBlocks.filter((b) => b.isChecked).length;
  const allChecked = checkedCount === previewBlocks.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "20px", borderBottom: "1px solid #f0f0ec" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
          KML Voorskou
        </h2>
        <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
          {previewBlocks.length} kampe gevind · {fileName}
        </div>
      </div>

      {/* Select all header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 20px",
          borderBottom: "2px solid #e8e8e4",
          fontSize: "11px",
          color: "#999",
        }}
      >
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => onToggleAll(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        <span style={{ flex: 1 }}>Naam</span>
        <span style={{ width: "60px", textAlign: "right" }}>Ha</span>
        <span style={{ width: "65px", textAlign: "center" }}>Status</span>
      </div>

      {/* Block list */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {previewBlocks.map((block, i) => {
          const isActive = i === activeIndex;

          if (isActive) {
            return (
              <div
                key={i}
                style={{
                  background: "#FFFBEB",
                  borderLeft: "3px solid #F5C842",
                  padding: "12px 17px",
                  borderBottom: "1px solid #f0f0ec",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <input
                    type="checkbox"
                    checked={block.isChecked}
                    onChange={() => onToggleCheck(i)}
                    style={{ cursor: "pointer" }}
                  />
                  <div
                    style={{
                      flex: 1,
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#D4890A",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Wysig kamp
                  </div>
                  {block.isDuplicate && (
                    <span
                      style={{
                        fontSize: "9px",
                        background: "#FFF3E0",
                        color: "#E65100",
                        padding: "2px 6px",
                        borderRadius: "3px",
                      }}
                    >
                      Duplikaat
                    </span>
                  )}
                  {!block.isDuplicate && (
                    <span
                      style={{
                        fontSize: "9px",
                        background: "#E8F5E9",
                        color: "#2D5A1B",
                        padding: "2px 6px",
                        borderRadius: "3px",
                      }}
                    >
                      Nuut
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "10px", color: "#999", marginBottom: "3px" }}>Naam</div>
                  <input
                    type="text"
                    value={block.name}
                    onChange={(e) => onUpdateBlock(i, { name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      border: "1px solid #e8e8e4",
                      borderRadius: "4px",
                      fontSize: "13px",
                      color: "#1a1a1a",
                      background: "white",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", color: "#999", marginBottom: "3px" }}>Kultivar</div>
                    <input
                      type="text"
                      value={block.cultivar || ""}
                      onChange={(e) => onUpdateBlock(i, { cultivar: e.target.value || null })}
                      placeholder="Opsioneel"
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        border: "1px solid #e8e8e4",
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#1a1a1a",
                        background: "white",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ width: "80px" }}>
                    <div style={{ fontSize: "10px", color: "#999", marginBottom: "3px" }}>Hektaar</div>
                    <div
                      style={{
                        padding: "6px 8px",
                        fontSize: "12px",
                        color: "#666",
                        fontFamily: "var(--font-jetbrains), monospace",
                        background: "#f7f7f5",
                        borderRadius: "4px",
                        border: "1px solid #e8e8e4",
                      }}
                    >
                      {block.areaHa.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              onClick={() => onSelectBlock(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderBottom: "1px solid #f0f0ec",
                cursor: "pointer",
                background: block.isDuplicate ? "#FFF8E1" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={block.isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleCheck(i);
                }}
                style={{ cursor: "pointer" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#1a1a1a",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {block.name}
                </div>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  color: "#999",
                  fontFamily: "var(--font-jetbrains), monospace",
                  flexShrink: 0,
                }}
              >
                {block.areaHa.toFixed(1)}
              </span>
              {block.isDuplicate ? (
                <span
                  style={{
                    fontSize: "9px",
                    background: "#FFF3E0",
                    color: "#E65100",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    flexShrink: 0,
                  }}
                >
                  Duplikaat
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "9px",
                    background: "#E8F5E9",
                    color: "#2D5A1B",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    flexShrink: 0,
                  }}
                >
                  Nuut
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #e8e8e4",
          display: "flex",
          gap: "8px",
        }}
      >
        <button
          onClick={onCancel}
          disabled={importing}
          style={{
            flex: 1,
            padding: "10px",
            background: "transparent",
            border: "1px solid #e8e8e4",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#666",
            cursor: importing ? "not-allowed" : "pointer",
          }}
        >
          Kanselleer
        </button>
        <button
          onClick={onConfirm}
          disabled={importing || checkedCount === 0}
          style={{
            flex: 1,
            padding: "10px",
            background: checkedCount === 0 ? "#ccc" : "#2D5A1B",
            border: "none",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#F5EDDA",
            fontWeight: 600,
            cursor: importing || checkedCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          {importing ? "Importeer..." : `Importeer ${checkedCount}`}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the component compiles**

Run `npm run dev` and confirm there are no TypeScript errors in the terminal output.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/KmlImportPreview.tsx
git commit -m "feat: add KmlImportPreview side panel component"
```

---

### Task 4: Wire Up the Map Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/farms/[id]/map/page.tsx`

This is the orchestration task. The map page manages the import flow state, file picker, KML parsing, preview state, and batch insert.

- [ ] **Step 1: Add imports for the new modules**

At the top of `src/app/(dashboard)/dashboard/farms/[id]/map/page.tsx`, add these imports after the existing ones:

```typescript
import { parseKml } from "@/lib/kml-parser";
import type { KmlPreviewBlock } from "@/components/dashboard/KmlImportPreview";
import * as turfHelpers from "@turf/helpers";
import turfArea from "@turf/area";
```

And add the dynamic import for the new preview component (after the existing `FarmMap` dynamic import):

```typescript
const KmlImportPreview = dynamic(
  () => import("@/components/dashboard/KmlImportPreview"),
  { ssr: false }
);
```

- [ ] **Step 2: Add calcHectares helper and import state**

Inside the `FarmMapPage` component function, after the existing state declarations (after line 41), add:

```typescript
  const [importState, setImportState] = useState<"idle" | "previewing" | "importing">("idle");
  const [previewBlocks, setPreviewBlocks] = useState<KmlPreviewBlock[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);
  const [kmlFileName, setKmlFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
```

Add the `useRef` import to the existing React import at the top of the file:

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
```

Add the `calcHectares` helper function before the component (or inside it):

```typescript
function calcHectares(geometry: { lat: number; lng: number }[]): number {
  const coords = geometry.map((p) => [p.lng, p.lat] as [number, number]);
  coords.push(coords[0]);
  const polygon = turfHelpers.polygon([coords]);
  return turfArea(polygon) / 10000;
}
```

- [ ] **Step 3: Add the file picker handler**

After the `handleBlockSelected` callback, add:

```typescript
  const handleKmlFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setKmlFileName(file.name);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const parsed = parseKml(text);

        const existingNames = new Set(blocks.map((b) => b.name.toLowerCase()));

        const preview: KmlPreviewBlock[] = parsed.map((p) => {
          const isDuplicate = existingNames.has(p.name.toLowerCase());
          return {
            name: p.name,
            geometry: p.geometry,
            areaHa: parseFloat(calcHectares(p.geometry).toFixed(2)),
            cultivar: p.cultivar,
            isChecked: !isDuplicate,
            isDuplicate,
          };
        });

        setPreviewBlocks(preview);
        setActivePreviewIndex(null);
        setImportState("previewing");
      };
      reader.readAsText(file);

      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [blocks]
  );

  const handleToggleCheck = useCallback((index: number) => {
    setPreviewBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, isChecked: !b.isChecked } : b))
    );
  }, []);

  const handleToggleAll = useCallback((checked: boolean) => {
    setPreviewBlocks((prev) => prev.map((b) => ({ ...b, isChecked: checked })));
  }, []);

  const handleSelectPreviewBlock = useCallback((index: number | null) => {
    setActivePreviewIndex(index);
  }, []);

  const handleUpdatePreviewBlock = useCallback(
    (index: number, updates: { name?: string; cultivar?: string | null }) => {
      setPreviewBlocks((prev) =>
        prev.map((b, i) => (i === index ? { ...b, ...updates } : b))
      );
    },
    []
  );

  const handleCancelImport = useCallback(() => {
    setImportState("idle");
    setPreviewBlocks([]);
    setActivePreviewIndex(null);
    setKmlFileName("");
  }, []);

  const handleConfirmImport = useCallback(async () => {
    const toImport = previewBlocks.filter((b) => b.isChecked);
    if (toImport.length === 0) return;

    setImportState("importing");

    const rows = toImport.map((b, i) => ({
      farm_id: farmId,
      name: b.name,
      geometry: b.geometry,
      area_hectares: b.areaHa,
      sort_order: blocks.length + i,
      is_active: true,
    }));

    const { data, error } = await supabase
      .from("blocks" as never)
      .insert(rows as never)
      .select("id, name, geometry, area_hectares, is_active, sort_order");

    if (error) {
      alert(`Fout: ${error.message}`);
      setImportState("previewing");
      return;
    }

    const insertedBlocks = data as unknown as Block[];

    // Create block_seasons for any blocks with a cultivar
    const seasonRows = toImport
      .map((b, i) => {
        if (!b.cultivar) return null;
        const insertedBlock = insertedBlocks[i];
        if (!insertedBlock) return null;
        return {
          block_id: insertedBlock.id,
          season: new Date().getFullYear(),
          cultivar: b.cultivar,
          status: "planned",
        };
      })
      .filter(Boolean);

    if (seasonRows.length > 0) {
      await supabase.from("block_seasons" as never).insert(seasonRows as never);
    }

    setBlocks((prev) => [...prev, ...insertedBlocks]);
    setImportState("idle");
    setPreviewBlocks([]);
    setActivePreviewIndex(null);
    setKmlFileName("");
  }, [previewBlocks, farmId, blocks.length, supabase]);
```

- [ ] **Step 4: Update the JSX to include import button, file input, and preview panel**

Replace the entire `return` block (starting from `return (` around line 126) with:

```typescript
  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", margin: "-40px -48px" }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".kml"
        onChange={handleKmlFileSelected}
        style={{ display: "none" }}
      />

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <FarmMap
          farmId={farmId}
          farmName={farmName}
          blocks={blocks}
          onBlockCreated={handleBlockCreated}
          onBlockUpdated={handleBlockUpdated}
          onBlockSelected={handleBlockSelected}
          selectedBlockId={selectedBlock?.id || null}
          previewBlocks={
            importState !== "idle"
              ? previewBlocks.map((b, i) => ({
                  index: i,
                  name: b.name,
                  geometry: b.geometry,
                  areaHa: b.areaHa,
                  isChecked: b.isChecked,
                }))
              : undefined
          }
          activePreviewIndex={activePreviewIndex}
          onPreviewBlockClicked={handleSelectPreviewBlock}
        />
      </div>

      {/* Side panel */}
      <div
        style={{
          width: "300px",
          background: "#fff",
          borderLeft: "1px solid #e8e8e4",
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        {importState !== "idle" ? (
          <KmlImportPreview
            fileName={kmlFileName}
            previewBlocks={previewBlocks}
            activeIndex={activePreviewIndex}
            onToggleCheck={handleToggleCheck}
            onToggleAll={handleToggleAll}
            onSelectBlock={handleSelectPreviewBlock}
            onUpdateBlock={handleUpdatePreviewBlock}
            onConfirm={handleConfirmImport}
            onCancel={handleCancelImport}
            importing={importState === "importing"}
          />
        ) : selectedBlock ? (
          <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a" }}>
                  {selectedBlock.name}
                </div>
                {selectedBlock.area_hectares && (
                  <div style={{ fontSize: "14px", color: "#D4890A", marginTop: "4px", fontWeight: 600, fontFamily: "var(--font-jetbrains), monospace" }}>
                    {selectedBlock.area_hectares.toFixed(1)} ha
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedBlock(null)} style={{ background: "none", border: "none", color: "#bbb", fontSize: "16px", cursor: "pointer" }}>
                ✕
              </button>
            </div>
            {seasons[selectedBlock.id] && (
              <div style={{ marginTop: "14px", padding: "12px", background: "#f7f7f5", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                  Seisoen {new Date().getFullYear()}
                </div>
                <div style={{ fontSize: "14px", color: "#1a1a1a" }}>
                  {seasons[selectedBlock.id].crop || "—"} · {seasons[selectedBlock.id].cultivar || "—"}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ padding: "20px", borderBottom: "1px solid #f0f0ec" }}>
              <Link
                href={`/dashboard/farms/${farmId}`}
                style={{ fontSize: "13px", color: "#999", textDecoration: "none" }}
              >
                ← {farmName}
              </Link>
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", margin: "8px 0 0" }}>
                Kaart
              </h2>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
                Kampe ({blocks.length})
              </div>
              {blocks.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBlock(b)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    padding: "12px",
                    marginBottom: "4px",
                    background: "transparent",
                    border: "none",
                    borderBottom: i < blocks.length - 1 ? "1px solid #f0f0ec" : "none",
                    borderRadius: 0,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>{b.name}</span>
                  {b.area_hectares && (
                    <span style={{ fontSize: "12px", color: "#999", fontFamily: "var(--font-jetbrains), monospace" }}>
                      {b.area_hectares.toFixed(1)} ha
                    </span>
                  )}
                </button>
              ))}
              {blocks.length === 0 && (
                <div style={{ fontSize: "13px", color: "#bbb", textAlign: "center", padding: "24px 0" }}>
                  Gebruik die teken-instrument op die kaart om kampe by te voeg.
                </div>
              )}

              {/* Import KML button */}
              <div style={{ borderTop: "1px solid #e8e8e4", paddingTop: "16px", marginTop: "12px", textAlign: "center" }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    background: "#2D5A1B",
                    color: "#F5EDDA",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Importeer KML
                </button>
                <div style={{ fontSize: "11px", color: "#bbb", marginTop: "6px" }}>
                  Voeg kampe by uit &apos;n KML-lêer
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
```

- [ ] **Step 5: Verify the full flow end-to-end**

Run `npm run dev` and navigate to a farm's map page:

1. Confirm the "Importeer KML" button appears below the kampe list
2. Click it, select one of the KML files from `kml file/` (e.g., `kml file/april 2026/Hoeksteen Boerdery.kml`)
3. Confirm the preview shows: gold dashed polygons on the satellite map, preview table in the side panel with names and hectares
4. Click a polygon on the map — confirm it highlights and the table row expands to edit form
5. Click a row in the table — confirm the map polygon highlights
6. Edit a name — confirm it updates the label on the map
7. Toggle checkboxes — confirm polygons appear/disappear
8. Check duplicate detection works (if the farm already has blocks with matching names)
9. Click "Importeer N" — confirm blocks are inserted and appear as permanent green blocks
10. Click "Kanselleer" — confirm it returns to normal view without inserting

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/farms/\[id\]/map/page.tsx
git commit -m "feat: wire up KML import flow on farm map page"
```

---

### Task 5: Final Verification & Polish

- [ ] **Step 1: Test with all existing KML files**

Test the import with each of the 4 KML files in the project:

1. `kml file/camps.kml` — 50 placemarks, has cultivar metadata in descriptions
2. `kml file/april 2026/Hoeksteen Boerdery.kml` — 42 placemarks, Google Earth export
3. `kml file/april 2026/MMM Boerdery.kml` — 34 placemarks, Google Earth export
4. `kml file/april 2026/Sterkfontein.kml` — 24 placemarks, Google Earth export

For each file, verify:
- Correct number of blocks parsed
- Names display correctly
- Polygons appear in the right geographic location on the satellite map
- Hectares calculated (should be reasonable values)
- Cultivar parsed from `camps.kml` (should have values like "SST 0147")

- [ ] **Step 2: Test edge cases**

- Try importing when the farm already has blocks (test duplicate detection)
- Try importing, cancelling, then importing again
- Try unchecking all blocks (confirm "Importeer 0" button is disabled)
- Try editing a name to empty string, then importing

- [ ] **Step 3: Run the build to catch any TypeScript errors**

```bash
npm run build
```

Fix any TypeScript errors that appear.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish KML import after testing"
```
