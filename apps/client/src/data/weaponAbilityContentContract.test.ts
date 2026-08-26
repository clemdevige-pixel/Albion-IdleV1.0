import { describe, expect, it } from "vitest";
import {
  CLIENT_ABILITIES,
  type AbilityMechanic,
} from "./weaponContentCatalog";
import {
  WEAPON_ABILITY_MECHANICS,
  getWeaponAbilityMechanics,
} from "./weaponAbilityMechanics";

type DamageMechanic = Extract<AbilityMechanic, { readonly kind: "damage" }>;

function primaryDamageRatio(mechanics: readonly AbilityMechanic[]): number {
  return mechanics.find(
    (mechanic): mechanic is DamageMechanic => mechanic.kind === "damage",
  )?.ratio ?? 0;
}

describe("weapon ability content contract", () => {
  it("authors combat mechanics on every client ability", () => {
    for (const ability of Object.values(CLIENT_ABILITIES)) {
      expect(ability.mechanics.mechanics.length, ability.id).toBeGreaterThan(0);
      expect(getWeaponAbilityMechanics(ability.id)).toBe(ability.mechanics);
      expect(WEAPON_ABILITY_MECHANICS[ability.id]).toBe(ability.mechanics);
    }
  });

  it("derives legacy compatibility fields from the authoritative mechanics", () => {
    for (const ability of Object.values(CLIENT_ABILITIES)) {
      expect(ability.bonusDamageRatio, ability.id).toBe(
        primaryDamageRatio(ability.mechanics.mechanics),
      );
      expect(ability.autoCast, ability.id).toEqual(ability.mechanics.autoRule);
    }
  });

  it("keeps conditional weapon behavior fully described by its own ability data", () => {
    const infernalBurst = CLIENT_ABILITIES["ability_fire_infernal_burst"];
    const crossAssault = CLIENT_ABILITIES["ability_dagger_pair_cross_assault"];

    expect(infernalBurst?.mechanics.autoRule).toEqual({
      kind: "target_has_effect",
      effectId: "effect_fire_burn",
    });
    expect(crossAssault?.mechanics.autoRule).toEqual({
      kind: "target_has_effect",
      effectId: "effect_dagger_opening",
    });
  });

  it("keeps dagger opening signatures synchronized with Flurry", () => {
    const flurry = CLIENT_ABILITIES["ability_dagger_flurry"];
    const crossAssault = CLIENT_ABILITIES["ability_dagger_pair_cross_assault"];
    const ghostStrike = CLIENT_ABILITIES["ability_dagger_deathgivers_ghost_strike"];

    expect(flurry).toBeDefined();
    expect(crossAssault?.cooldown).toBe((flurry?.cooldown ?? 0) * 2);
    expect(ghostStrike?.cooldown).toBe((flurry?.cooldown ?? 0) * 2);
  });
});
