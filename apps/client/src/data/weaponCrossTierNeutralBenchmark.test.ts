import { describe, expect, it } from "vitest";
import { buildWeaponOnlyBenchmark, buildWeaponPackageBenchmark } from "./weaponPackageBenchmark.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type WeaponFamily = "broadsword" | "longbow" | "infernal" | "spiked" | "dual_dagger";

const TIERS: readonly Tier[] = [4, 5, 6, 7, 8];
const FAMILIES: readonly WeaponFamily[] = ["broadsword", "longbow", "infernal", "spiked", "dual_dagger"];

const MASTERY_BY_TIER: Readonly<Record<Tier, number>> = {
  4: 22,
  5: 35,
  6: 45,
  7: 55,
  8: 65,
};

function weaponId(tier: Tier, family: WeaponFamily): string {
  if (family === "broadsword") return `item_weapon_sword_t${tier}_broadsword`;
  if (family === "longbow") return `item_weapon_bow_t${tier}_longbow`;
  if (family === "infernal") return `item_weapon_staff_t${tier}_infernal`;
  if (family === "spiked") return `item_weapon_gloves_t${tier}_spiked_gauntlets`;
  return `item_weapon_dagger_t${tier}_pair`;
}

function armorIds(tier: Tier): readonly string[] {
  return [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
    "item_traveler_cape",
  ];
}

function familyFromItemId(itemId: string): WeaponFamily {
  if (itemId.includes("broadsword")) return "broadsword";
  if (itemId.includes("longbow")) return "longbow";
  if (itemId.includes("infernal")) return "infernal";
  if (itemId.includes("spiked_gauntlets")) return "spiked";
  return "dual_dagger";
}

describe("cross-tier neutral weapon balance benchmark", () => {
  it("compares intrinsic offense and full package at identical tier progression checkpoints", () => {
    const rows: Array<Record<string, string | number>> = [];

    for (const tier of TIERS) {
      const mastery = MASTERY_BY_TIER[tier];
      const itemIds = FAMILIES.map((family) => weaponId(tier, family));
      const offenseRows = buildWeaponOnlyBenchmark(itemIds, mastery, 3);
      const packageRows = buildWeaponPackageBenchmark(itemIds, mastery, 3, (itemId) => ({
        armorItemIds: armorIds(tier),
        ...(itemId.includes("broadsword") ? { offHandItemId: `item_shield_t${tier}_reinforced` } : {}),
      }));

      for (const offense of offenseRows) {
        const packageRow = packageRows.find((row) => row.itemId === offense.itemId);
        if (packageRow === undefined) throw new Error(`Missing package row for ${offense.itemId}`);
        rows.push({
          tier,
          mastery,
          enchantment: 3,
          weapon: familyFromItemId(offense.itemId),
          sustainedDps: offense.sustainedDps,
          opener5: offense.opener5,
          opener10: offense.opener10,
          offenseIndex: offense.offenseIndex,
          opener5Index: offense.opener5Index,
          opener10Index: offense.opener10Index,
          defenseIndex: packageRow.defenseIndex,
          packageScore: packageRow.packageScore,
        });
      }
    }

    console.log("[WEAPON_CROSS_TIER_NEUTRAL_BENCHMARK]");
    console.table(rows);

    const byWeapon = FAMILIES.map((weapon) => {
      const weaponRows = rows.filter((row) => row.weapon === weapon);
      const average = (key: "offenseIndex" | "opener5Index" | "opener10Index" | "defenseIndex" | "packageScore") =>
        Number((weaponRows.reduce((sum, row) => sum + Number(row[key]), 0) / weaponRows.length).toFixed(1));
      return {
        weapon,
        avgOffenseIndex: average("offenseIndex"),
        avgOpener5Index: average("opener5Index"),
        avgOpener10Index: average("opener10Index"),
        avgDefenseIndex: average("defenseIndex"),
        avgPackageScore: average("packageScore"),
        minPackageScore: Math.min(...weaponRows.map((row) => Number(row.packageScore))),
        maxPackageScore: Math.max(...weaponRows.map((row) => Number(row.packageScore))),
      };
    });

    console.log("[WEAPON_CROSS_TIER_NEUTRAL_SUMMARY]");
    console.table(byWeapon);
    console.log("[WEAPON_CROSS_TIER_NEUTRAL_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(TIERS.length * FAMILIES.length);
    expect(rows.every((row) => Number.isFinite(Number(row.packageScore)))).toBe(true);
  });
});
