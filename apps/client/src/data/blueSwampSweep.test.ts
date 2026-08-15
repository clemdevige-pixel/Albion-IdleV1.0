import { describe, expect, it } from "vitest";
import { benchmarkBlueSegment } from "./blueProgressionBenchmark";
import { WORLD_ZONE_IDS } from "./worldContentCatalog";

const T3_WEAPONS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_staff_t3_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_dagger_t3_pair",
] as const;

const LOADOUTS = [
  { id: "starter_only", armorItemIds: [] as readonly string[] },
  { id: "torso_t3", armorItemIds: ["item_leather_armor"] as readonly string[] },
] as const;

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t3_", " ");
}

function masteryForSegment(segmentIndex: number): number {
  // Mirrors the observed natural T3 ramp used by the progression matrix:
  // S2 ~= mastery 5, S6 ~= mastery 7, S10 ~= mastery 10.
  return Math.max(4, Math.round(4 + ((segmentIndex + 1) / 10) * 6));
}

describe("Blue early Swamp progression sweep", () => {
  it("prints starter-only and torso-only performance across all ten Swamp segments", () => {
    const rows = LOADOUTS.flatMap((loadout) =>
      T3_WEAPONS.flatMap((weaponItemId) =>
        Array.from({ length: 10 }, (_, segmentIndex) => {
          const result = benchmarkBlueSegment({
            weaponItemId,
            masteryLevel: masteryForSegment(segmentIndex),
            enchantment: 0,
            zoneDefId: WORLD_ZONE_IDS.swamp,
            segmentIndex,
            useHealthPotions: false,
            defensiveLoadout: { armorItemIds: loadout.armorItemIds },
          });

          return {
            loadout: loadout.id,
            segment: segmentIndex + 1,
            mastery: masteryForSegment(segmentIndex),
            weapon: shortWeaponName(weaponItemId),
            clear: result.clear,
            ttkSeconds: Number(result.totalTimeSeconds.toFixed(1)),
            hpPercent: Number((result.remainingHealthRatio * 100).toFixed(1)),
            encounters: result.encounters.length,
          };
        }),
      ),
    );

    console.table(rows);
    console.log("[BLUE_SWAMP_PROGRESSION_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(LOADOUTS.length * T3_WEAPONS.length * 10);
    expect(rows.every((row) => Number.isFinite(row.ttkSeconds))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
  });
});
