"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  SEVERITY_LEVELS,
  type WeedSpecies,
  type SeverityLevel,
} from "@/lib/inspection-utils";

interface InspectionRow {
  id: string;
  block_id: string;
  blocks: { name: string; sort_order: number };
  camp_inspection_weeds: {
    weed_species_id: string;
    severity: number;
  }[];
}

export default function InspectionSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const stageId = params.inspectionId as string;

  const [stageName, setStageName] = useState("");
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [weeds, setWeeds] = useState<WeedSpecies[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: stageData } = await supabase
        .from("inspection_stages" as never)
        .select("name, farm_id" as never)
        .eq("id" as never, stageId as never)
        .single();

      if (!stageData) {
        setLoading(false);
        return;
      }

      const sd = stageData as unknown as { name: string; farm_id: string };
      setStageName(sd.name);

      const { data: inspectionData } = await supabase
        .from("camp_inspections" as never)
        .select(
          `id, block_id, blocks (name, sort_order), camp_inspection_weeds (weed_species_id, severity)` as never
        )
        .eq("stage_id" as never, stageId as never)
        .order("created_at" as never, { ascending: false });

      if (inspectionData) {
        const rows = inspectionData as unknown as InspectionRow[];
        const byBlock = new Map<string, InspectionRow>();
        for (const row of rows) {
          if (!byBlock.has(row.block_id)) {
            byBlock.set(row.block_id, row);
          }
        }
        setInspections(
          Array.from(byBlock.values()).sort(
            (a, b) => a.blocks.sort_order - b.blocks.sort_order
          )
        );
      }

      const { data: weedData } = await supabase
        .from("weed_species" as never)
        .select("*")
        .or(`farm_id.is.null,farm_id.eq.${sd.farm_id}`)
        .eq("is_active" as never, true as never)
        .order("category" as never)
        .order("sort_order" as never);
      if (weedData) setWeeds(weedData as unknown as WeedSpecies[]);

      setLoading(false);
    }

    load();
  }, [supabase, stageId]);

  if (loading) {
    return (
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          background: "#0a0a0a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#555555",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
        }}
      >
        Laai opsomming...
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
        color: "#eeeeee",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid #222222",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#cccccc",
              fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            }}
          >
            Opsomming
          </span>
          {stageName && (
            <div
              style={{
                fontSize: "10px",
                color: "#4a9a4a",
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginTop: "2px",
              }}
            >
              ● {stageName}
            </div>
          )}
        </div>
        <button
          onClick={() => router.back()}
          style={{
            background: "#1a1a1a",
            border: "1px solid #333333",
            borderRadius: "6px",
            color: "#888888",
            fontSize: "13px",
            padding: "8px 16px",
            cursor: "pointer",
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          }}
        >
          ← Terug
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
        {inspections.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#555555",
              padding: "40px",
              fontSize: "14px",
            }}
          >
            Geen inspeksies voltooi nie
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                fontSize: "10px",
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
                      background: "#0a0a0a",
                      padding: "6px 10px",
                      textAlign: "left",
                      color: "#888888",
                      borderBottom: "1px solid #333333",
                      zIndex: 2,
                      minWidth: "90px",
                    }}
                  >
                    Kamp
                  </th>
                  {weeds.map((w) => (
                    <th
                      key={w.id}
                      style={{
                        padding: "6px 4px",
                        color: "#666666",
                        borderBottom: "1px solid #333333",
                        textAlign: "center",
                        minWidth: "28px",
                        fontSize: "9px",
                      }}
                    >
                      {w.abbreviation}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inspections.map((insp) => {
                  const sevMap: Record<string, number> = {};
                  for (const w of insp.camp_inspection_weeds) {
                    sevMap[w.weed_species_id] = w.severity;
                  }
                  return (
                    <tr key={insp.id}>
                      <td
                        style={{
                          position: "sticky",
                          left: 0,
                          background: "#0a0a0a",
                          padding: "6px 10px",
                          color: "#cccccc",
                          borderBottom: "1px solid #1a1a1a",
                          fontWeight: 600,
                          fontSize: "11px",
                          zIndex: 2,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {insp.blocks.name}
                      </td>
                      {weeds.map((w) => {
                        const sev = (sevMap[w.id] || 0) as SeverityLevel;
                        const sv = SEVERITY_LEVELS[sev];
                        return (
                          <td
                            key={w.id}
                            style={{
                              textAlign: "center",
                              padding: "4px 2px",
                              color: sev > 0 ? sv.color : "#222222",
                              borderBottom: "1px solid #1a1a1a",
                              fontWeight: 700,
                              fontSize: sev >= 3 ? "9px" : "10px",
                            }}
                          >
                            {sev > 0 ? sv.label : "·"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
