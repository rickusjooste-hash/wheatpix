import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import { SEVERITY_LEVELS } from "@/lib/inspection-utils";

export async function POST(req: NextRequest) {
  const { farmId, stageId, inspectionDate } = await req.json();

  if (!farmId || !stageId || !inspectionDate) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch data
  const [
    { data: inspections },
    { data: farm },
    { data: stage },
    { data: weedSpecies },
  ] = await Promise.all([
    supabase
      .from("camp_inspections")
      .select("id, block_id, crop, cultivar, blocks(name, sort_order), camp_inspection_weeds(severity, weed_species_id)")
      .eq("farm_id", farmId)
      .eq("stage_id", stageId)
      .eq("inspection_date", inspectionDate)
      .order("created_at"),
    supabase.from("farms").select("name, clients(name)").eq("id", farmId).single(),
    supabase.from("inspection_stages").select("name").eq("id", stageId).single(),
    supabase.from("weed_species").select("id, name, abbreviation, category, sort_order")
      .is("farm_id", null).eq("is_active", true).order("category").order("sort_order"),
  ]);

  if (!inspections || inspections.length === 0) {
    return NextResponse.json({ error: "No inspections found" }, { status: 404 });
  }

  const farmData = farm as unknown as { name: string; clients: { name: string } | null };
  const stageData = stage as unknown as { name: string };
  const weeds = (weedSpecies || []) as unknown as { id: string; name: string; abbreviation: string; category: string }[];
  const grasses = weeds.filter((w) => w.category === "grass");
  const broadleaf = weeds.filter((w) => w.category === "broadleaf");
  const allWeeds = [...grasses, ...broadleaf];

  // Sort inspections by block sort_order
  const sorted = [...inspections].sort((a, b) => {
    const aSort = (a as unknown as { blocks: { sort_order: number } }).blocks?.sort_order ?? 0;
    const bSort = (b as unknown as { blocks: { sort_order: number } }).blocks?.sort_order ?? 0;
    return aSort - bSort;
  });

  const sevLabel = (sev: number) => {
    if (sev <= 0 || sev > 4) return "";
    return SEVERITY_LEVELS[sev as 1 | 2 | 3 | 4].label.toLowerCase();
  };

  // Build worksheet data
  const wsData: (string | null)[][] = [];

  // Row 0: Category headers
  const catRow: (string | null)[] = ["", "", ""];
  let grassStart = 3;
  for (let i = 0; i < grasses.length; i++) catRow.push(i === 0 ? "Grasse" : null);
  // Empty column separator
  catRow.push(null);
  for (let i = 0; i < broadleaf.length; i++) catRow.push(i === 0 ? "Breeblaar" : null);
  wsData.push(catRow);

  // Row 1: Full weed names + title
  const nameRow: (string | null)[] = [
    `KAMP INSPEKSIE ${new Date(inspectionDate).getFullYear()}`,
    "Gewas",
    "Kultivar",
  ];
  for (const w of grasses) nameRow.push(w.name);
  nameRow.push(null); // separator column
  for (const w of broadleaf) nameRow.push(w.name);
  wsData.push(nameRow);

  // Row 2: Abbreviations
  const abbrRow: (string | null)[] = ["", "", ""];
  for (const w of grasses) abbrRow.push(w.abbreviation);
  abbrRow.push(null);
  for (const w of broadleaf) abbrRow.push(w.abbreviation);
  wsData.push(abbrRow);

  // Row 3: Client/farm name
  const clientRow: (string | null)[] = [(farmData?.clients as { name: string } | null)?.name || farmData?.name || "", null, null];
  for (let i = 0; i < allWeeds.length + 1; i++) clientRow.push(null);
  wsData.push(clientRow);

  // Data rows
  for (const insp of sorted) {
    const i = insp as unknown as {
      blocks: { name: string };
      crop: string | null;
      cultivar: string | null;
      camp_inspection_weeds: { severity: number; weed_species_id: string }[];
    };

    const weedMap = new Map<string, number>();
    for (const w of i.camp_inspection_weeds || []) {
      weedMap.set(w.weed_species_id, w.severity);
    }

    const row: (string | null)[] = [
      i.blocks?.name || "—",
      i.crop || "",
      i.cultivar || "",
    ];

    for (const w of grasses) {
      const sev = weedMap.get(w.id) || 0;
      row.push(sev > 0 ? sevLabel(sev) : "");
    }
    row.push(null); // separator
    for (const w of broadleaf) {
      const sev = weedMap.get(w.id) || 0;
      row.push(sev > 0 ? sevLabel(sev) : "");
    }

    wsData.push(row);
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = [
    { wch: 18 }, // Camp name
    { wch: 10 }, // Gewas
    { wch: 10 }, // Kultivar
    ...grasses.map(() => ({ wch: 6 })),
    { wch: 2 }, // separator
    ...broadleaf.map(() => ({ wch: 6 })),
  ];

  // Merge category header cells
  ws["!merges"] = [];
  if (grasses.length > 1) {
    ws["!merges"].push({ s: { r: 0, c: 3 }, e: { r: 0, c: 3 + grasses.length - 1 } });
  }
  if (broadleaf.length > 1) {
    const blStart = 3 + grasses.length + 1;
    ws["!merges"].push({ s: { r: 0, c: blStart }, e: { r: 0, c: blStart + broadleaf.length - 1 } });
  }

  XLSX.utils.book_append_sheet(wb, ws, "Inspeksie");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fileName = `Kamp_Inspeksie_${farmData?.name || "Report"}_${inspectionDate}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
