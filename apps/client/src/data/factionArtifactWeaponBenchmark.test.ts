import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import {
  resolveArtifactDungeonDamageBonusPercent,
  resolveWeaponArtifactFaction,
} from "./weaponContentCatalog.js";
import {
  WORLD_ZONE_IDS,
  getWorldZonePlacement,
  type WorldZoneKey,
} from "./worldContentCatalog.js";

const TIERS = [4, 5, 6, 7, 8] as const;
type Tier = (typeof TIERS)[number];
type Family = "sword" | "bow" | "fire_staff" | "gloves" | "dagger";

type WeaponSpec = {
  readonly family: Family;
  readonly label: string;
  readonly artifact: boolean;
  readonly itemId: (tier: Tier) => string;
};

const WEAPONS: readonly WeaponSpec[] = [
  { family: "sword", label: "Broadsword", artifact: false, itemId: (tier) => `item_weapon_sword_t${tier}_broadsword` },
  { family: "sword", label: "Clarent Blade", artifact: true, itemId: (tier) => `item_weapon_sword_clarent_t${tier}` },
  { family: "sword", label: "Carving Sword", artifact: true, itemId: (tier) => `item_weapon_sword_carving_t${tier}` },
  { family: "sword", label: "Galatine Pair", artifact: true, itemId: (tier) => `item_weapon_sword_galatine_t${tier}` },
  { family: "sword", label: "Claymore", artifact: true, itemId: (tier) => `item_weapon_sword_claymore_t${tier}` },

  { family: "bow", label: "Longbow", artifact: false, itemId: (tier) => `item_weapon_bow_t${tier}_longbow` },
  { family: "bow", label: "Bow of Badon", artifact: true, itemId: (tier) => `item_weapon_bow_t${tier}_badon` },
  { family: "bow", label: "Wailing Bow", artifact: true, itemId: (tier) => `item_weapon_bow_wailing_t${tier}` },
  { family: "bow", label: "Whispering Bow", artifact: true, itemId: (tier) => `item_weapon_bow_whispering_t${tier}` },
  { family: "bow", label: "Warbow", artifact: true, itemId: (tier) => `item_weapon_bow_warbow_t${tier}` },

  { family: "fire_staff", label: "Infernal Staff", artifact: false, itemId: (tier) => `item_weapon_staff_t${tier}_infernal` },
  { family: "fire_staff", label: "Wildfire Staff", artifact: true, itemId: (tier) => `item_weapon_staff_wildfire_t${tier}` },
  { family: "fire_staff", label: "Blazing Staff", artifact: true, itemId: (tier) => `item_weapon_staff_blazing_t${tier}` },
  { family: "fire_staff", label: "Brimstone Staff", artifact: true, itemId: (tier) => `item_weapon_staff_brimstone_t${tier}` },
  { family: "fire_staff", label: "Great Fire Staff", artifact: true, itemId: (tier) => `item_weapon_staff_great_fire_t${tier}` },

  { family: "gloves", label: "Spiked Gauntlets", artifact: false, itemId: (tier) => `item_weapon_gloves_t${tier}_spiked_gauntlets` },
  { family: "gloves", label: "Ursine Maulers", artifact: true, itemId: (tier) => `item_weapon_gloves_ursine_t${tier}` },
  { family: "gloves", label: "Ravenstrike Cestus", artifact: true, itemId: (tier) => `item_weapon_gloves_ravenstrike_t${tier}` },
  { family: "gloves", label: "Hellfire Hands", artifact: true, itemId: (tier) => `item_weapon_gloves_hellfire_t${tier}` },
  { family: "gloves", label: "Battle Bracers", artifact: true, itemId: (tier) => `item_weapon_gloves_battle_bracers_t${tier}` },

  { family: "dagger", label: "Dagger Pair", artifact: false, itemId: (tier) => `item_weapon_dagger_t${tier}_pair` },
  { family: "dagger", label: "Bloodletter", artifact: true, itemId: (tier) => `item_weapon_dagger_bloodletter_t${tier}` },
  { family: "dagger", label: "Demonfang", artifact: true, itemId: (tier) => `item_weapon_dagger_demonfang_t${tier}` },
  { family: "dagger", label: "Deathgivers", artifact: true, itemId: (tier) => `item_weapon_dagger_deathgivers_t${tier}` },
  { family: "dagger", label: "Claws", artifact: true, itemId: (tier) => `item_weapon_dagger_claws_t${tier}` },
];

