/**
 * Seed herbicide reference data from Excel efficacy matrix.
 *
 * Usage:
 *   npx tsx scripts/seed-herbicides.ts
 *
 * Prerequisites:
 *   npm install xlsx dotenv tsx
 */

import * as path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EXCEL_PATH = path.resolve(__dirname, "../files/Onkruidbeheer Graan 2025.xlsx");

// Map Excel Afrikaans names → our weed_species.name in the DB
// The Excel has more weeds than our DB — we only map what we have
const WEED_NAME_MAP: Record<string, string> = {
  // Broadleaf
  "Gousblom": "Gousbloem",
  "Kaapse dubbeltjie": "Emex",
  "Kiesieblaar": "Kiesieblaar",
  "Turknael": "Turknaels",
  "Ganskos": "Ganskos",
  "Sterremuur": "Sterremier",
  "Koperdraad": "Koperdraad",
  "Groot stinkkruid": "Stinkkruid",
  "Klein stinkkruid": "Stinkkruid",
  "Medics/Klawers": "Medics",
  "Hongerbos": "Hongerbos",
  "Ramenas": "Rumnas",
  "Geelsuring": "Suuring",
  "Rooisuring": "Suuring",
  "Steenboksuring": "Suuring",
  // Grasses
  "Wilde Hawer": "Wilde Hawer",
  "Predikantluis": "Predikantstuis",
  "Raaigras": "Raaigras",
  "Kanariegras": "Kanariesaad",
};

interface HerbicideData {
  name: string;
  activeIngredients: string[];
  groupCode: string;
  category: "broadleaf" | "grass";
  colIdx: number;
}

interface EfficacyEntry {
  herbicideName: string;
  weedAfrikaansName: string;
  efficacy: "effective" | "very_effective" | "uncertain";
}

function parseSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  category: "broadleaf" | "grass"
): { herbicides: HerbicideData[]; efficacy: EfficacyEntry[] } {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`);

  const data: (string | undefined)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: undefined,
  });

  const row0 = data[0] || []; // Primary active ingredients
  const row1 = data[1] || []; // Secondary active ingredients
  const row2 = data[2] || []; // Tertiary active ingredients
  const row3 = data[3] || []; // Trade/product names
  const row4 = data[4] || []; // Group codes

  // Find herbicide columns (start at col 3 for broadleaf, col 3 for grasses)
  const startCol = 3;
  const herbicides: HerbicideData[] = [];

  for (let c = startCol; c < row3.length; c++) {
    const tradeName = row3[c]?.toString().trim();
    if (!tradeName) continue;

    const ingredients: string[] = [];
    if (row0[c]) ingredients.push(row0[c]!.toString().trim());
    if (row1[c]) ingredients.push(row1[c]!.toString().trim());
    if (row2[c]) ingredients.push(row2[c]!.toString().trim());

    herbicides.push({
      name: tradeName,
      activeIngredients: ingredients.length > 0 ? ingredients : [tradeName],
      groupCode: row4[c]?.toString().trim() || "",
      category,
      colIdx: c,
    });
  }

  // Parse efficacy rows (start at row 6)
  const efficacy: EfficacyEntry[] = [];
  for (let r = 6; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    const afrikaansName = row[1]?.toString().trim();
    if (!afrikaansName) continue;

    for (const herb of herbicides) {
      const cell = row[herb.colIdx]?.toString().trim();
      if (!cell) continue;

      let eff: "effective" | "very_effective" | "uncertain" | null = null;
      if (cell === "X +") eff = "very_effective";
      else if (cell === "X") eff = "effective";
      else if (cell === "?") eff = "uncertain";

      if (eff) {
        efficacy.push({
          herbicideName: herb.name,
          weedAfrikaansName: afrikaansName,
          efficacy: eff,
        });
      }
    }
  }

  return { herbicides, efficacy };
}

async function main() {
  console.log("Reading Excel file...");
  const wb = XLSX.readFile(EXCEL_PATH);

  const broadleaf = parseSheet(wb, "Breeblaar", "broadleaf");
  const grasses = parseSheet(wb, "Grasse", "grass");

  console.log(`Parsed ${broadleaf.herbicides.length} broadleaf herbicides, ${grasses.herbicides.length} grass herbicides`);
  console.log(`Parsed ${broadleaf.efficacy.length} broadleaf efficacy entries, ${grasses.efficacy.length} grass efficacy entries`);

  // Fetch existing weed species from DB
  const { data: weedSpecies, error: weedError } = await supabase
    .from("weed_species")
    .select("id, name")
    .is("farm_id", null);

  if (weedError) {
    console.error("Failed to fetch weed species:", weedError);
    process.exit(1);
  }

  const weedByName = new Map<string, string>();
  for (const w of weedSpecies || []) {
    weedByName.set(w.name, w.id);
  }
  console.log(`Found ${weedByName.size} weed species in DB`);

  // Deduplicate herbicides (same product might appear in both sheets — unlikely but safe)
  const allHerbicides = [...broadleaf.herbicides, ...grasses.herbicides];
  const uniqueHerbicides = new Map<string, HerbicideData>();
  for (const h of allHerbicides) {
    if (!uniqueHerbicides.has(h.name)) {
      uniqueHerbicides.set(h.name, h);
    }
  }

  // Clear existing data
  console.log("Clearing existing herbicide data...");
  await supabase.from("herbicide_weed_efficacy").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("herbicides").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Insert herbicides
  console.log("Inserting herbicides...");
  const herbicideIdMap = new Map<string, string>();

  for (const h of uniqueHerbicides.values()) {
    const { data, error } = await supabase
      .from("herbicides")
      .insert({
        name: h.name,
        active_ingredients: h.activeIngredients,
        group_code: h.groupCode || null,
        category: h.category,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`Failed to insert ${h.name}:`, error.message);
      continue;
    }
    herbicideIdMap.set(h.name, data.id);
    console.log(`  ✓ ${h.name} (${h.activeIngredients.join(" + ")})`);
  }

  // Insert efficacy entries
  console.log("\nInserting efficacy data...");
  const allEfficacy = [...broadleaf.efficacy, ...grasses.efficacy];
  let inserted = 0;
  let skipped = 0;

  for (const e of allEfficacy) {
    const herbicideId = herbicideIdMap.get(e.herbicideName);
    if (!herbicideId) continue;

    // Map Excel weed name to our DB weed name
    const dbWeedName = WEED_NAME_MAP[e.weedAfrikaansName];
    if (!dbWeedName) {
      skipped++;
      continue;
    }

    const weedId = weedByName.get(dbWeedName);
    if (!weedId) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("herbicide_weed_efficacy")
      .upsert({
        herbicide_id: herbicideId,
        weed_species_id: weedId,
        efficacy: e.efficacy,
      }, { onConflict: "herbicide_id,weed_species_id" });

    if (error) {
      console.error(`  ✗ ${e.herbicideName} → ${e.weedAfrikaansName}: ${error.message}`);
    } else {
      inserted++;
    }
  }

  console.log(`\nDone! Inserted ${inserted} efficacy entries, skipped ${skipped} (weed not in DB)`);
  console.log(`\nSkipped weeds are species in the Excel that aren't in our default weed_species list.`);
  console.log(`The agent's farm may have custom weed species — those would need manual mapping.`);
}

main().catch(console.error);
