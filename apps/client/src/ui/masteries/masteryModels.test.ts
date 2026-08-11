import { describe, expect, it } from "vitest";
import { buildMasteriesModel } from "./masteryModels";

const mastery = (id: string, displayName: string, category: string) => ({
  id,
  displayName,
  category,
  isUnlocked: true,
  level: 1,
  currentXp: 0,
  xpToNextLevel: 100,
  totalLifetimeXp: 0,
  maxLevel: 100,
});

describe("masteryModels weapon families", () => {
  it("derives a newly declared dagger family and specialization from weapon content", () => {
    const model = buildMasteriesModel({
      progression: {
        totalFame: 0,
        overflowPool: 0,
        masteries: [
          mastery("mastery_dagger", "Dagues", "weapon"),
          mastery("mastery_dagger_pair", "Paire de dagues", "weapon_specialization"),
        ],
      },
      workers: { capacity: 0, recruitmentCost: 0, workers: [] },
    });

    const daggers = model.categories.combat.find((family) => family.id === "mastery_dagger");
    expect(daggers?.name).toBe("Dagues");
    expect(daggers?.specializations.map((entry) => entry.id)).toEqual(["mastery_dagger_pair"]);
  });
});
