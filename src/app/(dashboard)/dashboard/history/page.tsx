"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SEVERITY_LEVELS } from "@/lib/inspection-utils";
import Link from "next/link";

interface WeedSpecies {
  id: string;
  name: string;
  abbreviation: string;
  category: "grass" | "broadleaf";
  sort_order: number;
}

interface WeedEntry {
  severity: number;
  weed_species_id: string;
}

interface InspectionRow {
  id: string;
  farm_id: string;
  block_id: string;
  stage_id: string;
  inspection_date: string;
  crop: string | null;
  cultivar: string | null;
  notes: string | null;
  created_at: string;
  blocks: { name: string; sort_order: number };
  inspection_stages: { name: string };
  farms: { name: string };
  camp_inspection_weeds: WeedEntry[];
}

interface BlockRow {
  id: string;
  blockName: string;
  sortOrder: number;
  crop: string | null;
  cultivar: string | null;
  notes: string | null;
  weeds: Map<string, number>; // weed_species_id -> severity
}

interface InspectionGroup {
  key: string;
  farmName: string;
  farmId: string;
  stageName: string;
  date: string;
  blocks: BlockRow[];
}

export default function HistoryPage() {
  const supabase = createClient();
  const [groups, setGroups] = useState<InspectionGroup[]>([]);
  const [weedSpecies, setWeedSpecies] = useState<WeedSpecies[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: inspData }, { data: weedData }] = await Promise.all([
        supabase
          .from("camp_inspections" as never)
          .select(
            "id, farm_id, block_id, stage_id, inspection_date, crop, cultivar, notes, created_at, blocks(name, sort_order), inspection_stages(name), farms(name), camp_inspection_weeds(severity, weed_species_id)" as never
          )
          .order("created_at" as never, { ascending: false })
          .limit(300),
        supabase
          .from("weed_species" as never)
          .select("id, name, abbreviation, category, sort_order" as never)
          .is("farm_id" as never, null)
          .eq("is_active" as never, true as never)
          .order("category" as never)
          .order("sort_order" as never),
      ]);

      if (weedData) setWeedSpecies(weedData as unknown as WeedSpecies[]);

      const inspections = (inspData || []) as unknown as InspectionRow[];

      const groupMap = new Map<string, InspectionGroup>();
      for (const insp of inspections) {
        const key = `${insp.farm_id}|${insp.stage_id}|${insp.inspection_date}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            key,
            farmName: insp.farms?.name || "—",
            farmId: insp.farm_id,
            stageName: insp.inspection_stages?.name || "—",
            date: insp.inspection_date,
            blocks: [],
          });
        }
        const group = groupMap.get(key)!;
        const weedMap = new Map<string, number>();
        for (const w of insp.camp_inspection_weeds) {
          weedMap.set(w.weed_species_id, w.severity);
        }
        group.blocks.push({
          id: insp.id,
          blockName: insp.blocks?.name || "—",
          sortOrder: (insp.blocks as unknown as { sort_order: number })?.sort_order ?? 0,
          crop: insp.crop,
          cultivar: insp.cultivar,
          notes: insp.notes,
          weeds: weedMap,
        });
      }

      // Sort blocks within each group by sort_order
      for (const group of groupMap.values()) {
        group.blocks.sort((a, b) => a.sortOrder - b.sortOrder);
      }

      setGroups(Array.from(groupMap.values()));
      setLoading(false);
    }
    load();
  }, [supabase]);

  const grasses = weedSpecies.filter((w) => w.category === "grass");
  const broadleaf = weedSpecies.filter((w) => w.category === "broadleaf");

  const severityLabel = (sev: number) => {
    if (sev === 0) return "";
    return SEVERITY_LEVELS[sev as 1 | 2 | 3 | 4].label;
  };

  const severityColor = (sev: number) => {
    if (sev === 0) return "#e8e8e4";
    return SEVERITY_LEVELS[sev as 1 | 2 | 3 | 4].color;
  };

  if (loading) {
    return <div style={{ color: "#999", fontSize: "14px" }}>Laai inspeksies...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          Inspeksies
        </h1>
        <p style={{ fontSize: "14px", color: "#999", margin: "4px 0 0" }}>
          {groups.length} inspeksie{groups.length !== 1 ? "s" : ""}
        </p>
      </div>

      {groups.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "48px",
            textAlign: "center",
            color: "#bbb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          Geen inspeksies gevind nie.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {groups.map((group) => {
            const isExpanded = expandedGroup === group.key;
            const overallMaxSev = Math.max(
              0,
              ...group.blocks.flatMap((b) => [...b.weeds.values()])
            );

            return (
              <div
                key={group.key}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    padding: "18px 20px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>
                      {group.farmName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", fontSize: "12px", color: "#999" }}>
                      <span>
                        {new Date(group.date).toLocaleDateString("af-ZA", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                      <span style={{ padding: "1px 6px", background: "#f0f0ec", borderRadius: "4px", fontSize: "11px", color: "#6b6b6b" }}>
                        {group.stageName}
                      </span>
                      <span style={{ color: "#bbb" }}>
                        {group.blocks.length} kamp{group.blocks.length !== 1 ? "e" : ""}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: severityColor(overallMaxSev) }} />
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#bbb",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.15s",
                      }}
                    >
                      ▸
                    </span>
                  </div>
                </button>

                {/* Spreadsheet table */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #f0f0ec", overflowX: "auto" }}>
                    <table
                      style={{
                        borderCollapse: "collapse",
                        fontSize: "12px",
                        fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                        width: "max-content",
                        minWidth: "100%",
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              position: "sticky",
                              left: 0,
                              background: "#fafaf8",
                              padding: "8px 14px",
                              textAlign: "left",
                              color: "#999",
                              borderBottom: "2px solid #e8e8e4",
                              fontWeight: 600,
                              fontSize: "11px",
                              zIndex: 2,
                              minWidth: "120px",
                            }}
                          >
                            Kampe
                          </th>
                          {grasses.length > 0 && (
                            <th
                              colSpan={grasses.length}
                              style={{
                                padding: "4px 0",
                                textAlign: "center",
                                color: "#4a9a4a",
                                borderBottom: "1px solid #e8e8e4",
                                fontSize: "10px",
                                fontWeight: 700,
                                letterSpacing: "1px",
                              }}
                            >
                              GRASSE
                            </th>
                          )}
                          {broadleaf.length > 0 && (
                            <th
                              colSpan={broadleaf.length}
                              style={{
                                padding: "4px 0",
                                textAlign: "center",
                                color: "#D4890A",
                                borderBottom: "1px solid #e8e8e4",
                                fontSize: "10px",
                                fontWeight: 700,
                                letterSpacing: "1px",
                              }}
                            >
                              BREEBLAAR
                            </th>
                          )}
                        </tr>
                        <tr>
                          <th
                            style={{
                              position: "sticky",
                              left: 0,
                              background: "#fafaf8",
                              padding: "6px 14px",
                              borderBottom: "2px solid #e8e8e4",
                              zIndex: 2,
                            }}
                          />
                          {[...grasses, ...broadleaf].map((w) => (
                            <th
                              key={w.id}
                              style={{
                                padding: "6px 4px",
                                color: "#999",
                                borderBottom: "2px solid #e8e8e4",
                                textAlign: "center",
                                minWidth: "32px",
                                fontSize: "10px",
                                fontWeight: 600,
                              }}
                              title={w.name}
                            >
                              {w.abbreviation}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.blocks.map((block, bi) => (
                          <tr key={block.id}>
                            <td
                              style={{
                                position: "sticky",
                                left: 0,
                                background: "#fff",
                                padding: "10px 14px",
                                borderBottom: bi < group.blocks.length - 1 ? "1px solid #f0f0ec" : "none",
                                fontWeight: 500,
                                fontSize: "12px",
                                color: "#1a1a1a",
                                zIndex: 2,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Link
                                href={`/dashboard/history/${block.id}`}
                                style={{ color: "#1a1a1a", textDecoration: "none" }}
                              >
                                {block.blockName}
                              </Link>
                            </td>
                            {[...grasses, ...broadleaf].map((w) => {
                              const sev = block.weeds.get(w.id) || 0;
                              return (
                                <td
                                  key={w.id}
                                  style={{
                                    textAlign: "center",
                                    padding: "8px 4px",
                                    borderBottom: bi < group.blocks.length - 1 ? "1px solid #f0f0ec" : "none",
                                    color: sev > 0 ? severityColor(sev) : "#e8e8e4",
                                    fontWeight: sev > 0 ? 700 : 400,
                                    fontSize: sev >= 3 ? "10px" : "12px",
                                  }}
                                >
                                  {sev > 0 ? severityLabel(sev) : "·"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
