import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { T4_DEFENSIVE_LOADOUT, T4_SHIELD } from "./weaponIdealBenchmark.js";
import { buildWeaponRoleBenchmark, getWeaponRoleLens } from "./weaponRoleBenchmark.js";

const T4_ROLE_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_bow_t4_badon",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

function referenceLoadout(itemId: string) {
  return resolveEquipmentInfo(itemId)?.handling === "one_handed"
    ? { armorItemIds: T4_DEFENSIVE_LOADOUT, offHandItemId: T4_SHIELD }
    : { armorItemIds: T4_DEFENSIVE_LOADOUT };
}

function shortName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

describe("role-aware weapon benchmark diagnostics", () => {
  it("reports every authored weapon role without collapsing them into one universal score", () => {
    const rows = buildWeaponRoleBenchmark(T4_ROLE_WEAPONS, 30, 2, referenceLoadout);

    console.log("[WEAPON_ROLE_DIAGNOSTIC_T4_2_M30]");
    console.table(rows.map((row) => ({
      weapon: shortName(row.itemId),
      gameplay: row.gameplayProfile,
      primaryRole: row.primaryContentRole,
      secondaryRole: row.secondaryContentRole ?? "-",
      sustainedDps: row.sustainedDps,
      opener5Dps: row.opener5Dps,
      opener10Dps: row.opener10Dps,
      sustainedIndex: row.sustainedIndex,
      opener5Index: row.opener5Index,
      opener10Index: row.opener10Index,
      packageScore: row.packageScore,
      hardControl30s: row.hardControlSecondsPer30s,
      debuffUptime: row.debuffUptimePercent,
      roleLens: row.primaryRoleLens.join(" / "),
    })));

    expect(rows).toHaveLength(T4_ROLE_WEAPONS.length);
    expect(new Set(rows.map((row) => row.itemId)).size).toBe(T4_ROLE_WEAPONS.length);
    expect(rows.every((row) => row.primaryRoleLens.length > 0)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.sustainedDps))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.opener5Dps))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.opener10Dps))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.packageScore))).toBe(true);
  });

  it("uses distinct diagnostic lenses for different content roles", () => {
    expect(getWeaponRoleLens("fame_farm")).toEqual(["opener_5s", "opener_10s", "sustained"]);
    expect(getWeaponRoleLens("boss")).toEqual(["sustained", "opener_10s"]);
    expect(getWeaponRoleLens("dungeon")).toContain("hard_control");
    expect(getWeaponRoleLens("general_progression")).toContain("package");
  });

  it("captures authored control utility instead of pretending every dungeon weapon is pure DPS", () => {
    const rows = buildWeaponRoleBenchmark(T4_ROLE_WEAPONS, 30, 2, referenceLoadout);
    const badon = rows.find((row) => row.itemId === "item_weapon_bow_t4_badon");
    const broadsword = rows.find((row) => row.itemId === "item_weapon_sword_t4_broadsword");

    expect(badon?.hardControlSecondsPer30s).toBeGreaterThan(0);
    expect(broadsword?.debuffUptimePercent).toBeGreaterThan(0);
  });
});
