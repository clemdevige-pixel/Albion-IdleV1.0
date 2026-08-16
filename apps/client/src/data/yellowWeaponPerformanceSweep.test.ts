import { describe, expect, it } from "vitest";
import { getSyntheticIdealWeaponProfile, getWeaponBenchmarkProfile } from "./weaponIdealBenchmark";

const WEAPONS = [
  "item_weapon_sword_t5_broadsword",
  "item_weapon_bow_t5_longbow",
  "item_weapon_staff_t5_infernal",
  "item_weapon_gloves_t5_spiked_gauntlets",
  "item_weapon_dagger_t5_pair",
] as const;

const CHECKPOINTS = [
  { mastery: 29, enchantment: 1 as const, label: "stormwatch_target" },
  { mastery: 30, enchantment: 1 as const, label: "post_signature_unlock" },
  { mastery: 32, enchantment: 2 as const, label: "sunscar_target" },
  { mastery: 35, enchantment: 2 as const, label: "ironveil_target" },
] as const;

describe("Yellow weapon performance sweep", () => {
  it("compares T5 weapon offense against the existing synthetic ideal", () => {
    const rows = CHECKPOINTS.flatMap((checkpoint) => {
      const profiles = WEAPONS.map((weaponItemId) => getWeaponBenchmarkProfile(
        weaponItemId,
        checkpoint.mastery,
        checkpoint.enchantment,
      ));
      const ideal = getSyntheticIdealWeaponProfile(profiles, checkpoint.mastery);

      return profiles.map((profile) => ({
        checkpoint: checkpoint.label,
        mastery: checkpoint.mastery,
        enchantment: checkpoint.enchantment,
        weapon: profile.itemId.replace("item_weapon_", "").replace("_t5_", " "),
        abilities: profile.unlockedAbilityCount,
        autoDps: Number(profile.autoAttackDps.toFixed(2)),
        abilityDps: Number(profile.abilityDps.toFixed(2)),
        sustainedDps: Number(profile.sustainedDps.toFixed(2)),
        sustainedVsMedianPct: Number(((profile.sustainedDps / ideal.sustainedDps) * 100).toFixed(1)),
        opener5s: Number(profile.openerDps5s.toFixed(2)),
        opener5sVsMedianPct: Number(((profile.openerDps5s / ideal.openerDps5s) * 100).toFixed(1)),
        opener10s: Number(profile.openerDps10s.toFixed(2)),
        opener10sVsMedianPct: Number(((profile.openerDps10s / ideal.openerDps10s) * 100).toFixed(1)),
      }));
    });

    console.table(rows);
    console.log("[YELLOW_WEAPON_PERFORMANCE_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * WEAPONS.length);
    expect(rows.every((row) => Number.isFinite(row.sustainedDps) && row.sustainedDps > 0)).toBe(true);
  });
});
