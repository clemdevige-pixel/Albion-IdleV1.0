import { describe, expect, it } from "vitest";
import { GATHERING_MASTERY_XP } from "@game/gameplay";
import {
  getHeroGatheringXpForTier,
  getHeroGatheringXpFromWorkerForTier,
  getWorkerGatheringXpForTier,
} from "./progressionContentCatalog.js";
import {
  getProductionTierRules,
  type ProductionTier,
} from "./productionFamilyCatalog.js";

const TICK_SECONDS = 0.5;
const CHECKPOINT_HOURS = [0.5, 1, 2, 4, 8] as const;
const TIERS: readonly ProductionTier[] = [3, 4, 5, 6, 7, 8];

type Profile = "active" | "worker" | "mixed";

function masteryLevelFromXp(totalXp: number): number {
  let remaining = Math.max(0, totalXp);
  let level = 0;
  for (const required of GATHERING_MASTERY_XP) {
    if (remaining < required) break;
    remaining -= required;
    level += 1;
  }
  return Math.min(100, level);
}

function heroGatherTicks(tier: ProductionTier, heroXp: number): number {
  const rules = getProductionTierRules(tier);
  const masteryLevel = masteryLevelFromXp(heroXp);
  const masteryModifier = Math.max(0.5, 1 - Math.min(100, masteryLevel) * 0.005);
  return Math.max(1, Math.ceil(
    rules.gatheringBaseTicks * rules.gatheringToolSpeedModifier * masteryModifier,
  ));
}

function workerLevelFromXp(totalXp: number): number {
  return Math.min(100, Math.floor(Math.sqrt(Math.max(0, totalXp) / 100)));
}

function workerGatherTicks(tier: ProductionTier, workerXp: number): number {
  const rules = getProductionTierRules(tier);
  const level = workerLevelFromXp(workerXp);
  const speedModifier = rules.workerSpeedModifier * (1 + level * 0.005);
  return Math.max(1, Math.ceil(60 / Math.max(0.01, speedModifier)));
}

function simulateProfile(tier: ProductionTier, profile: Profile, hours: number) {
  const totalTicks = Math.round((hours * 3600) / TICK_SECONDS);
  let heroXp = 0;
  let workerXp = 0;
  let activeCycles = 0;
  let workerCycles = 0;
  let activeRemaining = heroGatherTicks(tier, heroXp);
  let workerRemaining = workerGatherTicks(tier, workerXp);

  for (let tick = 0; tick < totalTicks; tick += 1) {
    if (profile !== "worker") {
      activeRemaining -= 1;
      if (activeRemaining <= 0) {
        activeCycles += 1;
        heroXp += getHeroGatheringXpForTier(tier);
        activeRemaining = heroGatherTicks(tier, heroXp);
      }
    }

    if (profile !== "active") {
      workerRemaining -= 1;
      if (workerRemaining <= 0) {
        workerCycles += 1;
        workerXp += getWorkerGatheringXpForTier(tier);
        heroXp += getHeroGatheringXpFromWorkerForTier(tier);
        workerRemaining = workerGatherTicks(tier, workerXp);
      }
    }
  }

  return {
    heroLevel: masteryLevelFromXp(heroXp),
    heroXp,
    workerLevel: workerLevelFromXp(workerXp),
    activeCycles,
    workerCycles,
  };
}

describe("gathering mastery pacing diagnostic", () => {
  it("prints hero mastery growth from active gathering, worker contribution, and mixed play", () => {
    const rows = TIERS.flatMap((tier) =>
      (["active", "worker", "mixed"] as const).flatMap((profile) =>
        CHECKPOINT_HOURS.map((hours) => {
          const result = simulateProfile(tier, profile, hours);
          return {
            tier: `T${tier}`,
            profile,
            hours,
            heroLevel: result.heroLevel,
            heroXp: result.heroXp,
            workerLevel: result.workerLevel,
            activeCycles: result.activeCycles,
            workerCycles: result.workerCycles,
          };
        }),
      ),
    );

    console.log("[GATHERING_MASTERY_PACING_DIAGNOSTIC]");
    console.table(rows);
    console.log("[GATHERING_MASTERY_PACING_DIAGNOSTIC_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(TIERS.length * 3 * CHECKPOINT_HOURS.length);
    expect(rows.every((row) => row.heroLevel >= 0 && row.heroLevel <= 100)).toBe(true);
    expect(rows.every((row) => row.heroXp >= 0)).toBe(true);
  });
});
