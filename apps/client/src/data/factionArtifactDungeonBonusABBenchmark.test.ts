import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import {
  resolveArtifactDungeonDamageBonusPercent,
  resolveWeaponArtifactFaction,
} from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

type Family = "sword" | "bow" | "fire_staff" | "gloves" | "dagger";

type ArtifactWeaponSpec = {
  readonly family: Family;
  readonly label: string;
  readonly itemId: string;
};

const ARTIFACT_WEAPONS: readonly ArtifactWeaponSpec[] = [
  { family: "sword", label: "Clarent Blade", itemId: "item_weapon_sword_clarent_t4" },
  { family: "sword", label: "Carving Sword", itemId: "item_weapon_sword_carving_t4" },
  { family: "sword", label: "Galatine Pair", itemId: "item_weapon_sword_galatine_t4" },
  { family: "sword", label: "Claymore", itemId: "item_weapon_sword_claymore_t4" },
  { family: "bow", label: "Bow of Badon", itemId: "item_weapon_bow_t4_badon" },
  { family: "bow", label: "Wailing Bow", itemId: "item_weapon_bow_wailing_t4" },
  { family: "bow", label: "Whispering Bow", itemId: "item_weapon_bow_whispering_t4" },
  { family: "bow", label: "Warbow", itemId: "item_weapon_bow_warbow_t4" },
  { family: "fire_staff", label: "Wildfire Staff", itemId: "item_weapon_staff_wildfire_t4" },
  { family: "fire_staff", label: "Blazing Staff", itemId: "item_weapon_staff_blazing_t4" },
  { family: "fire_staff", label: "Brimstone Staff", itemId: "item_weapon_staff_brimstone_t4" },
  { family: "fire_staff", label: "Great Fire Staff", itemId: "item_weapon_staff_great_fire_t4" },
  { family: "gloves", label: "Ursine Maulers", itemId: "item_weapon_gloves_ursine_t4" },
  { family: "gloves", label: "Ravenstrike Cestus", itemId: "item_weapon_gloves_ravenstrike_t4" },
  { family: "gloves", label: "Hellfire Hands", itemId: "item_weapon_gloves_hellfire_t4" },
  { family: "gloves", label: "Battle Bracers", itemId: "item_weapon_gloves_battle_bracers_t4" },
  { family: "dagger", label: "Bloodletter", itemId: "item_weapon_dagger_bloodletter_t4" },
  { family: "dagger", label: "Demonfang", itemId: "item_weapon_dagger_demonfang_t4" },
  { family: "dagger", label: "Deathgivers", itemId: "item_weapon_dagger_deathgivers_t4" },
  { family: "dagger", label: "Claws", itemId: "item_weapon_dagger_claws_t4" },
];

const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

function equipmentFor(weaponItemId: string, dungeonFaction: string): readonly string[] {
  const items: string[] = [...T4_ARMOR, `item_cape_t4_${dungeonFaction.toLowerCase()}`];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

const round1 = (value: number): number => Number(value.toFixed(1));
const round2 = (value: number): number => Number(value.toFixed(2));

describe("T4 artifact dungeon faction bonus A/B benchmark", () => {
  it("isolates the canonical +20% favorable matchup from dungeon difficulty", () => {
    const t4Dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === 4);
    const rows = ARTIFACT_WEAPONS.map((weapon) => {
      const artifactFaction = resolveWeaponArtifactFaction(weapon.itemId);
      const favorableDungeon = t4Dungeons.find(
        (dungeon) => resolveArtifactDungeonDamageBonusPercent(weapon.itemId, dungeon.faction) === 20,
      );

      expect(artifactFaction).toBeDefined();
      expect(favorableDungeon).toBeDefined();

      const dungeon = favorableDungeon!;
      const equipmentItemIds = equipmentFor(weapon.itemId, dungeon.faction);
      const common = {
        weaponItemId: weapon.itemId,
        equipmentItemIds,
        zoneDefId: WORLD_ZONE_IDS.mountain,
        segmentIndex: 9,
        dungeonDefinitionId: dungeon.id,
        enchantment: 3,
        masteryLevel: 30,
        // Potions are intentionally disabled here. Their cooldown/threshold timing
        // can change when a +20% damage run shortens combat, which would mix
        // survivability cadence into what must be a strict damage-bonus A/B probe.
        useHealthPotions: false,
      } as const;

      const withoutBonus = runCombatRuntimeBenchmark({
        ...common,
        label: `artifact_dungeon_ab_off_${weapon.label}_${dungeon.id}`,
        heroDamageMultiplier: 1,
      });
      const withBonus = runCombatRuntimeBenchmark({
        ...common,
        label: `artifact_dungeon_ab_on_${weapon.label}_${dungeon.id}`,
        heroDamageMultiplier: 1.2,
      });

      return {
        family: weapon.family,
        weapon: weapon.label,
        artifactFaction,
        dungeon: dungeon.id,
        enemyFaction: dungeon.faction,
        offClear: withoutBonus.clear,
        onClear: withBonus.clear,
        offProgressPct: round1(withoutBonus.bossProgressPercent),
        onProgressPct: round1(withBonus.bossProgressPercent),
        progressDeltaPct: round1(withBonus.bossProgressPercent - withoutBonus.bossProgressPercent),
        offDps: round1(withoutBonus.observedDps),
        onDps: round1(withBonus.observedDps),
        dpsRatio: withoutBonus.observedDps > 0 ? round2(withBonus.observedDps / withoutBonus.observedDps) : null,
        offSeconds: round1(withoutBonus.seconds),
        onSeconds: round1(withBonus.seconds),
        offHpPct: round1(withoutBonus.hpPercent),
        onHpPct: round1(withBonus.hpPercent),
      };
    });

    const byDungeon = t4Dungeons.map((dungeon) => {
      const dungeonRows = rows.filter((row) => row.dungeon === dungeon.id);
      return {
        dungeon: dungeon.id,
        faction: dungeon.faction,
        weapons: dungeonRows.length,
        offClears: dungeonRows.filter((row) => row.offClear).length,
        onClears: dungeonRows.filter((row) => row.onClear).length,
        avgOffProgressPct: round1(
          dungeonRows.reduce((sum, row) => sum + row.offProgressPct, 0) / dungeonRows.length,
        ),
        avgOnProgressPct: round1(
          dungeonRows.reduce((sum, row) => sum + row.onProgressPct, 0) / dungeonRows.length,
        ),
        avgProgressDeltaPct: round1(
          dungeonRows.reduce((sum, row) => sum + row.progressDeltaPct, 0) / dungeonRows.length,
        ),
        avgDpsRatio: round2(
          dungeonRows.reduce((sum, row) => sum + (row.dpsRatio ?? 0), 0) / dungeonRows.length,
        ),
      };
    });

    console.log("[FACTION_ARTIFACT_T4_DUNGEON_BONUS_AB_ROWS]");
    console.table(rows);
    console.log("[FACTION_ARTIFACT_T4_DUNGEON_BONUS_AB_BY_DUNGEON]");
    console.table(byDungeon);

    expect(rows).toHaveLength(ARTIFACT_WEAPONS.length);
    expect(rows.every((row) => row.dpsRatio !== null && row.dpsRatio >= 1)).toBe(true);
    expect(rows.every((row) => row.onProgressPct >= row.offProgressPct || row.onClear)).toBe(true);
    expect(byDungeon.every((row) => row.weapons === 5)).toBe(true);
  });
});
