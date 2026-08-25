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

describe("role-aware weapon benchmark contracts", () => {
  it("uses distinct lenses for different content roles", () => {
    expect(getWeaponRoleLens("fame_farm")).toEqual(["opener_5s", "opener_10s", "sustained"]);
    expect(getWeaponRoleLens("boss")).toEqual(["sustained", "opener_10s"]);
    expect(getWeaponRoleLens("dungeon")).toContain("hard_control");
    expect(getWeaponRoleLens("general_progression")).toContain("package");
  });

  it("captures authored control utility instead of treating every dungeon weapon as pure DPS", () => {
    const rows = buildWeaponRoleBenchmark(T4_ROLE_WEAPONS, 30, 2, referenceLoadout);
    const badon = rows.find((row) => row.itemId === "item_weapon_bow_t4_badon");
    const broadsword = rows.find((row) => row.itemId === "item_weapon_sword_t4_broadsword");

    expect(badon?.hardControlSecondsPer30s).toBeGreaterThan(0);
    expect(broadsword?.debuffUptimePercent).toBeGreaterThan(0);
  });
});
