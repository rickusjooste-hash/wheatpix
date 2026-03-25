/**
 * Seed script: Parse Pampoenkraal farm blocks from KML and insert into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-farm.ts
 *   npx tsx scripts/seed-farm.ts --email user@example.com
 *
 * Prerequisites:
 *   npm install -D dotenv tsx
 */

import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Load environment
// ---------------------------------------------------------------------------
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function getEmailArg(): string | undefined {
  const idx = process.argv.indexOf("--email");
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// KML parsing helpers
// ---------------------------------------------------------------------------
interface ParsedBlock {
  name: string;
  cultivar: string | null;
  area_hectares: number | null;
  crop: string | null;
  geometry: { lat: number; lng: number }[];
}

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const m = xml.match(re);
  return m ? m[1] : null;
}

function extractAllPlacemarks(kml: string): string[] {
  const placemarks: string[] = [];
  const re = /<Placemark>([\s\S]*?)<\/Placemark>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(kml)) !== null) {
    placemarks.push(m[1]);
  }
  return placemarks;
}

function parseDescription(desc: string): { cultivar: string | null; size: number | null } {
  // Strip CDATA wrapper if present
  const clean = desc
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();

  let cultivar: string | null = null;
  let size: number | null = null;

  const cultivarMatch = clean.match(/<b>Cultivar:<\/b>\s*([^<]+)/i);
  if (cultivarMatch) {
    cultivar = cultivarMatch[1].trim();
  }

  const sizeMatch = clean.match(/<b>Size:<\/b>\s*([\d.]+)\s*ha/i);
  if (sizeMatch) {
    size = parseFloat(sizeMatch[1]);
  }

  return { cultivar, size };
}

function inferCrop(cultivar: string | null): string | null {
  if (!cultivar) return null;
  const upper = cultivar.toUpperCase();
  if (upper.startsWith("SST")) return "Koring";
  if (upper === "DUNNAR" || upper === "DUNNART" || upper === "LG ANCIA") return "Canola";
  if (upper === "FABA") return "Faba";
  if (upper === "TORDO") return "Hawer";
  // Fallback for unknown cultivars
  return null;
}

function parseCoordinates(coordStr: string): { lat: number; lng: number }[] {
  return coordStr
    .trim()
    .split(/\s+/)
    .map((triple) => {
      const [lng, lat] = triple.split(",").map(Number);
      return { lat, lng };
    });
}

function parsePlacemark(xml: string): ParsedBlock {
  const name = extractTag(xml, "name")?.trim() ?? "Unnamed";
  const descRaw = extractTag(xml, "description") ?? "";
  const { cultivar, size } = parseDescription(descRaw);
  const coordStr = extractTag(xml, "coordinates") ?? "";
  const geometry = parseCoordinates(coordStr);
  const crop = inferCrop(cultivar);

  return { name, cultivar, area_hectares: size, crop, geometry };
}

// ---------------------------------------------------------------------------
// Farm prefix → placeholder name mapping
// Block names like "DP 1", "RI 5" get grouped by prefix into separate farms.
// Names are placeholders — rename via the dashboard when you get the real names.
// ---------------------------------------------------------------------------
function getFarmPrefix(blockName: string): string {
  // "Blok 2 en 3" → "Blok", "BHS 6&7" → "BHS", "RI 03" → "RI"
  const match = blockName.match(/^([A-Za-z]+)/);
  return match ? match[1].toUpperCase() : "OTHER";
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const email = getEmailArg();

  // Read and parse KML
  const kmlPath = path.resolve(__dirname, "../kml file/camps.kml");
  console.log(`Reading KML from: ${kmlPath}`);
  const kml = fs.readFileSync(kmlPath, "utf-8");

  const placemarkXmls = extractAllPlacemarks(kml);
  console.log(`Found ${placemarkXmls.length} Placemark elements`);

  const allBlocks = placemarkXmls.map(parsePlacemark);

  // Group blocks by farm prefix
  const farmGroups = new Map<string, ParsedBlock[]>();
  for (const b of allBlocks) {
    const prefix = getFarmPrefix(b.name);
    if (!farmGroups.has(prefix)) farmGroups.set(prefix, []);
    farmGroups.get(prefix)!.push(b);
  }

  console.log(`\nGrouped into ${farmGroups.size} farms:`);
  for (const [prefix, blocks] of farmGroups) {
    console.log(`  ${prefix}: ${blocks.length} blocks`);
    for (const b of blocks) {
      console.log(
        `    ${b.name.padEnd(12)} | ${(b.cultivar ?? "-").padEnd(10)} | ${String(b.area_hectares ?? "-").padEnd(6)} ha | ${b.crop ?? "-"}`
      );
    }
  }

  // ---- Look up user (if --email provided) ----
  let userId: string | null = null;
  if (email) {
    console.log(`\nLooking up user by email: ${email}`);
    const { data: userData, error: userErr } =
      await supabase.auth.admin.listUsers();

    if (userErr) {
      console.error("Failed to list users:", userErr.message);
      process.exit(1);
    }

    const user = userData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    userId = user.id;
    console.log(`Found user ${userId}`);
  }

  // ---- Create client ----
  const clientName = "Kliënt 1";
  const clientSlug = "klient-1";

  console.log(`\nCreating client "${clientName}"...`);
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({
      name: clientName,
      slug: clientSlug,
      agent_id: userId || "00000000-0000-0000-0000-000000000000",
    })
    .select("id")
    .single();

  if (clientErr) {
    console.error(`Failed to create client:`, clientErr.message);
    process.exit(1);
  }

  const clientId: string = client.id;
  console.log(`  Client created: ${clientId}`);

  // ---- Set user role to super ----
  if (userId) {
    const { error: roleErr } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role: "super" },
    });
    if (roleErr) {
      console.error(`Failed to set user role:`, roleErr.message);
    } else {
      console.log(`  Set user role to super`);
    }
  }

  // ---- Create farms and insert blocks ----
  for (const [prefix, blocks] of farmGroups) {
    const farmName = `Plaas ${prefix}`;
    const slug = slugify(farmName);

    console.log(`\nCreating farm "${farmName}" (${slug})...`);
    const { data: farm, error: farmErr } = await supabase
      .from("farms")
      .insert({ name: farmName, slug, client_id: clientId })
      .select("id")
      .single();

    if (farmErr) {
      console.error(`Failed to create farm ${farmName}:`, farmErr.message);
      process.exit(1);
    }

    const farmId: string = farm.id;
    console.log(`  Farm created: ${farmId}`);

    const blockRows = blocks.map((b, i) => ({
      farm_id: farmId,
      name: b.name,
      crop: b.crop,
      cultivar: b.cultivar,
      area_hectares: b.area_hectares,
      geometry: b.geometry,
      sort_order: i,
      is_active: true,
    }));

    const { error: blocksErr } = await supabase.from("blocks").insert(blockRows);

    if (blocksErr) {
      console.error(`Failed to insert blocks for ${farmName}:`, blocksErr.message);
      process.exit(1);
    }

    console.log(`  Inserted ${blockRows.length} blocks`);
  }

  console.log(`\nDone! Created 1 client, ${farmGroups.size} farms with ${allBlocks.length} total blocks.`);
  console.log("Rename farms and client via the dashboard.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
