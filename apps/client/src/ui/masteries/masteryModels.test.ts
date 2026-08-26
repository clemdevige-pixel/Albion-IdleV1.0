import { describe, expect, it } from "vitest";
import { buildMasteriesModel } from "./masteryModels";

const mastery = (id: string, displayName: string, category: string, level = 1) => ({
  id,
  displayName,
  category,
  isUnlocked: true,
  level,
  currentXp: 0,
  xpToNextLevel: 100,
  totalLifetimeXp: 0,
  maxLevel: 100,
});

describe("masteryModels", () => {
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
      workers: { capacity: 0, professionCapacity: 0, recruitmentCost: 0, workers: [] },
    });

    const daggers = model.categories.combat.find((family) => family.id === "mastery_dagger");
    expect(daggers?.name).toBe("Dagues");
    expect(daggers?.specializations.map((entry) => entry.id)).toEqual(["mastery_dagger_pair"]);
    expect(daggers?.specializations[0]?.iconAsset).toBe("icons/armes/pair dagger.png");
  });

  it("projects faction masteries with their current yield bonus and no specialization layer", () => {
    const model = buildMasteriesModel({
      progression: {
        totalFame: 0,
        overflowPool: 0,
        masteries: [
          mastery("mastery_faction_keeper", "Maîtrise Keeper", "faction", 50),
          mastery("mastery_faction_heretic", "Maîtrise Heretic", "faction", 0),
        ],
      },
      workers: { capacity: 0, professionCapacity: 0, recruitmentCost: 0, workers: [] },
    });

    const keeper = model.categories.faction.find((family) => family.id === "mastery_faction_keeper");
    expect(keeper).toMatchObject({
      name: "Maîtrise Keeper",
      level: 50,
      bonuses: ["+25% rendement de faction"],
      specializations: [],
    });
    expect(model.categories.faction.map((family) => family.id)).toEqual([
      "mastery_faction_keeper",
      "mastery_faction_heretic",
    ]);
  });
});