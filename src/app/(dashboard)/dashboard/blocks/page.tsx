import { createClient } from "@/lib/supabase/server";

interface BlockRow {
  id: string;
  name: string;
  crop: string | null;
  cultivar: string | null;
  area_hectares: number | null;
  is_active: boolean;
  farm_id: string;
  farms: { name: string; client_id: string | null };
}

export default async function BlocksPage() {
  const supabase = await createClient();

  // Query blocks directly — RLS filters based on role
  const { data } = await supabase
    .from("blocks" as never)
    .select("id, name, crop, cultivar, area_hectares, is_active, farm_id, farms (name, client_id)" as never)
    .order("sort_order" as never);

  const blocks = (data || []) as unknown as BlockRow[];

  // Get client names
  const { data: clientsData } = await supabase
    .from("clients" as never)
    .select("id, name" as never);
  const clientMap = new Map<string, string>();
  if (clientsData) {
    for (const c of clientsData as unknown as { id: string; name: string }[]) {
      clientMap.set(c.id, c.name);
    }
  }

  // Group by farm
  const byFarm = new Map<string, { farmName: string; clientName: string | null; blocks: BlockRow[] }>();
  for (const b of blocks) {
    if (!byFarm.has(b.farm_id)) {
      const clientName = b.farms.client_id ? clientMap.get(b.farms.client_id) || null : null;
      byFarm.set(b.farm_id, { farmName: b.farms.name, clientName, blocks: [] });
    }
    byFarm.get(b.farm_id)!.blocks.push(b);
  }

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
        Kampe ({blocks.length})
      </h1>

      {blocks.length === 0 ? (
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
          Geen kampe gevind nie.
        </div>
      ) : (
        Array.from(byFarm.entries()).map(([farmId, { farmName, clientName, blocks: farmBlocks }]) => (
          <div key={farmId} style={{ marginBottom: "32px" }}>
            <h2
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#2D5A1B",
                marginBottom: "12px",
                textTransform: "uppercase" as const,
                letterSpacing: "1px",
                fontFamily: "var(--font-jetbrains), 'Space Mono', monospace",
              }}
            >
              {clientName ? `${clientName} · ` : ""}{farmName} ({farmBlocks.length})
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "12px",
              }}
            >
              {farmBlocks.map((block) => (
                <div
                  key={block.id}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    border: "1px solid #E2DED6",
                    boxShadow: "0 1px 3px rgba(26,22,18,0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "#0E1A07" }}>
                        {block.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#5C554B", marginTop: "3px" }}>
                        {block.crop || "—"} · {block.cultivar || "—"}
                      </div>
                    </div>
                    {block.area_hectares && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#8C847A",
                          fontFamily: "var(--font-jetbrains), 'Space Mono', monospace",
                        }}
                      >
                        {block.area_hectares} ha
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
