import { describe, expect, it } from "vitest";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type WeaponFamily = "broadsword" | "longbow" | "infernal" | "spiked" | "dual_dagger";
type CapeMode = "traveler" | "faction";

const TIERS: readonly Tier[] = [4, 5, 6, 7, 8];
const FAMILIES: readonly WeaponFamily[] = ["broadsword", "longbow", "infernal", "spiked", "dual_dagger"];
const CAPE_MODES: readonly CapeMode[] = ["traveler", "faction"];

const MASTERY_BY_TIER: Readonly<Record<Tier, number>> = {
  4: 22,
  5: 35,
  6: 45,
  7: 55,
  8: 65,
};

const ZONE_BY_TIER = {
  4: WORLD_ZONE_IDS.mountain,
  5: WORLD_ZONE_IDS.ironveil,
  6: WORLD_ZONE_IDS.ashenpeak,
  7: WORLD_ZONE_IDS.doompeak,
  8: WORLD_ZONE_IDS.blackspire,
} as const;

function weaponId(tier: Tier, family: WeaponFamily): string {
  if (family === "broadsword") return `item_weapon_sword_t${tier}_broadsword`;
  if (family === "longbow") return `item_weapon_bow_t${tier}_longbow`;
  if (family === "infernal") return `item_weapon_staff_t${tier}_infernal`;
  if (family === "spiked") return `item_weapon_gloves_t${tier}_spiked_gauntlets`;
  return `item_weapon_dagger_t${tier}_pair`;
}

function capeId(tier: Tier, faction: string, mode: CapeMode): string {
  return mode === "traveler"
    ? "item_traveler_cape"
    : `item_cape_t${tier}_${faction.toLowerCase()}`;
}

function armorIds(
  tier: Tier,
  family: WeaponFamily,
  faction: string,
  capeMode: CapeMode,
): readonly string[] {
  const base = [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
    capeId(tier, faction, capeMode),
  ];
  return family === "broadsword"
    ? [...base, `item_shield_t${tier}_reinforced`]
    : base;
}

const round1 = (value: number): number => Number(value.toFixed(1));

