import { describe, expect, it } from "vitest";
import { TOWER_TRIAL_BLOCKS } from "@game/data";
import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactDungeonEquipment,
  type ArtifactWeaponFamily,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { resolveFactionCombatModifiers } from "./factionCombatResolver.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

const POTION_CAP = 2;
const ENDGAME_FAMILY_MASTERY = 75;
const ENDGAME_WEAPON_MASTERY = 45;
const ENDGAME_SIBLING_MASTERY = 45;
const WEAPON_FAMILIES = ["sword", "bow", "fire_staff", "gloves", "dagger"] as const satisfies readonly ArtifactWeaponFamily[];

function runFamilyBlock(
  block: (typeof TOWER_TRIAL_BLOCKS)[number],
  family: ArtifactWeaponFamily,
) {
  const tier = block.tier;
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => (
    entry.tier === tier && entry.faction.toLowerCase() === block.factionId
  ));
  if (dungeon === undefined) throw new Error(`Missing Dungeon source for Tower block ${block.id}`);

  const weapon = ARTIFACT_WEAPON_BENCHMARK_SPECS
    .filter((entry) => entry.family === family)
    .map((entry) => ({ entry, itemId: entry.itemId(tier) }))
    .find(({ itemId }) => resolveArtifactDungeonDamageBonusPercent(itemId, dungeon.faction) > 0);
  if (weapon === undefined) {
    throw new Error(`Missing ${family} counter weapon for Tower block ${block.id}`);
  }

  const capeItemId = `item_cape_t${tier}_${block.factionId}`;
  const modifiers = resolveFactionCombatModifiers(
    { weaponItemId: weapon.itemId, capeItemId },
    { factionId: block.factionId, tier, activity: "tower" },
  );
  const heroDamageMultiplier = (
    (1 + modifiers.outgoingDamageBonusPercent / 100)
    * modifiers.factionResilienceDamageMultiplier
  );

  // .3 and .4 share the same authored raw combat-stat multiplier (1.42x).
  // This therefore models a .4 weapon before requiring any Awakening combat trait.
  const result = runCombatRuntimeBenchmark({
    label: `tower_trial_block_${String(block.blockIndex + 1)}_${family}`,
    weaponItemId: weapon.itemId,
    equipmentItemIds: artifactDungeonEquipment(weapon.itemId, tier, dungeon.faction),
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    dungeonDefinitionId: dungeon.id,
    enchantment: 3,
    familyMasteryLevel: ENDGAME_FAMILY_MASTERY,
    specializationMasteryLevel: ENDGAME_WEAPON_MASTERY,
    siblingSpecializationMasteryLevel: ENDGAME_SIBLING_MASTERY,
    heroDamageMultiplier,
    useHealthPotions: true,
    healthPotionQuantity: POTION_CAP,
  });

  return {
    block: block.blockIndex + 1,
    floors: `${String(block.floorStart)}-${String(block.floorEnd)}`,
    tier,
    faction: block.factionId,
    family,
    weapon: weapon.entry.label,
    weaponItemId: weapon.itemId,
    familyMastery: ENDGAME_FAMILY_MASTERY,
    weaponMastery: ENDGAME_WEAPON_MASTERY,
    siblingMastery: ENDGAME_SIBLING_MASTERY,
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
  it("prints the endgame-entry baseline for every weapon family without requiring favorable Awakening traits", () => {
    const rows = TOWER_TRIAL_BLOCKS.flatMap((block) => (
      WEAPON_FAMILIES.map((family) => runFamilyBlock(block, family))
    ));
    console.log("[TOWER_TRIAL_ENDGAME_ALL_FAMILIES]");
    console.table(rows);
    console.log("[TOWER_TRIAL_ENDGAME_ALL_FAMILIES_NOTE] one favorable faction-counter artifact is selected per weapon family and block. Raw .4 combat scaling equals .3 (1.42x), so this models weapon .4 + armor/cape .3 before requiring Awakening combat traits. Floor 3 reinforced tuning (+35% HP, +15% damage, +10% defense) is still not represented by the generic Dungeon-roster harness.");

    expect(rows).toHaveLength(TOWER_TRIAL_BLOCKS.length * WEAPON_FAMILIES.length);
    expect(rows.every((row) => row.outgoingBonusPct > 0)).toBe(true);
    expect(rows.every((row) => row.resilienceMultiplier === 0.9)).toBe(true);
    for (const block of TOWER_TRIAL_BLOCKS) {
      const blockRows = rows.filter((row) => row.block === block.blockIndex + 1);
      expect(new Set(blockRows.map((row) => row.family))).toEqual(new Set(WEAPON_FAMILIES));
    }
  });
});
