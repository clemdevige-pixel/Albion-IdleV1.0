import { describe, expect, it, vi } from "vitest";

const profileTuning = vi.hoisted(() => ({ hp: 1, damage: 1, defense: 1 }));

vi.mock("./dungeonContentCatalog.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./dungeonContentCatalog.js")>();
  return {
    ...actual,
    resolveDungeonCombatProfile: (
      input: Parameters<typeof actual.resolveDungeonCombatProfile>[0],
    ): ReturnType<typeof actual.resolveDungeonCombatProfile> => {
      const profile = actual.resolveDungeonCombatProfile(input);
      if (input.dungeonDefinitionId !== "dungeon_heretic_t4") return profile;
      return {
        ...profile,
        hp: profile.hp * profileTuning.hp,
        damage: profile.damage * profileTuning.damage,
        armor: profile.armor * profileTuning.defense,
        magicResistance: profile.magicResistance * profileTuning.defense,
      };
    },
  };
});

import { HERETIC_T4_DUNGEON_ID } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import {
  runCombatRuntimeBenchmark,
  type CombatRuntimeBenchmarkDamageTuning,
} from "../runtime/CombatRuntimeBenchmarkHarness.js";

type WeaponFamily = "broadsword" | "longbow" | "infernal" | "spiked" | "dual_dagger";

type ProfileCandidate = {
  readonly id: string;
  readonly hp: number;
  readonly damage: number;
  readonly defense: number;
};

const MASTERY_LEVEL = 22;
const FACTION_WEAPON_BONUS = 1.2;
const FAMILIES: readonly WeaponFamily[] = ["broadsword", "longbow", "infernal", "spiked", "dual_dagger"];
const PROFILE_CANDIDATES: readonly ProfileCandidate[] = [
  { id: "p95_d95_def100", hp: 0.95, damage: 0.95, defense: 1 },
  { id: "p90_d95_def98", hp: 0.9, damage: 0.95, defense: 0.98 },
  { id: "p90_d90_def98", hp: 0.9, damage: 0.9, defense: 0.98 },
  { id: "p85_d90_def95", hp: 0.85, damage: 0.9, defense: 0.95 },
  { id: "p85_d85_def95", hp: 0.85, damage: 0.85, defense: 0.95 },
  { id: "p80_d85_def95", hp: 0.8, damage: 0.85, defense: 0.95 },
];

function weaponId(family: WeaponFamily): string {
  if (family === "broadsword") return "item_weapon_sword_t4_broadsword";
  if (family === "longbow") return "item_weapon_bow_t4_longbow";
  if (family === "infernal") return "item_weapon_staff_t4_infernal";
  if (family === "spiked") return "item_weapon_gloves_t4_spiked_gauntlets";
  return "item_weapon_dagger_t4_pair";
}

function equipmentIds(family: WeaponFamily): readonly string[] {
  const base = [
    "item_helmet_t4_reinforced",
    "item_armor_t4_leather",
    "item_boots_t4_leather",
    "item_cape_t4_heretic",
  ];
  return family === "broadsword"
    ? [...base, "item_shield_t4_reinforced"]
    : base;
}

function benchmarkDamageTuning(family: WeaponFamily): CombatRuntimeBenchmarkDamageTuning | undefined {
  if (family === "longbow") return { autoAttackMultiplier: 0.84 };
  if (family === "infernal") {
    return {
      directAbilityMultiplierById: {
        ability_fire_fireball: 1.05,
        ability_fire_cataclysm: 1.1,
      },
      effectDamageMultiplier: 1.5,
    };
  }
  if (family === "dual_dagger") {
    return {
      directAbilityMultiplierById: {
        ability_dagger_double_slash: 1.1,
        ability_dagger_flurry: 1.1,
      },
    };
  }
  return undefined;
}

const round1 = (value: number): number => Number(value.toFixed(1));

describe("T4 Heretic profile calibration around fixed faction weapon bonus", () => {
  it("finds a profile where base weapons stay blocked and +20% faction weapons all clear", () => {
    const rows = PROFILE_CANDIDATES.flatMap((candidate) => {
      profileTuning.hp = candidate.hp;
      profileTuning.damage = candidate.damage;
      profileTuning.defense = candidate.defense;

      return FAMILIES.flatMap((family) => [false, true].map((factionWeapon) => {
        const damageTuning = benchmarkDamageTuning(family);
        const result = runCombatRuntimeBenchmark({
          label: `${HERETIC_T4_DUNGEON_ID}:${candidate.id}:${family}:${factionWeapon ? "faction20" : "base"}`,
          weaponItemId: weaponId(family),
          equipmentItemIds: equipmentIds(family),
          zoneDefId: WORLD_ZONE_IDS.mountain,
          segmentIndex: 9,
          dungeonDefinitionId: HERETIC_T4_DUNGEON_ID,
          enchantment: 3,
          masteryLevel: MASTERY_LEVEL,
          useHealthPotions: true,
          ...(factionWeapon ? { heroDamageMultiplier: FACTION_WEAPON_BONUS } : {}),
          ...(damageTuning === undefined ? {} : { damageTuning }),
        });

        return {
          profile: candidate.id,
          hpMultiplier: candidate.hp,
          damageMultiplier: candidate.damage,
          defenseMultiplier: candidate.defense,
          factionWeapon,
          weapon: family,
          clear: result.clear,
          bossProgressPct: result.bossProgressPercent,
          hpPct: result.hpPercent,
          seconds: result.seconds,
          potions: result.potionsUsed,
        };
      }));
    });

    const summary = PROFILE_CANDIDATES.flatMap((candidate) => [false, true].map((factionWeapon) => {
      const candidateRows = rows.filter((row) => row.profile === candidate.id && row.factionWeapon === factionWeapon);
      const clears = candidateRows.filter((row) => row.clear);
      return {
        profile: candidate.id,
        hpMultiplier: candidate.hp,
        damageMultiplier: candidate.damage,
        defenseMultiplier: candidate.defense,
        weaponMode: factionWeapon ? "faction+20%" : "base",
        clears: `${clears.length}/${candidateRows.length}`,
        clearRatePct: round1((clears.length / candidateRows.length) * 100),
        avgBossProgressPct: round1(candidateRows.reduce((sum, row) => sum + row.bossProgressPct, 0) / candidateRows.length),
        minBossProgressPct: round1(Math.min(...candidateRows.map((row) => row.bossProgressPct))),
        avgClearHpPct: clears.length > 0
          ? round1(clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length)
          : 0,
      };
    }));

    console.log("[DUNGEON_T4_HERETIC_PROFILE_CALIBRATION]");
    console.table(summary);
    console.log("[DUNGEON_T4_HERETIC_PROFILE_CALIBRATION_DETAIL]");
    console.table(rows);

    expect(rows).toHaveLength(PROFILE_CANDIDATES.length * FAMILIES.length * 2);
    expect(rows.every((row) => row.potions > 0)).toBe(true);
  });
});