describe("same-tier .3 dungeon benchmark across all weapons and faction capes", () => {
  it("compares traveler cape against the matching same-tier faction cape", () => {
    const rows: Array<{
      tier: Tier;
      faction: string;
      dungeon: string;
      weapon: WeaponFamily;
      cape: CapeMode;
      mastery: number;
      capeReductionPct: number;
      armor: number;
      magicResistance: number;
      clear: boolean;
      encounterReached: number;
      seconds: number;
      hpPercent: number;
      observedDps: number;
      damageReceived: number;
    }> = [];

    for (const tier of TIERS) {
      const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
      for (const dungeon of dungeons) {
        for (const family of FAMILIES) {
          for (const capeMode of CAPE_MODES) {
            const result = runCombatRuntimeBenchmark({
              label: `${dungeon.id}:${family}:${capeMode}:t${tier}.3`,
              weaponItemId: weaponId(tier, family),
              equipmentItemIds: armorIds(tier, family, dungeon.faction, capeMode),
              zoneDefId: ZONE_BY_TIER[tier],
              segmentIndex: 9,
              dungeonDefinitionId: dungeon.id,
              enchantment: 3,
              masteryLevel: MASTERY_BY_TIER[tier],
              useHealthPotions: false,
            });

            rows.push({
              tier,
              faction: dungeon.faction,
              dungeon: dungeon.id,
              weapon: family,
              cape: capeMode,
              mastery: MASTERY_BY_TIER[tier],
              capeReductionPct: result.dungeonDamageReductionPercent,
              armor: result.armor,
              magicResistance: result.magicResistance,
              clear: result.clear,
              encounterReached: result.encounterReached,
              seconds: result.seconds,
              hpPercent: result.hpPercent,
              observedDps: result.observedDps,
              damageReceived: result.damageReceived,
            });
          }
        }
      }
    }

    const tierCapeSummary = TIERS.flatMap((tier) => CAPE_MODES.map((cape) => {
      const tierRows = rows.filter((row) => row.tier === tier && row.cape === cape);
      const cleared = tierRows.filter((row) => row.clear);
      return {
        tier,
        cape,
        runs: tierRows.length,
        clears: cleared.length,
        clearRatePct: round1((cleared.length / tierRows.length) * 100),
        avgClearSeconds: cleared.length > 0
          ? round1(cleared.reduce((sum, row) => sum + row.seconds, 0) / cleared.length)
          : 0,
        avgClearHpPct: cleared.length > 0
          ? round1(cleared.reduce((sum, row) => sum + row.hpPercent, 0) / cleared.length)
          : 0,
        avgDamageReceived: round1(
          tierRows.reduce((sum, row) => sum + row.damageReceived, 0) / tierRows.length,
        ),
        capeReductionPct: round1(
          tierRows.reduce((sum, row) => sum + row.capeReductionPct, 0) / tierRows.length,
        ),
      };
    }));

    const capeImpact = TIERS.map((tier) => {
      const traveler = rows.filter((row) => row.tier === tier && row.cape === "traveler");
      const faction = rows.filter((row) => row.tier === tier && row.cape === "faction");
      const travelerClears = traveler.filter((row) => row.clear);
      const factionClears = faction.filter((row) => row.clear);
      const avgTravelerDamage = traveler.reduce((sum, row) => sum + row.damageReceived, 0) / traveler.length;
      const avgFactionDamage = faction.reduce((sum, row) => sum + row.damageReceived, 0) / faction.length;
      return {
        tier,
        travelerClears: `${travelerClears.length}/${traveler.length}`,
        factionClears: `${factionClears.length}/${faction.length}`,
        clearRateDeltaPct: round1(
          ((factionClears.length / faction.length) - (travelerClears.length / traveler.length)) * 100,
        ),
        avgDamageTraveler: round1(avgTravelerDamage),
        avgDamageFaction: round1(avgFactionDamage),
        avgDamageReductionPct: avgTravelerDamage > 0
          ? round1((1 - avgFactionDamage / avgTravelerDamage) * 100)
          : 0,
      };
    });

    const weaponCapeSummary = FAMILIES.flatMap((weapon) => TIERS.flatMap((tier) => CAPE_MODES.map((cape) => {
      const weaponRows = rows.filter(
        (row) => row.weapon === weapon && row.tier === tier && row.cape === cape,
      );
      const cleared = weaponRows.filter((row) => row.clear);
      return {
        tier,
        weapon,
        cape,
        clears: `${cleared.length}/${weaponRows.length}`,
        avgSeconds: cleared.length > 0
          ? round1(cleared.reduce((sum, row) => sum + row.seconds, 0) / cleared.length)
          : 0,
        avgHpPct: cleared.length > 0
          ? round1(cleared.reduce((sum, row) => sum + row.hpPercent, 0) / cleared.length)
          : 0,
        avgDps: round1(
          weaponRows.reduce((sum, row) => sum + row.observedDps, 0) / weaponRows.length,
        ),
        avgEncounterReached: round1(
          weaponRows.reduce((sum, row) => sum + row.encounterReached, 0) / weaponRows.length,
        ),
      };
    }))));

    console.log("[DUNGEON_TN3_CAPE_BENCHMARK]");
    console.table(rows);
    console.log("[DUNGEON_TN3_TIER_CAPE_SUMMARY]");
    console.table(tierCapeSummary);
    console.log("[DUNGEON_TN3_CAPE_IMPACT]");
    console.table(capeImpact);
    console.log("[DUNGEON_TN3_WEAPON_CAPE_SUMMARY]");
    console.table(weaponCapeSummary);
    console.log("[DUNGEON_TN3_CAPE_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(DUNGEON_DEFINITIONS.length * FAMILIES.length * CAPE_MODES.length);
    expect(rows.every((row) => Number.isFinite(row.seconds) && Number.isFinite(row.observedDps))).toBe(true);
    expect(rows.filter((row) => row.cape === "traveler").every((row) => row.capeReductionPct === 0)).toBe(true);
    expect(rows.filter((row) => row.cape === "faction").every((row) => row.capeReductionPct > 0)).toBe(true);
  });
});
