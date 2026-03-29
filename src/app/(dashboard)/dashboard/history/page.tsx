"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SEVERITY_LEVELS } from "@/lib/inspection-utils";
import ZoneDisplay from "@/components/dashboard/ZoneDisplay";
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
  notes: string | null;
  zones: number[] | null;
}

interface WeedCellData {
  severity: number;
  notes: string | null;
  zones: number[] | null;
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
  blocks: { name: string; sort_order: number; geometry: { lat: number; lng: number }[] | null };
  inspection_stages: { name: string };
  farms: { name: string; client_id: string | null; clients: { name: string } | null };
  camp_inspection_weeds: WeedEntry[];
}

interface BlockRow {
  id: string;
  blockName: string;
  sortOrder: number;
  crop: string | null;
  cultivar: string | null;
  notes: string | null;
  geometry: { lat: number; lng: number }[] | null;
  weeds: Map<string, WeedCellData>;
}

interface InspectionGroup {
  key: string;
  clientName: string;
  farmName: string;
  farmId: string;
  stageName: string;
  stageId: string;
  date: string;
  blocks: BlockRow[];
}

export default function HistoryPage() {
  const supabase = createClient();
  const [groups, setGroups] = useState<InspectionGroup[]>([]);
  const [weedSpecies, setWeedSpecies] = useState<WeedSpecies[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ key: string; msg: string } | null>(null);
  const [activePopover, setActivePopover] = useState<{
    blockId: string;
    weedId: string;
    data: WeedCellData;
    weedName: string;
    geometry: { lat: number; lng: number }[] | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: inspData }, { data: weedData }] = await Promise.all([
        supabase
          .from("camp_inspections" as never)
          .select(
            "id, farm_id, block_id, stage_id, inspection_date, crop, cultivar, notes, created_at, blocks(name, sort_order, geometry), inspection_stages(name), farms(name, client_id, clients(name)), camp_inspection_weeds(severity, weed_species_id, notes, zones)" as never
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
            clientName: (insp.farms?.clients as { name: string } | null)?.name || "—",
            farmName: insp.farms?.name || "—",
            farmId: insp.farm_id,
            stageName: insp.inspection_stages?.name || "—",
            stageId: insp.stage_id,
            date: insp.inspection_date,
            blocks: [],
          });
        }
        const group = groupMap.get(key)!;
        const weedMap = new Map<string, WeedCellData>();
        for (const w of insp.camp_inspection_weeds) {
          weedMap.set(w.weed_species_id, { severity: w.severity, notes: w.notes, zones: w.zones });
        }
        group.blocks.push({
          id: insp.id,
          blockName: insp.blocks?.name || "—",
          sortOrder: (insp.blocks as unknown as { sort_order: number })?.sort_order ?? 0,
          crop: insp.crop,
          cultivar: insp.cultivar,
          notes: insp.notes,
          geometry: insp.blocks?.geometry || null,
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

  const handleDownload = async (group: InspectionGroup, format: "pdf" | "xlsx") => {
    setDownloading(group.key + format);
    try {
      const endpoint = format === "pdf" ? "/api/reports/generate" : "/api/reports/xlsx";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId: group.farmId, stageId: group.stageId, inspectionDate: group.date }),
      });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Kamp_Inspeksie_${group.farmName}_${group.date}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Kon nie aflaai nie");
    }
    setDownloading(null);
  };

  const handleSend = async (group: InspectionGroup) => {
    setSending(group.key);
    setSendResult(null);
    try {
      const res = await fetch("/api/reports/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId: group.farmId, stageId: group.stageId, inspectionDate: group.date }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendResult({ key: group.key, msg: data.error || "Kon nie stuur nie" });
      } else {
        setSendResult({ key: group.key, msg: `Gestuur na ${data.sentTo}` });
      }
    } catch {
      setSendResult({ key: group.key, msg: "Kon nie stuur nie" });
    }
    setSending(null);
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
        <div>
          {/* Group by client */}
          {(() => {
            const byClient = new Map<string, InspectionGroup[]>();
            for (const g of groups) {
              const client = g.clientName;
              if (!byClient.has(client)) byClient.set(client, []);
              byClient.get(client)!.push(g);
            }
            return [...byClient.entries()].map(([clientName, clientGroups]) => {
              // Group by stage within client
              const byStage = new Map<string, InspectionGroup[]>();
              for (const g of clientGroups) {
                if (!byStage.has(g.stageName)) byStage.set(g.stageName, []);
                byStage.get(g.stageName)!.push(g);
              }
              return (
                <div key={clientName} style={{ marginBottom: "32px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>
                    {clientName}
                  </div>
                  {[...byStage.entries()].map(([stageName, stageGroups]) => (
                    <div key={stageName} style={{ marginBottom: "20px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#D4890A", marginBottom: "8px", paddingLeft: "4px" }}>
                        {stageName}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {stageGroups.map((group) => {
            const isExpanded = expandedGroup === group.key;
            const overallMaxSev = Math.max(
              0,
              ...group.blocks.flatMap((b) => [...b.weeds.values()].map((v) => v.severity))
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
                <div
                  onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    padding: "18px 20px",
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(group, "xlsx"); }}
                      disabled={downloading === group.key + "xlsx"}
                      style={{
                        padding: "5px 10px",
                        background: "#fff",
                        border: "1px solid #d4d4d0",
                        borderRadius: "6px",
                        color: downloading === group.key + "xlsx" ? "#bbb" : "#6b6b6b",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {downloading === group.key + "xlsx" ? "..." : "XLSX"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(group, "pdf"); }}
                      disabled={downloading === group.key + "pdf"}
                      style={{
                        padding: "5px 10px",
                        background: "#fff",
                        border: "1px solid #d4d4d0",
                        borderRadius: "6px",
                        color: downloading === group.key + "pdf" ? "#bbb" : "#6b6b6b",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {downloading === group.key + "pdf" ? "..." : "PDF"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSend(group); }}
                      disabled={sending === group.key}
                      style={{
                        padding: "5px 10px",
                        background: sending === group.key ? "#f0f0ec" : "#1a1a1a",
                        border: "none",
                        borderRadius: "6px",
                        color: sending === group.key ? "#999" : "#fff",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {sending === group.key ? "Stuur..." : "Stuur"}
                    </button>
                    {sendResult?.key === group.key && (
                      <span style={{ fontSize: "11px", color: sendResult.msg.startsWith("Gestuur") ? "#4a9a4a" : "#e8413c" }}>
                        {sendResult.msg}
                      </span>
                    )}
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
                </div>

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
                              const cell = block.weeds.get(w.id);
                              const sev = cell?.severity || 0;
                              const hasNote = !!cell?.notes;
                              const hasZones = cell?.zones && cell.zones.length > 0;
                              const hasExtra = hasNote || hasZones;
                              const isActive = activePopover?.blockId === block.id && activePopover?.weedId === w.id;
                              return (
                                <td
                                  key={w.id}
                                  onClick={hasExtra ? () => setActivePopover(isActive ? null : {
                                    blockId: block.id,
                                    weedId: w.id,
                                    data: cell!,
                                    weedName: w.name,
                                    geometry: block.geometry,
                                  }) : undefined}
                                  style={{
                                    textAlign: "center",
                                    padding: "8px 4px",
                                    borderBottom: bi < group.blocks.length - 1 ? "1px solid #f0f0ec" : "none",
                                    color: sev > 0 ? severityColor(sev) : "#e8e8e4",
                                    fontWeight: sev > 0 ? 700 : 400,
                                    fontSize: sev >= 3 ? "10px" : "12px",
                                    cursor: hasExtra ? "pointer" : "default",
                                    position: "relative",
                                    background: isActive ? "#f7f5f0" : "transparent",
                                  }}
                                >
                                  {sev > 0 ? severityLabel(sev) : "·"}
                                  {hasExtra && sev > 0 && (
                                    <span style={{
                                      position: "absolute",
                                      top: "3px",
                                      right: "2px",
                                      width: "4px",
                                      height: "4px",
                                      borderRadius: "50%",
                                      background: "#D4890A",
                                    }} />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Popover for weed note/zone detail */}
                    {activePopover && group.blocks.some((b) => b.id === activePopover.blockId) && (
                      <div
                        style={{
                          padding: "16px 20px",
                          background: "#fafaf8",
                          borderTop: "1px solid #e8e8e4",
                          display: "flex",
                          gap: "20px",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                              {activePopover.weedName}
                              <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 700, color: severityColor(activePopover.data.severity), fontFamily: "var(--font-jetbrains), monospace" }}>
                                {severityLabel(activePopover.data.severity)} {SEVERITY_LEVELS[activePopover.data.severity as 0|1|2|3|4].name}
                              </span>
                            </div>
                            <button
                              onClick={() => setActivePopover(null)}
                              style={{ background: "none", border: "none", color: "#bbb", fontSize: "16px", cursor: "pointer" }}
                            >
                              ✕
                            </button>
                          </div>
                          {activePopover.data.notes && (
                            <div style={{ fontSize: "13px", color: "#6b6b6b", lineHeight: 1.5, marginBottom: "8px" }}>
                              {activePopover.data.notes}
                            </div>
                          )}
                          {!activePopover.data.notes && !activePopover.data.zones?.length && (
                            <div style={{ fontSize: "13px", color: "#bbb" }}>Geen nota of sones nie.</div>
                          )}
                        </div>
                        {activePopover.data.zones && activePopover.data.zones.length > 0 && activePopover.geometry && (
                          <div style={{ flexShrink: 0 }}>
                            <div style={{ fontSize: "10px", color: "#999", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font-jetbrains), monospace" }}>
                              Sones
                            </div>
                            <ZoneDisplay
                              geometry={activePopover.geometry}
                              zones={activePopover.data.zones}
                              color={severityColor(activePopover.data.severity)}
                              size={100}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
