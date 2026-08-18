import { describe, expect, it } from "vitest";
import {
  WEAPON_BALANCE_PROFILES,
  resolveWeaponBalanceProfileByMasteryId,
} from "./weaponBalanceProfileCatalog.js";

describe("weapon balance profiles", () => {
  it("assigns one explicit balance profile to every currently authored specialization", () => {
    expect(Object.keys(WEAPON_BALANCE_PROFILES).sort()).toEqual([
      "mastery_badon",
      "mastery_broadsword",
      "mastery_dagger_pair",
      "mastery_infernal_staff",
      "mastery_longbow",
      "mastery_spiked_gauntlets",
    ]);
  });

  it("keeps profiles as descriptive benchmark metadata", () => {
    expect(resolveWeaponBalanceProfileByMasteryId("mastery_dagger_pair")).toMatchObject({
      gameplayProfile: "combo_execute",
      primaryContentRole: "boss",
    });
    expect(resolveWeaponBalanceProfileByMasteryId("mastery_longbow")).toMatchObject({
      primaryContentRole: "fame_farm",
    });
    expect(resolveWeaponBalanceProfileByMasteryId("unknown")).toBeUndefined();
  });
});
