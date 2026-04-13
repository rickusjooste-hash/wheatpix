import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Path,
  Rect,
  ClipPath,
  Defs,
} from "@react-pdf/renderer";
import { SEVERITY_LEVELS, isPointInPolygon } from "./inspection-utils";

// -- Types --

interface ReportBranding {
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  headerImageUrl: string | null;
  coverImageUrl: string | null;
  badgeImageUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface ReportWeed {
  name: string;
  abbreviation: string;
  category: "grass" | "broadleaf";
  severity: number;
}

interface ReportHerbicide {
  name: string;
  activeIngredients: string[];
}

interface ReportBlock {
  name: string;
  weeds: ReportWeed[];
  herbicides: ReportHerbicide[];
  photoUrls: string[];
  notes: string | null;
  geometry: { lat: number; lng: number }[] | null;
  weedZones: { weedName: string; zones: number[]; color: string }[];
}

interface ReportHeatmapRow {
  blockName: string;
  severities: Map<string, number>; // weedId -> severity
}

export interface ReportData {
  branding: ReportBranding;
  farmName: string;
  clientName: string;
  stageName: string;
  inspectionDate: string;
  agentName: string;
  year: number;
  blocks: ReportBlock[];
  heatmap: {
    rows: ReportHeatmapRow[];
    grasses: { id: string; name: string; abbreviation: string }[];
    broadleaf: { id: string; name: string; abbreviation: string }[];
  };
}

// -- Styles --

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1a1a1a" },
  coverPage: { padding: 0, fontFamily: "Helvetica" },
  // Cover
  coverHeader: { padding: 40, paddingBottom: 0 },
  coverLogo: { width: 120, height: 60, objectFit: "contain" as const, marginBottom: 30 },
  coverFarm: { fontSize: 32, fontWeight: "bold", color: "#1a1a1a", marginBottom: 8 },
  coverTitle: { fontSize: 16, color: "#666", marginBottom: 4 },
  coverYear: { fontSize: 36, fontWeight: "bold", color: "#1a1a1a", marginTop: 8 },
  coverAgent: { fontSize: 12, color: "#999", marginTop: 12 },
  // Header bar
  headerBar: { padding: "12 40", marginBottom: 24, position: "relative" as const, overflow: "hidden" as const, flexDirection: "row" as const, alignItems: "center" as const },
  headerText: { fontSize: 16, fontWeight: "bold", color: "#ffffff" },
  // Camp page
  campLabel: { fontSize: 10, color: "#999", marginBottom: 4, textTransform: "uppercase" as const },
  campName: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", color: "#999", marginBottom: 8, marginTop: 16, textTransform: "uppercase" as const },
  listItem: { fontSize: 11, marginBottom: 4, paddingLeft: 12 },
  photo: { width: "100%", maxHeight: 280, objectFit: "contain" as const, borderRadius: 4, marginTop: 12 },
  // Heatmap
  table: { width: "100%", marginTop: 8 },
  tableRow: { flexDirection: "row" as const, borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0" },
  tableHeaderRow: { flexDirection: "row" as const, borderBottomWidth: 1, borderBottomColor: "#ccc", backgroundColor: "#f7f7f5" },
  tableCellName: { width: 90, padding: 4, fontSize: 8, fontWeight: "bold" },
  tableCell: { width: 22, padding: 3, fontSize: 7, textAlign: "center" as const },
  tableCategoryHeader: { fontSize: 7, fontWeight: "bold", textAlign: "center" as const, padding: 2 },
  // Footer
  footer: { position: "absolute" as const, bottom: 20, left: 40, right: 40, flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  footerText: { fontSize: 7, color: "#bbb" },
  footerLogo: { height: 16, objectFit: "contain" as const },
  // Closing
  closingCenter: { flex: 1, justifyContent: "center" as const, alignItems: "center" as const },
  closingLogo: { width: 160, height: 80, objectFit: "contain" as const, marginBottom: 16 },
  closingCompany: { fontSize: 18, fontWeight: "bold", color: "#1a1a1a", marginBottom: 24 },
  closingPowered: { fontSize: 9, color: "#bbb" },
});

const sevLabel = (sev: number) => {
  if (sev <= 0 || sev > 4) return "";
  return SEVERITY_LEVELS[sev as 1 | 2 | 3 | 4].label;
};

const sevColor = (sev: number) => {
  if (sev <= 0 || sev > 4) return "#e8e8e4";
  return SEVERITY_LEVELS[sev as 1 | 2 | 3 | 4].color;
};

// -- Block Polygon Component --

const GRID_SIZE = 4;
const POLY_SIZE = 150;
const POLY_PAD = 8;

function geoToSvgPoints(polygon: { lat: number; lng: number }[]) {
  const lats = polygon.map((p) => p.lat);
  const lngs = polygon.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 1e-6;
  const lngRange = maxLng - minLng || 1e-6;
  const draw = POLY_SIZE - POLY_PAD * 2;
  const scale = Math.min(draw / lngRange, draw / latRange);
  const ox = POLY_PAD + (draw - lngRange * scale) / 2;
  const oy = POLY_PAD + (draw - latRange * scale) / 2;

  const pts = polygon.map((p) => ({
    x: ox + (p.lng - minLng) * scale,
    y: oy + (maxLat - p.lat) * scale,
  }));

  const bx = Math.min(...pts.map((p) => p.x));
  const by = Math.min(...pts.map((p) => p.y));
  const bw = Math.max(...pts.map((p) => p.x)) - bx;
  const bh = Math.max(...pts.map((p) => p.y)) - by;

  return { pts, bbox: { x: bx, y: by, w: bw, h: bh }, minLat, maxLat, minLng, maxLng };
}

function BlockPolygon({ geometry, weedZones }: { geometry: { lat: number; lng: number }[]; weedZones: { zones: number[]; color: string }[] }) {
  const { pts, bbox, minLat, maxLat, minLng, maxLng } = geoToSvgPoints(geometry);
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  // Merge all zones with their colors
  const allZones = new Map<number, string>();
  for (const wz of weedZones) {
    for (const z of wz.zones) {
      if (!allZones.has(z)) allZones.set(z, wz.color);
    }
  }

  const cellW = bbox.w / GRID_SIZE;
  const cellH = bbox.h / GRID_SIZE;
  const latRange = maxLat - minLat || 1e-6;
  const lngRange = maxLng - minLng || 1e-6;

  const cells: { idx: number; x: number; y: number; w: number; h: number; inside: boolean }[] = [];
  for (let idx = 0; idx < GRID_SIZE * GRID_SIZE; idx++) {
    const col = idx % GRID_SIZE;
    const row = Math.floor(idx / GRID_SIZE);
    const x = bbox.x + col * cellW;
    const y = bbox.y + row * cellH;

    const svxToGeo = (sx: number, sy: number) => ({
      lng: minLng + ((sx - bbox.x) / bbox.w) * lngRange,
      lat: maxLat - ((sy - bbox.y) / bbox.h) * latRange,
    });

    const samples = [
      svxToGeo(x + cellW * 0.5, y + cellH * 0.5),
      svxToGeo(x, y), svxToGeo(x + cellW, y),
      svxToGeo(x, y + cellH), svxToGeo(x + cellW, y + cellH),
    ];
    const inside = samples.some((p) => isPointInPolygon(p, geometry));
    cells.push({ idx, x, y, w: cellW, h: cellH, inside });
  }

  return (
    <Svg width={POLY_SIZE} height={POLY_SIZE} viewBox={`0 0 ${POLY_SIZE} ${POLY_SIZE}`}>
      <Defs>
        <ClipPath id="bp">
          <Path d={pathD} />
        </ClipPath>
      </Defs>
      <Path d={pathD} fill="#f0f0ec" stroke="#d4d4d0" strokeWidth={1} />
      {cells.map((c) => {
        if (!c.inside) return null;
        const color = allZones.get(c.idx);
        return (
          <Rect
            key={c.idx}
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            fill={color || "transparent"}
            opacity={color ? 0.4 : 0}
            stroke="#d4d4d0"
            strokeWidth={0.3}
            clipPath="url(#bp)"
          />
        );
      })}
      <Path d={pathD} fill="none" stroke="#999" strokeWidth={1} />
    </Svg>
  );
}

// -- Document --

export function InspectionReport({ data }: { data: ReportData }) {
  const { branding, blocks, heatmap } = data;
  const allHeatmapWeeds = [...heatmap.grasses, ...heatmap.broadleaf];

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" orientation="landscape" style={s.coverPage}>
        <View style={{ flex: 1, flexDirection: "row" as const }}>
          {/* Left content */}
          <View style={{ flex: 1, padding: 50, justifyContent: "center" as const }}>
            {branding.logoUrl && (
              <Image src={branding.logoUrl} style={{ width: 140, height: 70, objectFit: "contain" as const, marginBottom: 6 }} />
            )}
            {branding.tagline && (
              <Text style={{ fontSize: 8, color: branding.secondaryColor, letterSpacing: 1.5, marginBottom: 30 }}>
                {branding.tagline.toUpperCase()}
              </Text>
            )}
            <Text style={{ fontSize: 36, fontWeight: "bold", color: branding.primaryColor }}>
              {data.clientName}
            </Text>
            <Text style={{ fontSize: 16, color: branding.primaryColor, marginTop: 6 }}>
              Kamp inspeksie verslag
            </Text>
            <Text style={{ fontSize: 48, fontWeight: "bold", color: "#1a1a1a", marginTop: 4 }}>
              {data.year}
            </Text>
            <Text style={{ fontSize: 12, color: "#666", marginTop: 16, fontStyle: "italic" }}>
              {data.agentName}
            </Text>
          </View>
          {/* Right decorative image */}
          {branding.coverImageUrl && (
            <View style={{ width: "40%" }}>
              <Image src={branding.coverImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" as const }} />
            </View>
          )}
        </View>
        <View style={s.footer}>
          <Text style={{ fontSize: 8, color: "#ccc" }}>Powered by WheatPix</Text>
        </View>
      </Page>

      {/* Heatmap Summary */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={[s.headerBar, { backgroundColor: branding.primaryColor }]}>
          {branding.headerImageUrl && (
            <Image src={branding.headerImageUrl} style={{ position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0, objectFit: "cover" as const }} />
          )}
          {branding.badgeImageUrl && (
            <Image src={branding.badgeImageUrl} style={{ width: 30, height: 30, objectFit: "contain" as const, position: "absolute" as const, left: 12, top: 3 }} />
          )}
          <Text style={[s.headerText, { textAlign: "right" as const, flex: 1 }]}>Kamp inspeksie {data.year}</Text>
        </View>

        {/* Category headers */}
        <View style={{ flexDirection: "row", marginBottom: 2 }}>
          <View style={{ width: 90 }} />
          {heatmap.grasses.length > 0 && (
            <View style={{ width: heatmap.grasses.length * 22 }}>
              <Text style={[s.tableCategoryHeader, { color: "#4a9a4a" }]}>GRASSE</Text>
            </View>
          )}
          {heatmap.broadleaf.length > 0 && (
            <View style={{ width: heatmap.broadleaf.length * 22 }}>
              <Text style={[s.tableCategoryHeader, { color: "#D4890A" }]}>BREEBLAAR</Text>
            </View>
          )}
        </View>

        {/* Column headers */}
        <View style={s.tableHeaderRow}>
          <Text style={s.tableCellName}>Kampe</Text>
          {allHeatmapWeeds.map((w) => (
            <Text key={w.id} style={[s.tableCell, { fontWeight: "bold", fontSize: 7 }]}>
              {w.abbreviation}
            </Text>
          ))}
        </View>

        {/* Data rows */}
        {heatmap.rows.map((row, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.tableCellName}>{row.blockName}</Text>
            {allHeatmapWeeds.map((w) => {
              const sev = row.severities.get(w.id) || 0;
              return (
                <Text
                  key={w.id}
                  style={[s.tableCell, { color: sevColor(sev), fontWeight: sev > 0 ? "bold" : "normal" }]}
                >
                  {sev > 0 ? sevLabel(sev) : "·"}
                </Text>
              );
            })}
          </View>
        ))}

        {/* Legends */}
        <View style={{ flexDirection: "row", marginTop: 16, gap: 24 }}>
          {/* Weed legend */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7, fontWeight: "bold", color: "#999", marginBottom: 4, textTransform: "uppercase" as const }}>Onkruid Sleutel</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              {allHeatmapWeeds.map((w) => (
                <Text key={w.id} style={{ fontSize: 6, color: "#555" }}>
                  <Text style={{ fontWeight: "bold" }}>{w.abbreviation}</Text> = {w.name}
                </Text>
              ))}
            </View>
          </View>
          {/* Severity legend */}
          <View>
            <Text style={{ fontSize: 7, fontWeight: "bold", color: "#999", marginBottom: 4, textTransform: "uppercase" as const }}>Graad Sleutel</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {SEVERITY_LEVELS.filter((sl) => sl.level > 0).map((sl) => (
                <View key={sl.level} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: sl.color }}>{sl.label}</Text>
                  <Text style={{ fontSize: 6, color: "#555" }}>{sl.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>{data.farmName} · {data.stageName} · {data.inspectionDate}</Text>
          {branding.logoUrl && <Image src={branding.logoUrl} style={s.footerLogo} />}
        </View>
      </Page>

      {/* Per-camp pages */}
      {blocks.map((block, i) => (
        <Page key={i} size="A4" orientation="landscape" style={s.page}>
          <View style={[s.headerBar, { backgroundColor: branding.primaryColor }]}>
            {branding.headerImageUrl && (
              <Image src={branding.headerImageUrl} style={{ position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0, objectFit: "cover" as const }} />
            )}
            {branding.badgeImageUrl && (
              <Image src={branding.badgeImageUrl} style={{ width: 30, height: 30, objectFit: "contain" as const, position: "absolute" as const, left: 12, top: 3 }} />
            )}
            <Text style={[s.headerText, { textAlign: "right" as const, flex: 1 }]}>Kamp inspeksie {data.year}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 24 }}>
            {/* Left: camp info */}
            <View style={{ flex: 1 }}>
              <Text style={s.campLabel}>Kampnaam:</Text>
              <Text style={s.campName}>{block.name.toUpperCase()}</Text>

              {block.weeds.length > 0 && (
                <View>
                  {block.weeds.map((w, wi) => (
                    <Text key={wi} style={s.listItem}>
                      {wi + 1}. {w.name}{w.severity >= 3 ? " (baie)" : w.severity <= 1 ? " (min)" : ""}
                    </Text>
                  ))}
                </View>
              )}

              {block.herbicides.length > 0 && (
                <View>
                  <Text style={s.sectionTitle}>Strategie:</Text>
                  {block.herbicides.map((h, hi) => (
                    <Text key={hi} style={s.listItem}>
                      {hi + 1}. {h.name}
                    </Text>
                  ))}
                </View>
              )}

              {block.notes && (
                <View>
                  <Text style={s.sectionTitle}>Notas:</Text>
                  <Text style={{ fontSize: 9, color: "#666", paddingLeft: 12 }}>{block.notes}</Text>
                </View>
              )}

              {/* Block polygon with zones */}
              {block.geometry && block.geometry.length >= 3 && (
                <View style={{ marginTop: 12 }}>
                  <BlockPolygon geometry={block.geometry} weedZones={block.weedZones} />
                </View>
              )}
            </View>

            {/* Right: photos */}
            {block.photoUrls.length > 0 && (
              <View style={{ width: 300 }}>
                {block.photoUrls.map((url, pi) => (
                  <Image key={pi} src={url} style={[s.photo, pi > 0 ? { marginTop: 8 } : {}]} />
                ))}
              </View>
            )}
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Powered by WheatPix</Text>
            {branding.logoUrl && <Image src={branding.logoUrl} style={s.footerLogo} />}
          </View>
        </Page>
      ))}

      {/* Closing page */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={[s.headerBar, { backgroundColor: branding.primaryColor }]}>
          {branding.headerImageUrl && (
            <Image src={branding.headerImageUrl} style={{ position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0, objectFit: "cover" as const }} />
          )}
          {branding.badgeImageUrl && (
            <Image src={branding.badgeImageUrl} style={{ width: 30, height: 30, objectFit: "contain" as const, position: "absolute" as const, left: 12, top: 3 }} />
          )}
          <Text style={[s.headerText, { textAlign: "right" as const, flex: 1 }]}>Kamp inspeksie {data.year}</Text>
        </View>
        <View style={s.closingCenter}>
          {branding.logoUrl && <Image src={branding.logoUrl} style={s.closingLogo} />}
          <Text style={s.closingCompany}>{branding.companyName}</Text>
          <Text style={s.closingPowered}>Powered by WheatPix</Text>
        </View>
      </Page>
    </Document>
  );
}
