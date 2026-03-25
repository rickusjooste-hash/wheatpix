// Kamp Inspeksie — severity scale, types, and helpers

export const SEVERITY_LEVELS = [
  { level: 0, label: "", name: "Niks", color: "#2a2a2a", bg: "#1a1a1a", border: "#333333" },
  { level: 1, label: "−", name: "Baie Min", color: "#5a8a5a", bg: "#1a2a1a", border: "#3a5a3a" },
  { level: 2, label: "X", name: "Min", color: "#d4a017", bg: "#2c2510", border: "#6b5210" },
  { level: 3, label: "XX", name: "Redelik", color: "#e87b35", bg: "#2c1a0e", border: "#7a3d15" },
  { level: 4, label: "XXX", name: "Baie", color: "#e8413c", bg: "#2c0e0e", border: "#7a1515" },
] as const;

export type SeverityLevel = 0 | 1 | 2 | 3 | 4;

export interface WeedSpecies {
  id: string;
  farm_id: string | null;
  name: string;
  abbreviation: string;
  category: "grass" | "broadleaf";
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface InspectionStage {
  id: string;
  farm_id: string;
  name: string;
  sort_order: number;
  is_default: boolean;
}

export interface Block {
  id: string;
  farm_id: string;
  name: string;
  sort_order: number;
  geometry: { lat: number; lng: number }[] | null;
  is_active: boolean;
}

export interface BlockSeason {
  id: string;
  block_id: string;
  season: number;
  crop: string | null;
  cultivar: string | null;
  status: "planned" | "planted" | "harvested";
  yield_ton_per_ha: number | null;
  notes: string | null;
}

export interface CampInspection {
  id: string;
  farm_id: string;
  block_id: string;
  stage_id: string;
  inspector_id: string;
  inspection_date: string;
  gps_lat: number | null;
  gps_lng: number | null;
  crop: string | null;
  cultivar: string | null;
  notes: string | null;
}

export interface WeedSeverityEntry {
  weed_species_id: string;
  severity: SeverityLevel;
}

// Map of weed_species_id -> severity for a single block inspection
export type WeedData = Record<string, SeverityLevel>;

/** Point-in-polygon check using ray casting */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Find which block contains a GPS point */
export function findBlockByLocation(
  point: { lat: number; lng: number },
  blocks: Block[]
): Block | null {
  for (const block of blocks) {
    if (block.geometry && isPointInPolygon(point, block.geometry)) {
      return block;
    }
  }
  return null;
}

/** Cycle severity: 0 → 1 → 2 → 3 → 4 → 0 */
export function nextSeverity(current: SeverityLevel): SeverityLevel {
  return ((current + 1) % 5) as SeverityLevel;
}
