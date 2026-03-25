import { createClient } from "@/lib/supabase/server";
import { SEVERITY_LEVELS } from "@/lib/inspection-utils";

export default async function HistoryPage() {
  const supabase = await createClient();

  interface HistoryRow {
    id: string;
    inspection_date: string;
    notes: string | null;
    created_at: string;
    blocks: { name: string };
    inspection_stages: { name: string };
    camp_inspection_weeds: { severity: number }[];
  }

  // Query all inspections — RLS filters based on role
  const { data } = await supabase
    .from("camp_inspections" as never)
    .select(
      "id, inspection_date, notes, created_at, blocks (name), inspection_stages (name), camp_inspection_weeds (severity)" as never
    )
    .order("created_at" as never, { ascending: false })
    .limit(100);

  const inspections = (data || []) as unknown as HistoryRow[];

  return (
    <div>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#0E1A07",
          fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
          marginBottom: "24px",
        }}
      >
        Inspeksie Geskiedenis
      </h1>

      {inspections.length === 0 ? (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            padding: "40px",
            textAlign: "center",
            color: "#8C847A",
            border: "1px solid #E2DED6",
          }}
        >
          Geen inspeksies gevind nie.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {inspections.map((insp) => {
            const maxSeverity = Math.max(
              0,
              ...insp.camp_inspection_weeds.map((w) => w.severity)
            );
            const sevColor = maxSeverity > 0 ? SEVERITY_LEVELS[maxSeverity as 1|2|3|4].color : "#8C847A";
            const weedCount = insp.camp_inspection_weeds.filter((w) => w.severity > 0).length;

            return (
              <div
                key={insp.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #E2DED6",
                  boxShadow: "0 1px 3px rgba(26,22,18,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#0E1A07" }}>
                    {insp.blocks?.name || "—"}
                  </div>
                  <div style={{ fontSize: "13px", color: "#5C554B", marginTop: "4px" }}>
                    {new Date(insp.inspection_date).toLocaleDateString("af-ZA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    <span style={{ color: "#2D5A1B" }}>
                      {insp.inspection_stages?.name || ""}
                    </span>
                  </div>
                  {insp.notes && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#8C847A",
                        marginTop: "4px",
                        maxWidth: "400px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {insp.notes}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: sevColor,
                      fontFamily: "var(--font-jetbrains), 'Space Mono', monospace",
                    }}
                  >
                    {weedCount}
                  </div>
                  <div style={{ fontSize: "11px", color: "#8C847A" }}>
                    onkruide
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
