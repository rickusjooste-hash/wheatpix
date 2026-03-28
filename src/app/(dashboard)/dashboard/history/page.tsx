"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SEVERITY_LEVELS } from "@/lib/inspection-utils";
import Link from "next/link";

interface InspectionRow {
  id: string;
  farm_id: string;
  block_id: string;
  stage_id: string;
  inspection_date: string;
  notes: string | null;
  created_at: string;
  blocks: { name: string };
  inspection_stages: { name: string };
  farms: { name: string };
  camp_inspection_weeds: { severity: number; weed_species_id: string }[];
  camp_inspection_herbicides: { herbicide_id: string }[];
}

interface InspectionGroup {
  key: string;
  farmName: string;
  farmId: string;
  stageName: string;
  stageId: string;
  date: string;
  blocks: {
    id: string;
    blockName: string;
    notes: string | null;
    maxSeverity: number;
    weedCount: number;
    herbicideCount: number;
  }[];
}

export default function HistoryPage() {
  const supabase = createClient();
  const [groups, setGroups] = useState<InspectionGroup[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("camp_inspections" as never)
        .select(
          "id, farm_id, block_id, stage_id, inspection_date, notes, created_at, blocks(name), inspection_stages(name), farms(name), camp_inspection_weeds(severity, weed_species_id), camp_inspection_herbicides(herbicide_id)" as never
        )
        .order("created_at" as never, { ascending: false })
        .limit(200);

      const inspections = (data || []) as unknown as InspectionRow[];

      // Group by farm + stage + date
      const groupMap = new Map<string, InspectionGroup>();
      for (const insp of inspections) {
        const key = `${insp.farm_id}|${insp.stage_id}|${insp.inspection_date}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            key,
            farmName: insp.farms?.name || "—",
            farmId: insp.farm_id,
            stageName: insp.inspection_stages?.name || "—",
            stageId: insp.stage_id,
            date: insp.inspection_date,
            blocks: [],
          });
        }
        const group = groupMap.get(key)!;
        const maxSev = Math.max(0, ...insp.camp_inspection_weeds.map((w) => w.severity));
        const weedCount = insp.camp_inspection_weeds.filter((w) => w.severity > 0).length;
        group.blocks.push({
          id: insp.id,
          blockName: insp.blocks?.name || "—",
          notes: insp.notes,
          maxSeverity: maxSev,
          weedCount,
          herbicideCount: insp.camp_inspection_herbicides?.length || 0,
        });
      }

      setGroups(Array.from(groupMap.values()));
      setLoading(false);
    }
    load();
  }, [supabase]);

  const severityColors = ["#ccc", "#4a9a4a", "#d4a017", "#e87b35", "#e8413c"];

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
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {groups.map((group) => {
            const isExpanded = expandedGroup === group.key;
            const overallMaxSev = Math.max(0, ...group.blocks.map((b) => b.maxSeverity));
            const totalWeeds = group.blocks.reduce((s, b) => s + b.weedCount, 0);
            const totalHerbicides = group.blocks.reduce((s, b) => s + b.herbicideCount, 0);

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
                {/* Group header — clickable */}
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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "4px",
                        fontSize: "12px",
                        color: "#999",
                      }}
                    >
                      <span>
                        {new Date(group.date).toLocaleDateString("af-ZA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span
                        style={{
                          padding: "1px 6px",
                          background: "#f0f0ec",
                          borderRadius: "4px",
                          fontSize: "11px",
                          color: "#6b6b6b",
                        }}
                      >
                        {group.stageName}
                      </span>
                      <span style={{ color: "#bbb" }}>
                        {group.blocks.length} kamp{group.blocks.length !== 1 ? "e" : ""}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {totalWeeds > 0 && (
                      <span style={{ fontSize: "12px", color: "#6b6b6b" }}>
                        {totalWeeds} onkruid
                      </span>
                    )}
                    {totalHerbicides > 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#D4890A",
                          fontFamily: "var(--font-jetbrains), monospace",
                        }}
                      >
                        {totalHerbicides} middel{totalHerbicides !== 1 ? "s" : ""}
                      </span>
                    )}
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: severityColors[overallMaxSev],
                      }}
                    />
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

                {/* Expanded block list */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #f0f0ec" }}>
                    {group.blocks.map((block, i) => (
                      <Link
                        key={block.id}
                        href={`/dashboard/history/${block.id}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px 20px 14px 36px",
                          borderBottom: i < group.blocks.length - 1 ? "1px solid #f0f0ec" : "none",
                          textDecoration: "none",
                          transition: "background 0.1s",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>
                            {block.blockName}
                          </div>
                          {block.notes && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#bbb",
                                marginTop: "2px",
                                maxWidth: "350px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {block.notes}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {block.weedCount > 0 && (
                            <span style={{ fontSize: "12px", color: "#6b6b6b" }}>
                              {block.weedCount}
                            </span>
                          )}
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: severityColors[block.maxSeverity],
                            }}
                          />
                          <span style={{ color: "#ccc", fontSize: "14px" }}>→</span>
                        </div>
                      </Link>
                    ))}
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
