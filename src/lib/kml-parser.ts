export interface ParsedBlock {
  name: string;
  geometry: { lat: number; lng: number }[];
  cultivar: string | null;
}

export function parseKml(kmlString: string): ParsedBlock[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlString, "text/xml");
  const placemarks = doc.querySelectorAll("Placemark");
  const blocks: ParsedBlock[] = [];

  placemarks.forEach((pm) => {
    const polygon = pm.querySelector("Polygon");
    if (!polygon) return;

    const name = pm.querySelector("name")?.textContent?.trim() || "Naamloos";

    const coordsText = polygon.querySelector(
      "outerBoundaryIs > LinearRing > coordinates"
    )?.textContent?.trim();
    if (!coordsText) return;

    const points = coordsText
      .split(/\s+/)
      .filter((s) => s.length > 0)
      .map((coord) => {
        const [lng, lat] = coord.split(",").map(Number);
        return { lat, lng };
      })
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));

    if (points.length < 3) return;

    // Remove closing duplicate if first and last points match
    const first = points[0];
    const last = points[points.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) {
      points.pop();
    }

    // Parse cultivar from description HTML if present
    let cultivar: string | null = null;
    const desc = pm.querySelector("description")?.textContent || "";
    const cultivarMatch = desc.match(/Cultivar:<\/b>\s*([^<]+)/i);
    if (cultivarMatch) {
      cultivar = cultivarMatch[1].trim();
    }

    blocks.push({ name, geometry: points, cultivar });
  });

  return blocks;
}
