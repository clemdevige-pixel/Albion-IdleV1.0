import { describe, expect, it } from "vitest";
import {
  getWeaponMasteryFamilyDefinitions,
  resolveArtifactDungeonDamageBonusPercent,
  resolveUnlockedWeaponAbilities,
  resolveWeaponArtifactFaction,
  resolveWeaponAttackSpeed,
  resolveWeaponTier,
} from "./weaponContentCatalog.js";

type ArtifactFixture = {
  readonly family: "sword" | "bow" | "fire_staff" | "gloves" | "dagger";
  readonly faction: "Keeper" | "Morgana" | "Undead" | "Heretic";
  readonly slug: string;
  readonly existingBadon?: boolean;
};

const ARTIFACTS: readonly ArtifactFixture[] = [
  { family: "sword", faction: "Keeper", slug: "sword_clarent" },
  { family: "sword", faction: "Morgana", slug: "sword_carving" },
  { family: "sword", faction: "Undead", slug: "sword_galatine" },
  { family: "sword", faction: "Heretic", slug: "sword_claymore" },
  { family: "bow", faction: "Keeper", slug: "bow_t4_badon", existingBadon: true },
  { family: "bow", faction: "Morgana", slug: "bow_wailing" },
  { family: "bow", faction: "Undead", slug: "bow_whispering" },
  { family: "bow", faction: "Heretic", slug: "bow_warbow" },
  { family: "fire_staff", faction: "Keeper", slug: "staff_wildfire" },
  { family: "fire_staff", faction: "Morgana", slug: "staff_blazing" },
  { family: "fire_staff", faction: "Undead", slug: "staff_brimstone" },
  { family: "fire_staff", faction: "Heretic", slug: "staff_great_fire" },
  { family: "gloves", faction: "Keeper", slug: "gloves_ursine" },
  { family: "gloves", faction: "Morgana", slug: "gloves_ravenstrike" },
  { family: "gloves", faction: "Undead", slug: "gloves_hellfire" },
  { family: "gloves", faction: "Heretic", slug: "gloves_battle_bracers" },
  { family: "dagger", faction: "Keeper", slug: "dagger_bloodletter" },
  { family: "dagger", faction: "Morgana", slug: "dagger_demonfang" },
  { family: "dagger", faction: "Undead", slug: "dagger_deathgivers" },
  { family: "dagger", faction: "Heretic", slug: "dagger_claws" },
];

function itemIdFor(entry: ArtifactFixture, tier: 4 | 5 | 6 | 7 | 8): string {
  if (entry.existingBadon === true) return `item_weapon_bow_t${String(tier)}_badon`;
  return `item_weapon_${entry.slug}_t${String(tier)}`;
}

describe("faction artifact weapon content", () => {
  it("provides four artifact specializations per weapon family", () => {
    const definitions = getWeaponMasteryFamilyDefinitions();
    for (const family of ["sword", "bow", "fire_staff", "gloves", "dagger"] as const) {
      const definition = definitions.find((entry) => entry.familyId === family);
      expect(definition).toBeDefined();
      const expectedArtifactMasteries = ARTIFACTS.filter((entry) => entry.family === family).length;
      expect(definition?.specializationMasteryIds).toHaveLength(expectedArtifactMasteries + 1);
    }
  });

  it("authors every artifact from T4 through T8 with its faction affinity", () => {
    for (const artifact of ARTIFACTS) {
      for (const tier of [4, 5, 6, 7, 8] as const) {
        const itemId = itemIdFor(artifact, tier);
        expect(resolveWeaponTier(itemId)).toBe(tier);
        expect(resolveWeaponAttackSpeed(itemId)).toBeGreaterThan(0);
        expect(resolveWeaponArtifactFaction(itemId)).toBe(artifact.faction);
      }
    }
  });

  it("uses the directed Keeper -> Morgana -> Undead -> Heretic -> Keeper advantage loop", () => {
    const keeper = itemIdFor(ARTIFACTS[0]!, 4);
    const morgana = itemIdFor(ARTIFACTS[1]!, 4);
    const undead = itemIdFor(ARTIFACTS[2]!, 4);
    const heretic = itemIdFor(ARTIFACTS[3]!, 4);

    expect(resolveArtifactDungeonDamageBonusPercent(keeper, "Morgana")).toBe(20);
    expect(resolveArtifactDungeonDamageBonusPercent(morgana, "Undead")).toBe(20);
    expect(resolveArtifactDungeonDamageBonusPercent(undead, "Heretic")).toBe(20);
    expect(resolveArtifactDungeonDamageBonusPercent(heretic, "Keeper")).toBe(20);
    expect(resolveArtifactDungeonDamageBonusPercent(keeper, "Keeper")).toBe(0);
    expect(resolveArtifactDungeonDamageBonusPercent("item_weapon_sword_t4_broadsword", "Morgana")).toBe(0);
  });

  it("moves execute identity from Dagger Pair to Bloodletter", () => {
    const pairAbilities = resolveUnlockedWeaponAbilities("item_weapon_dagger_t4_pair", 30);
    const bloodletterAbilities = resolveUnlockedWeaponAbilities("item_weapon_dagger_bloodletter_t4", 30);

    expect(pairAbilities.at(-1)?.id).toBe("ability_dagger_pair_cross_assault");
    expect(pairAbilities.at(-1)?.mechanics.autoRule).toBeUndefined();
    expect(bloodletterAbilities.at(-1)?.id).toBe("ability_dagger_bloodletter_lunging_stabs");
    expect(bloodletterAbilities.at(-1)?.mechanics.autoRule).toEqual({ kind: "target_health_below", ratio: 0.4 });
  });
});
