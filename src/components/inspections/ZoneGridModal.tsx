"use client";

import { useState, useMemo } from "react";
import { isPointInPolygon } from "@/lib/inspection-utils";

interface ZoneGridModalProps {
  geometry: { lat: number; lng: number }[];
  selectedZones: number[];
  onSave: (zones: number[]) => void;
  onClose: () => void;
  weedName: string;
  color: string;
}

const GRID_SIZE = 4;
const SVG_SIZE = 300;
const PADDING = 20;

/** Convert lat/lng polygon to SVG coordinates, fitting within SVG_SIZE with padding */
function geoToSvg(polygon: { lat: number; lng: number }[]) {
  const lats = polygon.map((p) => p.lat);
  const lngs = polygon.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 1e-6;
  const lngRange = maxLng - minLng || 1e-6;
  const drawSize = SVG_SIZE - PADDING * 2;

  // Preserve aspect ratio
  const scale = Math.min(drawSize / lngRange, drawSize / latRange);
  const offsetX = PADDING + (drawSize - lngRange * scale) / 2;
  const offsetY = PADDING + (drawSize - latRange * scale) / 2;

  const points = polygon.map((p) => ({
    x: offsetX + (p.lng - minLng) * scale,
    y: offsetY + (maxLat - p.lat) * scale, // flip Y: lat increases north, SVG Y increases down
  }));

  // Bounding box in SVG coords
  const svgMinX = Math.min(...points.map((p) => p.x));
  const svgMaxX = Math.max(...points.map((p) => p.x));
  const svgMinY = Math.min(...points.map((p) => p.y));
  const svgMaxY = Math.max(...points.map((p) => p.y));

  return { points, bbox: { minX: svgMinX, maxX: svgMaxX, minY: svgMinY, maxY: svgMaxY }, minLat, maxLat, minLng, maxLng };
}

export default function ZoneGridModal({
  geometry,
  selectedZones,
  onSave,
  onClose,
  weedName,
  color,
}: ZoneGridModalProps) {
  const [zones, setZones] = useState<number[]>(selectedZones);

  const { points, bbox, minLat, maxLat, minLng, maxLng } = useMemo(
    () => geoToSvg(geometry),
    [geometry]
  );

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  // Compute which grid cells overlap the polygon (check center + all 4 corners)
  const cellInfo = useMemo(() => {
    const latRange = maxLat - minLat || 1e-6;
    const lngRange = maxLng - minLng || 1e-6;
    const cellW = (bbox.maxX - bbox.minX) / GRID_SIZE;
    const cellH = (bbox.maxY - bbox.minY) / GRID_SIZE;

    const svxToGeo = (sx: number, sy: number) => ({
      lng: minLng + ((sx - bbox.minX) / (bbox.maxX - bbox.minX)) * lngRange,
      lat: maxLat - ((sy - bbox.minY) / (bbox.maxY - bbox.minY)) * latRange,
    });

    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
      const col = idx % GRID_SIZE;
      const row = Math.floor(idx / GRID_SIZE);
      const x = bbox.minX + col * cellW;
      const y = bbox.minY + row * cellH;

      // Check center + all 4 corners — if any point is inside, the cell is tappable
      const samplePoints = [
        svxToGeo(x + cellW * 0.5, y + cellH * 0.5), // center
        svxToGeo(x, y),                               // top-left
        svxToGeo(x + cellW, y),                       // top-right
        svxToGeo(x, y + cellH),                       // bottom-left
        svxToGeo(x + cellW, y + cellH),               // bottom-right
      ];
      const inside = samplePoints.some((p) => isPointInPolygon(p, geometry));

      return {
        idx,
        x,
        y,
        w: cellW,
        h: cellH,
        inside,
      };
    });
  }, [bbox, minLat, maxLat, minLng, maxLng, geometry]);

  const toggleZone = (idx: number) => {
    setZones((prev) =>
      prev.includes(idx) ? prev.filter((z) => z !== idx) : [...prev, idx]
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
        }}
      />
      <div
        style={{
          position: "relative",
          background: "#111111",
          borderTop: "1px solid #333333",
          borderRadius: "16px 16px 0 0",
          padding: "20px",
          maxWidth: "480px",
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#eeeeee" }}>
              {weedName}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#666666",
                marginTop: "2px",
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
              }}
            >
              Tik op sones waar dit voorkom
            </div>
          </div>
          {zones.length > 0 && (
            <span
              style={{
                fontSize: "11px",
                color,
                fontWeight: 700,
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
              }}
            >
              {zones.length} sone{zones.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <svg
            width={SVG_SIZE}
            height={SVG_SIZE}
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            style={{ touchAction: "manipulation" }}
          >
            <defs>
              <clipPath id="block-clip">
                <path d={pathD} />
              </clipPath>
            </defs>

            {/* Block outline */}
            <path
              d={pathD}
              fill="#1a1a1a"
              stroke="#333333"
              strokeWidth="1.5"
            />

            {/* Grid cells clipped to polygon */}
            <g clipPath="url(#block-clip)">
              {cellInfo.map((cell) => {
                if (!cell.inside) return null;
                const selected = zones.includes(cell.idx);
                return (
                  <rect
                    key={cell.idx}
                    x={cell.x}
                    y={cell.y}
                    width={cell.w}
                    height={cell.h}
                    fill={selected ? color : "transparent"}
                    fillOpacity={selected ? 0.35 : 0}
                    stroke="#333333"
                    strokeWidth="0.5"
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleZone(cell.idx)}
                  />
                );
              })}
            </g>

            {/* Block outline on top for clarity */}
            <path
              d={pathD}
              fill="none"
              stroke="#555555"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "16px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              background: "#1a1a1a",
              border: "1px solid #333333",
              borderRadius: "8px",
              color: "#888888",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Kanselleer
          </button>
          <button
            onClick={() => onSave(zones)}
            style={{
              flex: 1,
              padding: "12px",
              background: "linear-gradient(135deg, #2a6a2a, #3a8a3a)",
              border: "1px solid #4a9a4a",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Stoor
          </button>
        </div>
      </div>
    </div>
  );
}
