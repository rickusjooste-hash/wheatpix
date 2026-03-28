"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SEVERITY_LEVELS } from "@/lib/inspection-utils";
import ZoneDisplay from "@/components/dashboard/ZoneDisplay";
import Link from "next/link";

interface InspectionDetail {
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

interface WeedRecord {
  severity: number;
  notes: string | null;
  zones: number[] | null;
  weed_species: { name: string; abbreviation: string; category: string };
}

interface HerbicideRecord {
  is_auto_suggested: boolean;
  herbicides: { name: string; active_ingredients: string[]; group_code: string | null };
}

interface PhotoRecord {
  id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
}

export default function InspectionDetailPage() {
  const params = useParams();
  const inspectionId = params.id as string;
  const supabase = createClient();

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [blockName, setBlockName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [stageName, setStageName] = useState("");
  const [weeds, setWeeds] = useState<WeedRecord[]>([]);
  const [herbicides, setHerbicides] = useState<HerbicideRecord[]>([]);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [blockGeometry, setBlockGeometry] = useState<{ lat: number; lng: number }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Load inspection
      const { data: insp } = await supabase
        .from("camp_inspections" as never)
        .select("*")
        .eq("id" as never, inspectionId as never)
        .single();
      if (!insp) { setLoading(false); return; }
      const inspection = insp as unknown as InspectionDetail;
      setInspection(inspection);

      // Load related names
      const [{ data: block }, { data: farm }, { data: stage }] = await Promise.all([
        supabase.from("blocks" as never).select("name, geometry").eq("id" as never, inspection.block_id as never).single(),
        supabase.from("farms" as never).select("name").eq("id" as never, inspection.farm_id as never).single(),
        supabase.from("inspection_stages" as never).select("name").eq("id" as never, inspection.stage_id as never).single(),
      ]);
      if (block) {
        const b = block as unknown as { name: string; geometry: { lat: number; lng: number }[] | null };
        setBlockName(b.name);
        setBlockGeometry(b.geometry);
      }
      if (farm) setFarmName((farm as { name: string }).name);
      if (stage) setStageName((stage as { name: string }).name);

      // Load weeds with species info
      const { data: weedData } = await supabase
        .from("camp_inspection_weeds" as never)
        .select("severity, notes, zones, weed_species(name, abbreviation, category)" as never)
        .eq("inspection_id" as never, inspectionId as never)
        .order("severity" as never, { ascending: false });
      if (weedData) setWeeds(weedData as unknown as WeedRecord[]);

      // Load herbicides
      const { data: herbData } = await supabase
        .from("camp_inspection_herbicides" as never)
        .select("is_auto_suggested, herbicides(name, active_ingredients, group_code)" as never)
        .eq("inspection_id" as never, inspectionId as never);
      if (herbData) setHerbicides(herbData as unknown as HerbicideRecord[]);

      // Load photos
      const { data: photoData } = await supabase
        .from("camp_inspection_photos" as never)
        .select("id, storage_path, caption, sort_order" as never)
        .eq("inspection_id" as never, inspectionId as never)
        .order("sort_order" as never);
      if (photoData) {
        const pd = photoData as unknown as PhotoRecord[];
        setPhotos(pd);
        // Get signed URLs
        const urls: Record<string, string> = {};
        for (const p of pd) {
          const { data: signedUrl } = await supabase.storage
            .from("inspection-photos")
            .createSignedUrl(p.storage_path, 3600);
          if (signedUrl) urls[p.id] = signedUrl.signedUrl;
        }
        setPhotoUrls(urls);
      }

      setLoading(false);
    }
    load();
  }, [supabase, inspectionId]);

  if (loading) return <div style={{ color: "#999", fontSize: "14px" }}>Laai inspeksie...</div>;
  if (!inspection) return <div style={{ color: "#999", fontSize: "14px" }}>Inspeksie nie gevind nie.</div>;

  const grasses = weeds.filter((w) => w.weed_species?.category === "grass");
  const broadleaf = weeds.filter((w) => w.weed_species?.category === "broadleaf");

  const zoneLabels = ["NW","N","NE","NNE","W","WC","EC","E","SW","SC","SEC","SE","SSW","S","SSE","SE2"];

  return (
    <div>
      <Link href="/dashboard/history" style={{ fontSize: "13px", color: "#999", textDecoration: "none", display: "inline-block", marginBottom: "20px" }}>
        ← Inspeksies
      </Link>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          {blockName}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px", fontSize: "13px", color: "#999" }}>
          <span>{farmName}</span>
          <span style={{ padding: "1px 6px", background: "#f0f0ec", borderRadius: "4px", fontSize: "11px", color: "#6b6b6b" }}>
            {stageName}
          </span>
          <span>
            {new Date(inspection.inspection_date).toLocaleDateString("af-ZA", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
        {(inspection.crop || inspection.cultivar) && (
          <div style={{ fontSize: "13px", color: "#bbb", marginTop: "4px" }}>
            {inspection.crop || "—"} · {inspection.cultivar || "—"}
          </div>
        )}
      </div>

      {/* Weed Severity — Grasses */}
      {grasses.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>
            Grasse
          </h2>
          <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {grasses.map((w, i) => {
              const s = SEVERITY_LEVELS[w.severity as 0|1|2|3|4];
              return (
                <div key={i} style={{ padding: "14px 20px", borderBottom: i < grasses.length - 1 ? "1px solid #f0f0ec" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>
                        {w.weed_species?.name}
                      </span>
                      <span style={{ fontSize: "11px", color: "#999", fontFamily: "var(--font-jetbrains), monospace" }}>
                        {w.weed_species?.abbreviation}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: s.color, fontFamily: "var(--font-jetbrains), monospace" }}>
                        {s.label || "—"} {s.name}
                      </span>
                    </div>
                  </div>
                  {w.notes && (
                    <div style={{ fontSize: "12px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>
                      {w.notes}
                    </div>
                  )}
                  {w.zones && w.zones.length > 0 && blockGeometry && (
                    <div style={{ marginTop: "8px" }}>
                      <ZoneDisplay geometry={blockGeometry} zones={w.zones} color={s.color} size={100} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weed Severity — Broadleaf */}
      {broadleaf.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>
            Breeblaar
          </h2>
          <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {broadleaf.map((w, i) => {
              const s = SEVERITY_LEVELS[w.severity as 0|1|2|3|4];
              return (
                <div key={i} style={{ padding: "14px 20px", borderBottom: i < broadleaf.length - 1 ? "1px solid #f0f0ec" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>
                        {w.weed_species?.name}
                      </span>
                      <span style={{ fontSize: "11px", color: "#999", fontFamily: "var(--font-jetbrains), monospace" }}>
                        {w.weed_species?.abbreviation}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: s.color, fontFamily: "var(--font-jetbrains), monospace" }}>
                        {s.label || "—"} {s.name}
                      </span>
                    </div>
                  </div>
                  {w.notes && (
                    <div style={{ fontSize: "12px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>
                      {w.notes}
                    </div>
                  )}
                  {w.zones && w.zones.length > 0 && blockGeometry && (
                    <div style={{ marginTop: "8px" }}>
                      <ZoneDisplay geometry={blockGeometry} zones={w.zones} color={s.color} size={100} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Herbicide Recommendations */}
      {herbicides.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>
            Aanbevole Middels
          </h2>
          <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {herbicides.map((h, i) => (
              <div key={i} style={{ padding: "14px 20px", borderBottom: i < herbicides.length - 1 ? "1px solid #f0f0ec" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>
                      {h.herbicides?.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#999", marginTop: "2px", fontFamily: "var(--font-jetbrains), monospace" }}>
                      {h.herbicides?.active_ingredients?.join(" + ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {h.herbicides?.group_code && (
                      <span style={{ fontSize: "10px", padding: "2px 6px", background: "#f0f0ec", borderRadius: "4px", color: "#6b6b6b", fontFamily: "var(--font-jetbrains), monospace" }}>
                        Groep {h.herbicides.group_code}
                      </span>
                    )}
                    {h.is_auto_suggested && (
                      <span style={{ fontSize: "10px", color: "#D4890A", fontFamily: "var(--font-jetbrains), monospace" }}>
                        auto
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>
            Fotos
          </h2>
          <div style={{ display: "flex", gap: "12px", overflowX: "auto" }}>
            {photos.map((p) => (
              <div key={p.id} style={{ flexShrink: 0, width: "200px" }}>
                {photoUrls[p.id] ? (
                  <img
                    src={photoUrls[p.id]}
                    alt={p.caption || "Inspection photo"}
                    style={{ width: "200px", height: "150px", objectFit: "cover", borderRadius: "10px", display: "block" }}
                  />
                ) : (
                  <div style={{ width: "200px", height: "150px", background: "#f0f0ec", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: "12px" }}>
                    Laai...
                  </div>
                )}
                {p.caption && (
                  <div style={{ fontSize: "12px", color: "#6b6b6b", marginTop: "6px" }}>
                    {p.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {inspection.notes && (
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>
            Notas
          </h2>
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "16px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
              fontSize: "14px",
              color: "#1a1a1a",
              lineHeight: 1.6,
            }}
          >
            {inspection.notes}
          </div>
        </div>
      )}

      {/* GPS info */}
      {inspection.gps_lat && inspection.gps_lng && (
        <div style={{ fontSize: "12px", color: "#bbb", fontFamily: "var(--font-jetbrains), monospace" }}>
          GPS: {inspection.gps_lat.toFixed(6)}, {inspection.gps_lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}
