import {
  getWorldProgressionTierContract,
  type WorldProgressionEnchantment,
  type WorldProgressionSourceTier,
  type WorldProgressionTier,
  type WorldProgressionZoneRole,
} from "@game/data";
import { resolveEquipmentInfo } from "../../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS_BY_BAND, ZONE_DEFINITIONS } from "../../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

export type Loadout = {
  readonly gearTier: WorldProgressionTier;
  readonly enchantment: WorldProgressionEnchantment;
};

export interface SegmentRun {
  readonly tier: WorldProgressionTier;
  readonly bandStep: number;
  readonly zoneIndex: number;
  readonly role: WorldProgressionZoneRole;
  readonly zone: string;
  readonly weapon: string;
  readonly gear: string;
  readonly mastery: number;
  readonly segment: number;
  readonly clearNoPotion: boolean;
  readonly clearPotion: boolean;
}

export const TARGET_TIERS = [4, 5, 6, 7, 8] as const satisfies readonly WorldProgressionTier[];
export const SOURCE_TIERS = [4, 5, 6, 7] as const satisfies readonly WorldProgressionSourceTier[];
export const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;
export const SEGMENTS_PER_ZONE = 10;
export const FINAL_SEGMENT_INDEX = SEGMENTS_PER_ZONE - 1;

export function weaponItemIds(tier: WorldProgressionTier): readonly string[] {
  return WEAPON_FAMILIES.map(([family, specialization]) =>
    `item_weapon_${family}_t${String(tier)}_${specialization}`,
  );
}

export function armorItemIds(tier: WorldProgressionTier): readonly string[] {
  return [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
}

export function equipmentFor(weaponItemId: string, tier: WorldProgressionTier): readonly string[] {
  const items = [...armorItemIds(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${String(tier)}_reinforced`);
  }
  return items;
}

export function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t\d_/, " ");
}

export function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

export function zoneIdFor(tier: WorldProgressionTier, zoneIndex: number) {
  const { band } = getWorldProgressionTierContract(tier);
  const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
  if (zoneDefId === undefined) {
    throw new Error(`Missing zone ${String(zoneIndex + 1)} for T${String(tier)}`);
  }
  return zoneDefId;
}

export function loadoutLabel(loadout: Loadout): string {
  return `T${String(loadout.gearTier)}.${String(loadout.enchantment)}`;
}

export function runLoadoutAcrossZone(
  tier: WorldProgressionTier,
  zoneIndex: number,
  role: WorldProgressionZoneRole,
  loadout: Loadout,
  masteryLevel: number,
  label: string,
): readonly SegmentRun[] {
  const zoneDefId = zoneIdFor(tier, zoneIndex);
  const rows: SegmentRun[] = [];

  for (const weaponItemId of weaponItemIds(loadout.gearTier)) {
    for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
      const common = {
        weaponItemId,
        zoneDefId,
        segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId, loadout.gearTier),
        masteryLevel,
        enchantment: loadout.enchantment,
      } as const;
      const noPotion = runCombatRuntimeBenchmark({
        label: `${label}_no_potion`,
        ...common,
        useHealthPotions: false,
      });
      const withPotion = runCombatRuntimeBenchmark({
        label: `${label}_potion`,
        ...common,
        useHealthPotions: true,
      });
      rows.push({
        tier,
        bandStep: zoneIndex + 1,
        zoneIndex,
        role,
        zone: zoneName(String(zoneDefId)),
        weapon: shortWeaponName(weaponItemId),
        gear: loadoutLabel(loadout),
        mastery: masteryLevel,
        segment: segmentIndex + 1,
        clearNoPotion: noPotion.clear,
        clearPotion: withPotion.clear,
      });
    }
  }

  return rows;
}

export function lastClearSegment(rows: readonly SegmentRun[], potion: boolean): number {
  const cleared = rows.filter((row) => potion ? row.clearPotion : row.clearNoPotion);
  return cleared.at(-1)?.segment ?? 0;
}

export function firstWallSegment(rows: readonly SegmentRun[], potion: boolean): number | null {
  return rows.find((row) => potion ? !row.clearPotion : !row.clearNoPotion)?.segment ?? null;
}

export function hasWallThenLaterClear(rows: readonly SegmentRun[], potion: boolean): boolean {
  const wall = firstWallSegment(rows, potion);
  if (wall === null) return false;
  return rows.some((row) => row.segment > wall && (potion ? row.clearPotion : row.clearNoPotion));
}

export function fmtSegment(segment: number): string {
  return segment <= 0 ? "-" : `S${String(segment)}`;
}
