import { describe, expect, it } from "vitest";
import { MASTERY_DEFINITIONS } from "./progressionContentCatalog.js";
import {
  PRODUCTION_FAMILIES,
  PRODUCTION_FAMILY_CATALOG,
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyByGameplayFamily,
  getProductionFamilyByProfession,
  getWorkerResourceLabel,
} from "./productionFamilyCatalog.js";
import { WORKER_DEFINITIONS, WORKER_TASK_DEFINITIONS } from "./workerContentCatalog.js";

describe("productionFamilyCatalog", () => {
  it("keeps ids, gameplay families and worker professions unique", () => {
    const definitions = PRODUCTION_FAMILY_IDS.map((id) => PRODUCTION_FAMILY_CATALOG[id]);

    expect(new Set(PRODUCTION_FAMILY_IDS).size).toBe(PRODUCTION_FAMILY_IDS.length);
    expect(new Set(PRODUCTION_FAMILIES).size).toBe(PRODUCTION_FAMILIES.length);
    expect(new Set(definitions.map((definition) => definition.profession)).size)
      .toBe(definitions.length);
  });

  it("resolves the same definition from gameplay family and profession", () => {
    for (const id of PRODUCTION_FAMILY_IDS) {
      const definition = PRODUCTION_FAMILY_CATALOG[id];
      expect(getProductionFamilyByGameplayFamily(definition.gameplayFamily)).toBe(definition);
      expect(getProductionFamilyByProfession(definition.profession)).toBe(definition);
    }
  });

  it("references registered gathering masteries, workers and worker tasks", () => {
    const masteryIds = new Set(MASTERY_DEFINITIONS.map((definition) => definition.id));
    const workerProfessions = new Set(WORKER_DEFINITIONS.map((definition) => definition.profession));
    const taskProfessions = new Set(WORKER_TASK_DEFINITIONS.map((definition) => definition.requiredProfession));

    for (const id of PRODUCTION_FAMILY_IDS) {
      const definition = PRODUCTION_FAMILY_CATALOG[id];
      expect(masteryIds.has(definition.masteryId)).toBe(true);
      expect(workerProfessions.has(definition.profession)).toBe(true);
      expect(taskProfessions.has(definition.profession)).toBe(true);
    }
  });

  it("derives worker resource labels from the selected tier", () => {
    for (const id of PRODUCTION_FAMILY_IDS) {
      const definition = PRODUCTION_FAMILY_CATALOG[id];
      expect(getWorkerResourceLabel(definition.profession, 3)).toBe(definition.tiers[3].resourceName);
      expect(getWorkerResourceLabel(definition.profession, 4)).toBe(definition.tiers[4].resourceName);
    }
    expect(getWorkerResourceLabel("stonecutter", 3)).toBe("Pierre");
  });
});