const FINAL_ZONE_BY_TIER = {
  4: "mountain",
  5: "ironveil",
  6: "ashenpeak",
  7: "doompeak",
  8: "blackspire",
} as const satisfies Readonly<Record<Tier, WorldZoneKey>>;

// T4 uses M30 so every specialization signature is actually part of the probe.
// The same authored level is seeded on family, equipped specialization and sibling
// specializations so the cross-specialization IP rule is represented symmetrically.
const MASTERY_BY_TIER = { 4: 30, 5: 36, 6: 46, 7: 56, 8: 65 } as const satisfies Readonly<Record<Tier, number>>;
const masteryProfileForTier = (tier: Tier) => ({
  familyMasteryLevel: MASTERY_BY_TIER[tier],
  specializationMasteryLevel: MASTERY_BY_TIER[tier],
  siblingSpecializationMasteryLevel: MASTERY_BY_TIER[tier],
} as const);

const ARMOR_BY_TIER: Readonly<Record<Tier, readonly string[]>> = {
  4: ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"],
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"],
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
  8: ["item_helmet_t8_reinforced", "item_armor_t8_leather", "item_boots_t8_leather", "item_traveler_cape"],
};

const SHIELD_BY_TIER: Readonly<Record<Tier, string>> = {
  4: "item_shield_t4_reinforced",
  5: "item_shield_t5_reinforced",
  6: "item_shield_t6_reinforced",
  7: "item_shield_t7_reinforced",
  8: "item_shield_t8_reinforced",
};

