import { describe, expect, it } from "vitest";
import {
  RESEARCH_DEFINITIONS,
  RESEARCH_IDS,
  RESEARCH_UNLOCK_IDS,
  getResearchPresentationInfo,
  getResearchUnlockGuidance,
  getResearchUnlockedContent,
} from "./researchContentCatalog.js";

const HOUR_MS = 60 * 60 * 1000;

describe("Analyse des rendements research", () => {
  it("authors the validated T5 functional unlock", () => {
    const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === RESEARCH_IDS.yieldAnalysis);
    expect(definition).toEqual({
      id: RESEARCH_IDS.yieldAnalysis,
      displayName: "Analyse des rendements",
      tier: 5,
      durationMs: HOUR_MS,
      cost: { silver: 15_000, materials: [] },
      requirements: [{ type: "academy_tier", minimumTier: 5 }],
      unlockIds: [RESEARCH_UNLOCK_IDS.resourceYieldTracking],
    });
  });

  it("presents resource tracking as information with an actionable destination", () => {
    expect(getResearchPresentationInfo(RESEARCH_IDS.yieldAnalysis)).toMatchObject({
      group: "core",
      effectSummary: "Débloque le suivi d’une ressource favorite et son rendement dans le Dashboard.",
    });
    expect(getResearchUnlockedContent(RESEARCH_IDS.yieldAnalysis)).toEqual([
      "Suivi d’une ressource favorite",
      "Stock actuel et rendement / h",
    ]);
    expect(getResearchUnlockGuidance(RESEARCH_IDS.yieldAnalysis)).toEqual([
      { label: "Suivi d’une ressource favorite", destination: "Tableau de bord" },
      { label: "Stock actuel et rendement / h", destination: "Tableau de bord" },
    ]);
  });
});
