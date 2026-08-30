import { describe, expect, it } from "vitest";
import { TOWER_TRIAL_BLOCKS } from "@game/data";
import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactBenchmarkMasteryProfile,
  artifactDungeonEquipment,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { resolveFactionCombatModifiers } from "./factionCombatResolver.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

const POTION_CAP = 2;

function runBlock(block: (typeof TOWER_TRIAL_BLOCKS)[number]) {
  const tier = block.tier;
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => (
    entry.tier === tier && entry.faction.toLowerCase() === block.factionId
  ));
  if (dungeon === undefined) throw new Error(`Missing Dungeon source for Tower block ${block.id}`);

  const weapon = ARTIFACT_WEAPON_BENCHMARK_SPECS
    .map((entry) => ({ entry, itemId: entry.itemId(tier) }))
    .find(({ itemId }) => resolveArtifactDungeonDamageBonusPercent(itemId, dungeon.faction) > 0);
  if (weapon === undefined) throw new Error(`Missing counter weapon for Tower block ${block.id}`);

  const capeItemId = `item_cape_t${tier}_${block.factionId}`;
  const modifiers = resolveFactionCombatModifiers(
    { weaponItemId: weapon.itemId, capeItemId },
    { factionId: block.factionId, tier, activity: "tower" },
  );
  const mastery = artifactBenchmarkMasteryProfile(tier);
  const heroDamageMultiplier = (
    (1 + modifiers.outgoingDamageBonusPercent / 100)
    * modifiers.factionResilienceDamageMultiplier
  );

  const result = runCombatRuntimeBenchmark({
    label: `tower_trial_block_${String(block.blockIndex + 1)}`,
    weaponItemId: weapon.itemId,
    equipmentItemIds: artifactDungeonEquipment(weapon.itemId, tier, dungeon.faction),
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    dungeonDefinitionId: dungeon.id,
    enchantment: 3,
    familyMasteryLevel: mastery.familyMasteryLevel,
    specializationMasteryLevel: mastery.specializationMasteryLevel,
    siblingSpecializationMasteryLevel: mastery.siblingSpecializationMasteryLevel,
    heroDamageMultiplier,
    useHealthPotions: true,
    healthPotionQuantity: POTION_CAP,
  });

  return {
    block: block.blockIndex + 1,
    floors: `${String(block.floorStart)}-${String(block.floorEnd)}`,
    tier,
    faction: block.factionId,
    weapon: weapon.entry.label,
    weaponItemId: weapon.itemId,
    outgoingBonusPct: modifiers.outgoingDamageBonusPercent,
    resilienceMultiplier: modifiers.factionResilienceDamageMultiplier,
    incomingReductionPct: modifiers.incomingDamageReductionPercent,
    clearSourceRoster: result.clear,
    seconds: result.seconds,
    hpPct: result.hpPercent,
    potions: result.potionsUsed,
    encounterReached: result.encounterReached,
    bossProgressPct: result.bossProgressPercent,
    dps: result.observedDps,
    incomingDps: result.incomingDps,
  };
}

describe("Tower trial runtime benchmark", () => {
  it("prints the five authored trial blocks using the live Dungeon roster and Tower faction modifiers", () => {
    const rows = TOWER_TRIAL_BLOCKS.map(runBlock);
    console.log("[TOWER_TRIAL_RUNTIME_BENCHMARK]");
    console.table(rows);
    console.log("[TOWER_TRIAL_RUNTIME_BENCHMARK_NOTE] floor 3 reinforced tuning (+35% HP, +15% damage, +10% defense) is not represented by the current generic benchmark harness; rows therefore validate the source roster and Tower faction matchup, not the exact five-floor block clear.");

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.outgoingBonusPct > 0)).toBe(true);
    expect(rows.every((row) => row.resilienceMultiplier === 0.9)).toBe(true);
  });
});
