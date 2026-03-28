"use client";

import { useMemo } from "react";
import { isPointInPolygon } from "@/lib/inspection-utils";

interface ZoneDisplayProps {
  geometry: { lat: number; lng: number }[];
  zones: number[];
  color: string;
  size?: number;
}

const GRID_SIZE = 4;

function geoToSvg(polygon: { lat: number; lng: number }[], svgSize: number, padding: number) {
  const lats = polygon.map((p) => p.lat);
  const lngs = polygon.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 1e-6;
  const lngRange = maxLng - minLng || 1e-6;
  const drawSize = svgSize - padding * 2;
  const scale = Math.min(drawSize / lngRange, drawSize / latRange);
  const offsetX = padding + (drawSize - lngRange * scale) / 2;
  const offsetY = padding + (drawSize - latRange * scale) / 2;

  const points = polygon.map((p) => ({
    x: offsetX + (p.lng - minLng) * scale,
    y: offsetY + (maxLat - p.lat) * scale,
  }));

  const svgMinX = Math.min(...points.map((p) => p.x));
  const svgMaxX = Math.max(...points.map((p) => p.x));
  const svgMinY = Math.min(...points.map((p) => p.y));
  const svgMaxY = Math.max(...points.map((p) => p.y));

  return { points, bbox: { minX: svgMinX, maxX: svgMaxX, minY: svgMinY, maxY: svgMaxY }, minLat, maxLat, minLng, maxLng };
}

export default function ZoneDisplay({ geometry, zones, color, size = 120 }: ZoneDisplayProps) {
  const padding = 8;
  const { points, bbox, minLat, maxLat, minLng, maxLng } = useMemo(
    () => geoToSvg(geometry, size, padding),
    [geometry, size]
  );

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const cells = useMemo(() => {
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

      const samplePoints = [
        svxToGeo(x + cellW * 0.5, y + cellH * 0.5),
        svxToGeo(x, y),
        svxToGeo(x + cellW, y),
        svxToGeo(x, y + cellH),
        svxToGeo(x + cellW, y + cellH),
      ];
      const inside = samplePoints.some((p) => isPointInPolygon(p, geometry));

      return { idx, x, y, w: cellW, h: cellH, inside };
    });
  }, [bbox, minLat, maxLat, minLng, maxLng, geometry]);

  const zoneSet = new Set(zones);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <clipPath id={`zone-clip-${zones.join("-")}`}>
          <path d={pathD} />
        </clipPath>
      </defs>
      <path d={pathD} fill="#f0f0ec" stroke="#d4d4d0" strokeWidth="1" />
      <g clipPath={`url(#zone-clip-${zones.join("-")})`}>
        {cells.map((cell) => {
          if (!cell.inside) return null;
          const selected = zoneSet.has(cell.idx);
          return (
            <rect
              key={cell.idx}
              x={cell.x}
              y={cell.y}
              width={cell.w}
              height={cell.h}
              fill={selected ? color : "transparent"}
              fillOpacity={selected ? 0.4 : 0}
              stroke="#d4d4d0"
              strokeWidth="0.3"
            />
          );
        })}
      </g>
      <path d={pathD} fill="none" stroke="#999" strokeWidth="1" />
    </svg>
  );
}
