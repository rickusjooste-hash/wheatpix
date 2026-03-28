import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { InspectionReport, type ReportData } from "@/lib/report-generator";
import { SEVERITY_LEVELS } from "@/lib/inspection-utils";
import React from "react";

export async function POST(req: NextRequest) {
  const { farmId, stageId, inspectionDate } = await req.json();

  if (!farmId || !stageId || !inspectionDate) {
    return NextResponse.json({ error: "Missing farmId, stageId, or inspectionDate" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch all data in parallel
  const [
    { data: inspections },
    { data: farm },
    { data: stage },
    { data: branding },
    { data: weedSpecies },
  ] = await Promise.all([
    supabase
      .from("camp_inspections")
      .select("id, block_id, notes, blocks(name, sort_order, geometry), camp_inspection_weeds(severity, notes, zones, weed_species_id, weed_species(name, abbreviation, category)), camp_inspection_herbicides(herbicides(name, active_ingredients)), camp_inspection_photos(storage_path, sort_order)")
      .eq("farm_id", farmId)
      .eq("stage_id", stageId)
      .eq("inspection_date", inspectionDate)
      .order("created_at"),
    supabase.from("farms").select("name, client_id, clients(name)").eq("id", farmId).single(),
    supabase.from("inspection_stages").select("name").eq("id", stageId).single(),
    supabase.from("agent_branding").select("*").eq("user_id", user.id).single(),
    supabase.from("weed_species").select("id, name, abbreviation, category, sort_order").is("farm_id", null).eq("is_active", true).order("category").order("sort_order"),
  ]);

  if (!inspections || inspections.length === 0) {
    return NextResponse.json({ error: "No inspections found" }, { status: 404 });
  }

  const farmData = farm as unknown as { name: string; client_id: string; clients: { name: string } | null };
  const stageData = stage as unknown as { name: string };
  const brandingData = branding as unknown as { company_name: string; logo_path: string | null; primary_color: string } | null;
  const weeds = (weedSpecies || []) as unknown as { id: string; name: string; abbreviation: string; category: string; sort_order: number }[];

  // Get logo URL
  let logoUrl: string | null = null;
  if (brandingData?.logo_path) {
    const { data: urlData } = supabase.storage.from("agent-logos").getPublicUrl(brandingData.logo_path);
    logoUrl = urlData.publicUrl;
  }

  const grasses = weeds.filter((w) => w.category === "grass");
  const broadleaf = weeds.filter((w) => w.category === "broadleaf");

  // Build report data
  const blocks: ReportData["blocks"] = [];
  const heatmapRows: ReportData["heatmap"]["rows"] = [];

  for (const insp of inspections as unknown[]) {
    const i = insp as {
      id: string;
      block_id: string;
      notes: string | null;
      blocks: { name: string; sort_order: number; geometry: { lat: number; lng: number }[] | null };
      camp_inspection_weeds: { severity: number; notes: string | null; zones: number[] | null; weed_species_id: string; weed_species: { name: string; abbreviation: string; category: string } }[];
      camp_inspection_herbicides: { herbicides: { name: string; active_ingredients: string[] } }[];
      camp_inspection_photos: { storage_path: string; sort_order: number }[];
    };

    // Get all photo URLs
    const photoUrls: string[] = [];
    if (i.camp_inspection_photos?.length > 0) {
      const sorted = [...i.camp_inspection_photos].sort((a, b) => a.sort_order - b.sort_order);
      for (const photo of sorted) {
        const { data: signedUrl } = await supabase.storage
          .from("inspection-photos")
          .createSignedUrl(photo.storage_path, 3600);
        if (signedUrl) photoUrls.push(signedUrl.signedUrl);
      }
    }

    const blockWeeds = (i.camp_inspection_weeds || [])
      .filter((w) => w.severity > 0)
      .sort((a, b) => b.severity - a.severity);

    // Build zone data per weed for the polygon
    const weedZones = blockWeeds
      .filter((w) => w.zones && w.zones.length > 0)
      .map((w) => ({
        weedName: w.weed_species?.name || "—",
        zones: w.zones as number[],
        color: SEVERITY_LEVELS[w.severity as 1|2|3|4]?.color || "#999",
      }));

    blocks.push({
      name: i.blocks?.name || "—",
      weeds: blockWeeds.map((w) => ({
        name: w.weed_species?.name || "—",
        abbreviation: w.weed_species?.abbreviation || "?",
        category: (w.weed_species?.category || "broadleaf") as "grass" | "broadleaf",
        severity: w.severity,
      })),
      herbicides: (i.camp_inspection_herbicides || []).map((h) => ({
        name: h.herbicides?.name || "—",
        activeIngredients: h.herbicides?.active_ingredients || [],
      })),
      photoUrls,
      notes: i.notes,
      geometry: i.blocks?.geometry || null,
      weedZones,
    });

    // Heatmap row
    const sevMap = new Map<string, number>();
    for (const w of i.camp_inspection_weeds || []) {
      sevMap.set(w.weed_species_id, w.severity);
    }
    heatmapRows.push({ blockName: i.blocks?.name || "—", severities: sevMap });
  }

  const reportData: ReportData = {
    branding: {
      companyName: brandingData?.company_name || "WheatPix",
      logoUrl,
      primaryColor: brandingData?.primary_color || "#D4890A",
    },
    farmName: farmData?.name || "—",
    clientName: (farmData?.clients as { name: string } | null)?.name || farmData?.name || "—",
    stageName: stageData?.name || "—",
    inspectionDate,
    agentName: (user.user_metadata?.full_name as string) || user.email || "—",
    year: new Date(inspectionDate).getFullYear(),
    blocks,
    heatmap: {
      rows: heatmapRows,
      grasses: grasses.map((w) => ({ id: w.id, abbreviation: w.abbreviation })),
      broadleaf: broadleaf.map((w) => ({ id: w.id, abbreviation: w.abbreviation })),
    },
  };

  const buffer = await renderToBuffer(
    React.createElement(InspectionReport, { data: reportData }) as never
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Kamp_Inspeksie_${farmData?.name || "Report"}_${inspectionDate}.pdf"`,
    },
  });
}