function equipmentFor(weaponItemId: string, tier: Tier, capeItemId?: string): readonly string[] {
  const items = ARMOR_BY_TIER[tier].filter((itemId) => !itemId.includes("cape"));
  items.push(capeItemId ?? "item_traveler_cape");
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

const round1 = (value: number): number => Number(value.toFixed(1));

/**
 * Artifact balance is intentionally diagnostic rather than a strict wall-lock.
 * These weapons are post-zone-clear rewards, so a small same-tier overclear is
 * allowed. We surface deltas against each family base weapon and only classify
 * extreme S1->S10 inversions as catastrophic candidates.
 */
describe("faction artifact weapon balance benchmark", () => {
  it("compares T4-T8 artifact reward power against each family base weapon", () => {
    const rows: Array<{
      tier: Tier;
      band: string;
      family: Family;
      weapon: string;
      faction: string;
      artifact: boolean;
      segment: number;
      potion: boolean;
      clear: boolean;
      seconds: number;
      hpPct: number;
      observedDps: number;
      damageReceived: number;
    }> = [];

    for (const tier of TIERS) {
      const zoneKey = FINAL_ZONE_BY_TIER[tier];
      const zoneDefId = WORLD_ZONE_IDS[zoneKey];
      const placement = getWorldZonePlacement(zoneDefId);
      for (const segmentIndex of [0, 4, 9] as const) {
        for (const weapon of WEAPONS) {
          const itemId = weapon.itemId(tier);
          const result = runCombatRuntimeBenchmark({
            label: `artifact_world_t${tier}_${weapon.label}_s${segmentIndex + 1}`,
            weaponItemId: itemId,
            zoneDefId,
            segmentIndex,
            equipmentItemIds: equipmentFor(itemId, tier),
            ...masteryProfileForTier(tier),
            enchantment: 3,
            useHealthPotions: false,
          });
          rows.push({
            tier,
            band: placement.bandId,
            family: weapon.family,
            weapon: weapon.label,
            faction: resolveWeaponArtifactFaction(itemId) ?? "base",
            artifact: weapon.artifact,
            segment: segmentIndex + 1,
            potion: false,
            clear: result.clear,
            seconds: round1(result.seconds),
            hpPct: round1(result.hpPercent),
            observedDps: round1(result.observedDps),
            damageReceived: round1(result.damageReceived),
          });
        }
      }

      for (const weapon of WEAPONS) {
        const itemId = weapon.itemId(tier);
        const result = runCombatRuntimeBenchmark({
          label: `artifact_world_t${tier}_${weapon.label}_s10_potion`,
          weaponItemId: itemId,
          zoneDefId,
          segmentIndex: 9,
          equipmentItemIds: equipmentFor(itemId, tier),
          ...masteryProfileForTier(tier),
          enchantment: 3,
          useHealthPotions: true,
        });
        rows.push({
          tier,
          band: placement.bandId,
          family: weapon.family,
          weapon: weapon.label,
          faction: resolveWeaponArtifactFaction(itemId) ?? "base",
          artifact: weapon.artifact,
          segment: 10,
          potion: true,
          clear: result.clear,
          seconds: round1(result.seconds),
          hpPct: round1(result.hpPercent),
          observedDps: round1(result.observedDps),
          damageReceived: round1(result.damageReceived),
        });
      }
    }

    const familySummaries: Array<{
      tier: Tier;
      family: Family;
      baseWeapon: string;
      baseCheckpointClears: number;
      strongestArtifact: string;
      artifactCheckpointClears: number;
      extraCheckpointClears: number;
      baseS10Dps: number;
      maxArtifactS10Dps: number;
      dpsRatio: number | null;
    }> = [];
    const anomalies: string[] = [];

    for (const tier of TIERS) {
      for (const family of ["sword", "bow", "fire_staff", "gloves", "dagger"] as const) {
        const familyRows = rows.filter((row) => row.tier === tier && row.family === family && !row.potion);
        const baseRows = familyRows.filter((row) => !row.artifact);
        const artifactWeapons = WEAPONS.filter((weapon) => weapon.family === family && weapon.artifact);
        const baseClears = baseRows.filter((row) => row.clear).length;
        const rankedArtifacts = artifactWeapons.map((weapon) => {
          const weaponRows = familyRows.filter((row) => row.weapon === weapon.label);
          return { weapon: weapon.label, clears: weaponRows.filter((row) => row.clear).length };
        }).sort((a, b) => b.clears - a.clears || a.weapon.localeCompare(b.weapon));
        const strongest = rankedArtifacts[0]!;
        const baseS10Dps = baseRows.find((row) => row.segment === 10)?.observedDps ?? 0;
        const artifactS10 = familyRows.filter((row) => row.artifact && row.segment === 10);
        const maxArtifactS10Dps = Math.max(...artifactS10.map((row) => row.observedDps));
        const extraCheckpointClears = strongest.clears - baseClears;

        familySummaries.push({
          tier,
          family,
          baseWeapon: baseRows[0]?.weapon ?? "unknown",
          baseCheckpointClears: baseClears,
          strongestArtifact: strongest.weapon,
          artifactCheckpointClears: strongest.clears,
          extraCheckpointClears,
          baseS10Dps: round1(baseS10Dps),
          maxArtifactS10Dps: round1(maxArtifactS10Dps),
          dpsRatio: baseS10Dps > 0 ? Number((maxArtifactS10Dps / baseS10Dps).toFixed(2)) : null,
        });

        const baseS1 = baseRows.find((row) => row.segment === 1)?.clear === true;
        const artifactS10Clearers = artifactS10.filter((row) => row.clear).map((row) => row.weapon);
        if (!baseS1 && artifactS10Clearers.length > 0) {
          anomalies.push(`T${tier} ${family}: base fails S1 while artifact clears S10 (${artifactS10Clearers.join(", ")})`);
        }
      }
    }

    console.log("[FACTION_ARTIFACT_WORLD_ROWS]");
    console.table(rows);
    console.log("[FACTION_ARTIFACT_WORLD_FAMILY_SUMMARY]");
    console.table(familySummaries);
    console.log("[FACTION_ARTIFACT_WORLD_CATASTROPHIC_CANDIDATES]", JSON.stringify(anomalies, null, 2));

    expect(rows).toHaveLength(TIERS.length * WEAPONS.length * 4);
    expect(rows.every((row) => Number.isFinite(row.observedDps) && row.observedDps >= 0)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.hpPct))).toBe(true);
    expect(familySummaries).toHaveLength(TIERS.length * 5);
  });

  it("measures the T4 directed +20% faction-dungeon matchups separately", () => {
    const t4Dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === 4);
    const artifacts = WEAPONS.filter((weapon) => weapon.artifact);
    const rows = t4Dungeons.flatMap((dungeon) => artifacts.map((weapon) => {
      const itemId = weapon.itemId(4);
      const faction = resolveWeaponArtifactFaction(itemId);
      const bonusPercent = resolveArtifactDungeonDamageBonusPercent(itemId, dungeon.faction);
      const capeItemId = `item_cape_t4_${dungeon.faction.toLowerCase()}`;
      const result = runCombatRuntimeBenchmark({
        label: `artifact_dungeon_t4_${weapon.label}_${dungeon.id}`,
        weaponItemId: itemId,
        equipmentItemIds: equipmentFor(itemId, 4, capeItemId),
        zoneDefId: WORLD_ZONE_IDS.mountain,
        segmentIndex: 9,
        dungeonDefinitionId: dungeon.id,
        enchantment: 3,
        ...masteryProfileForTier(4),
        useHealthPotions: true,
        // The benchmark harness owns its diagnostic resolver. Derive the
        // equivalent multiplier from the same canonical matrix used live.
        heroDamageMultiplier: 1 + bonusPercent / 100,
      });
      return {
        dungeon: dungeon.id,
        enemyFaction: dungeon.faction,
        family: weapon.family,
        weapon: weapon.label,
        artifactFaction: faction ?? "missing",
        favorable: bonusPercent === 20,
        bonusPct: bonusPercent,
        clear: result.clear,
        bossProgressPct: round1(result.bossProgressPercent),
        dps: round1(result.observedDps),
        seconds: round1(result.seconds),
        hpPct: round1(result.hpPercent),
        potions: result.potionsUsed,
      };
    }));

    const matchupSummary = artifacts.map((weapon) => {
      const weaponRows = rows.filter((row) => row.weapon === weapon.label);
      const favorable = weaponRows.find((row) => row.favorable);
      const neutral = weaponRows.filter((row) => !row.favorable);
      const neutralAvgDps = neutral.reduce((sum, row) => sum + row.dps, 0) / Math.max(1, neutral.length);
      return {
        family: weapon.family,
        weapon: weapon.label,
        faction: favorable?.artifactFaction ?? "missing",
        favorableDungeon: favorable?.enemyFaction ?? "missing",
        favorableClear: favorable?.clear ?? false,
        favorableDps: favorable?.dps ?? 0,
        neutralClears: neutral.filter((row) => row.clear).length,
        neutralAvgDps: round1(neutralAvgDps),
        favorableVsNeutralDpsRatio: neutralAvgDps > 0 && favorable !== undefined
          ? Number((favorable.dps / neutralAvgDps).toFixed(2))
          : null,
      };
    });

    console.log("[FACTION_ARTIFACT_T4_DUNGEON_ROWS]");
    console.table(rows);
    console.log("[FACTION_ARTIFACT_T4_MATCHUP_SUMMARY]");
    console.table(matchupSummary);

    expect(rows).toHaveLength(t4Dungeons.length * artifacts.length);
    expect(rows.filter((row) => row.favorable)).toHaveLength(artifacts.length);
    expect(rows.every((row) => row.bonusPct === 0 || row.bonusPct === 20)).toBe(true);
    expect(matchupSummary.every((row) => row.favorableDungeon !== "missing")).toBe(true);
  });
});
