import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { SEVERITY_LEVELS } from "./inspection-utils";

// -- Types --

interface ReportBranding {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
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
  photoUrl: string | null;
  notes: string | null;
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
    grasses: { id: string; abbreviation: string }[];
    broadleaf: { id: string; abbreviation: string }[];
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
  headerBar: { padding: "12 40", marginBottom: 24 },
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

// -- Document --

export function InspectionReport({ data }: { data: ReportData }) {
  const { branding, blocks, heatmap } = data;
  const allHeatmapWeeds = [...heatmap.grasses, ...heatmap.broadleaf];

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" orientation="landscape" style={s.coverPage}>
        <View style={s.coverHeader}>
          {branding.logoUrl && (
            <Image src={branding.logoUrl} style={s.coverLogo} />
          )}
          <Text style={s.coverFarm}>{data.clientName}</Text>
          <Text style={s.coverTitle}>Kamp inspeksie verslag</Text>
          <Text style={s.coverYear}>{data.year}</Text>
          <Text style={s.coverAgent}>{data.agentName}</Text>
          <Text style={{ fontSize: 10, color: "#bbb", marginTop: 4 }}>
            {data.farmName} · {data.stageName}
          </Text>
        </View>
        <View style={s.footer}>
          <Text style={s.footerText}>Powered by WheatPix</Text>
        </View>
      </Page>

      {/* Heatmap Summary */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={[s.headerBar, { backgroundColor: branding.primaryColor }]}>
          <Text style={s.headerText}>Kamp inspeksie {data.year}</Text>
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

        <View style={s.footer}>
          <Text style={s.footerText}>{data.farmName} · {data.stageName} · {data.inspectionDate}</Text>
          {branding.logoUrl && <Image src={branding.logoUrl} style={s.footerLogo} />}
        </View>
      </Page>

      {/* Per-camp pages */}
      {blocks.map((block, i) => (
        <Page key={i} size="A4" orientation="landscape" style={s.page}>
          <View style={[s.headerBar, { backgroundColor: branding.primaryColor }]}>
            <Text style={s.headerText}>Kamp inspeksie {data.year}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 30 }}>
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
            </View>

            {/* Right: photo */}
            {block.photoUrl && (
              <View style={{ width: 320 }}>
                <Image src={block.photoUrl} style={s.photo} />
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
          <Text style={s.headerText}>Kamp inspeksie {data.year}</Text>
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
