import type {
  Herbicide,
  HerbicideEfficacy,
  HerbicideRecommendation,
  WeedSpecies,
} from "./inspection-utils";

/**
 * Given detected weed IDs, return herbicides ranked by coverage.
 * Only considers "effective" and "very_effective" (not "uncertain").
 */
export function getRecommendations(
  detectedWeedIds: string[],
  efficacyData: HerbicideEfficacy[],
  herbicides: Herbicide[],
  weedSpecies: WeedSpecies[]
): HerbicideRecommendation[] {
  if (detectedWeedIds.length === 0) return [];

  const detectedSet = new Set(detectedWeedIds);
  const weedMap = new Map(weedSpecies.map((w) => [w.id, w]));

  // Group efficacy by herbicide
  const herbicideMap = new Map(herbicides.map((h) => [h.id, h]));
  const coverageMap = new Map<
    string,
    { weeds: WeedSpecies[]; maxEfficacy: "effective" | "very_effective" | "uncertain" }
  >();

  for (const e of efficacyData) {
    if (!detectedSet.has(e.weed_species_id)) continue;
    if (e.efficacy === "uncertain") continue;

    const weed = weedMap.get(e.weed_species_id);
    if (!weed) continue;

    if (!coverageMap.has(e.herbicide_id)) {
      coverageMap.set(e.herbicide_id, { weeds: [], maxEfficacy: e.efficacy });
    }

    const entry = coverageMap.get(e.herbicide_id)!;
    entry.weeds.push(weed);
    if (e.efficacy === "very_effective") {
      entry.maxEfficacy = "very_effective";
    }
  }

  // Build recommendations sorted by coverage (most weeds first)
  const recommendations: HerbicideRecommendation[] = [];
  for (const [herbicideId, coverage] of coverageMap) {
    const herbicide = herbicideMap.get(herbicideId);
    if (!herbicide) continue;

    recommendations.push({
      herbicide,
      coveredWeeds: coverage.weeds,
      maxEfficacy: coverage.maxEfficacy,
    });
  }

  recommendations.sort((a, b) => b.coveredWeeds.length - a.coveredWeeds.length);

  return recommendations;
}
