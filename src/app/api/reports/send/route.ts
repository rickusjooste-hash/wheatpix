import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { InspectionReport, type ReportData } from "@/lib/report-generator";
import { SEVERITY_LEVELS } from "@/lib/inspection-utils";
import React from "react";

export async function POST(req: NextRequest) {
  const { farmId, stageId, inspectionDate } = await req.json();

  if (!farmId || !stageId || !inspectionDate) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get client email
  const { data: farm } = await supabase
    .from("farms")
    .select("name, client_id, clients(name, contact_email)")
    .eq("id", farmId)
    .single();

  const farmData = farm as unknown as { name: string; client_id: string; clients: { name: string; contact_email: string | null } | null };
  const clientEmail = (farmData?.clients as { contact_email: string | null } | null)?.contact_email;

  if (!clientEmail) {
    return NextResponse.json({ error: "Client has no email address" }, { status: 400 });
  }

  // Generate PDF by calling our own generate logic
  // Re-fetch all data (same as generate route)
  const [
    { data: inspections },
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
    supabase.from("inspection_stages").select("name").eq("id", stageId).single(),
    supabase.from("agent_branding").select("*").eq("user_id", user.id).single(),
    supabase.from("weed_species").select("id, name, abbreviation, category, sort_order").is("farm_id", null).eq("is_active", true).order("category").order("sort_order"),
  ]);

  if (!inspections || inspections.length === 0) {
    return NextResponse.json({ error: "No inspections found" }, { status: 404 });
  }

  const stageData = stage as unknown as { name: string };
  const brandingData = branding as unknown as {
    company_name: string; tagline: string | null; logo_path: string | null;
    header_image_path: string | null; cover_image_path: string | null; badge_image_path: string | null;
    primary_color: string; secondary_color: string;
  } | null;
  const weeds = (weedSpecies || []) as unknown as { id: string; name: string; abbreviation: string; category: string }[];

  const getUrl = (path: string | null | undefined) => {
    if (!path) return null;
    return supabase.storage.from("agent-logos").getPublicUrl(path).data.publicUrl;
  };
  const logoUrl = getUrl(brandingData?.logo_path);
  const headerImageUrl = getUrl(brandingData?.header_image_path);
  const coverImageUrl = getUrl(brandingData?.cover_image_path);
  const badgeImageUrl = getUrl(brandingData?.badge_image_path);

  const grasses = weeds.filter((w) => w.category === "grass");
  const broadleaf = weeds.filter((w) => w.category === "broadleaf");

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

    const sevMap = new Map<string, number>();
    for (const w of i.camp_inspection_weeds || []) {
      sevMap.set(w.weed_species_id, w.severity);
    }
    heatmapRows.push({ blockName: i.blocks?.name || "—", severities: sevMap });
  }

  const reportData: ReportData = {
    branding: {
      companyName: brandingData?.company_name || "WheatPix",
      tagline: brandingData?.tagline || null,
      logoUrl,
      headerImageUrl,
      coverImageUrl,
      badgeImageUrl,
      primaryColor: brandingData?.primary_color || "#D4890A",
      secondaryColor: brandingData?.secondary_color || "#666666",
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

  const pdfBuffer = await renderToBuffer(
    React.createElement(InspectionReport, { data: reportData }) as never
  );

  // Build HTML email body
  const weedSummary = blocks
    .map((b) => `<b>${b.name}</b>: ${b.weeds.map((w) => w.name).join(", ") || "Skoon"}`)
    .join("<br>");

  const fromEmail = process.env.RESEND_FROM_EMAIL || "reports@wheatpix.app";
  const companyName = brandingData?.company_name || "WheatPix";

  const { error: sendError } = await resend.emails.send({
    from: `${companyName} <${fromEmail}>`,
    to: clientEmail,
    subject: `Kamp Inspeksie Verslag — ${farmData?.name} — ${inspectionDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${brandingData?.primary_color || "#D4890A"}; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 18px;">Kamp Inspeksie Verslag</h1>
        </div>
        <div style="padding: 24px; background: #f7f7f5; border: 1px solid #e8e8e4; border-top: none; border-radius: 0 0 8px 8px;">
          <p><b>Plaas:</b> ${farmData?.name}</p>
          <p><b>Stadium:</b> ${stageData?.name}</p>
          <p><b>Datum:</b> ${inspectionDate}</p>
          <p><b>Kampe geïnspekteer:</b> ${blocks.length}</p>
          <hr style="border: none; border-top: 1px solid #e8e8e4; margin: 16px 0;">
          <h3 style="margin: 0 0 8px; font-size: 14px;">Opsomming per Kamp:</h3>
          <p style="font-size: 13px; line-height: 1.6;">${weedSummary}</p>
          <hr style="border: none; border-top: 1px solid #e8e8e4; margin: 16px 0;">
          <p style="font-size: 12px; color: #999;">Die volledige verslag is aangeheg as PDF.</p>
          <p style="font-size: 10px; color: #bbb; margin-top: 24px;">Powered by WheatPix</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `Kamp_Inspeksie_${farmData?.name}_${inspectionDate}.pdf`,
        content: Buffer.from(pdfBuffer),
      },
    ],
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    return NextResponse.json({ error: "Email failed to send" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sentTo: clientEmail });
}
