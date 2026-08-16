import { describe, expect, it } from "vitest";
import {
  WEAPON_MECHANICS_CONTRACT,
  canContinueWeaponMultiHit,
  matchesWeaponDotIdentity,
  snapshotWeaponDotSourceDamage,
} from "./weaponMechanicsContract";

describe("shared weapon mechanics contract", () => {
  it("keeps mechanic execution ordered by authored data", () => {
    expect(WEAPON_MECHANICS_CONTRACT.execution.mechanicOrder).toBe("authored_order");
  });

  it("keeps multi-hit damage as one total budget and stops on target death", () => {
    expect(WEAPON_MECHANICS_CONTRACT.multiHit).toEqual({
      damageBudget: "total_evenly_split",
      stopOnTargetDeath: true,
    });
    expect(canContinueWeaponMultiHit(true)).toBe(true);
    expect(canContinueWeaponMultiHit(false)).toBe(false);
  });

  it("identifies DoTs by source, target and effect id", () => {
    const active = { source: "hero", target: "enemy_a", effectId: "burn" };
    expect(matchesWeaponDotIdentity(active, active)).toBe(true);
    expect(matchesWeaponDotIdentity(active, { ...active, effectId: "cataclysm" })).toBe(false);
    expect(matchesWeaponDotIdentity(active, { ...active, target: "enemy_b" })).toBe(false);
    expect(matchesWeaponDotIdentity(active, { ...active, source: "worker" })).toBe(false);
  });

  it("keeps same-effect DoTs refresh-only with a first-application source snapshot", () => {
    expect(WEAPON_MECHANICS_CONTRACT.dot).toEqual({
      damageScaling: "snapshot_source_damage_on_first_apply",
      identity: "source_target_effect_id",
      reapply: "refresh_duration_and_ticks_keep_snapshot",
      stacking: "same_effect_does_not_stack",
    });
    expect(snapshotWeaponDotSourceDamage(123)).toBe(123);
  });

  it("keeps same status effects refresh-only under EffectManager identity rules", () => {
    expect(WEAPON_MECHANICS_CONTRACT.status).toEqual({
      identity: "source_target_effect_type_effect_id",
      reapply: "refresh_duration_keep_strongest",
      stacking: "same_effect_does_not_stack",
    });
  });
});
