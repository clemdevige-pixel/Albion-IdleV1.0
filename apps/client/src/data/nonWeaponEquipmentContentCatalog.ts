import {
  PROGRESSION_EQUIPMENT_CONTENT,
  type AuthoredEquipmentCraftMaterial,
  type AuthoredEquipmentCraftMaterialKind,
} from "@game/data";
import type { EquipmentInfoLike } from "@game/gameplay";

export type EquipmentCraftMaterialKind = AuthoredEquipmentCraftMaterialKind;
export type EquipmentCraftMaterial = AuthoredEquipmentCraftMaterial;

export { PROGRESSION_EQUIPMENT_CONTENT };

export type ProgressionEquipmentFamily = (typeof PROGRESSION_EQUIPMENT_CONTENT)[number];
export type ProgressionEquipmentItem = ProgressionEquipmentFamily["items"][number];

interface ProgressionEquipmentItemRoute {
  readonly family: ProgressionEquipmentFamily;
  readonly item: ProgressionEquipmentItem;
}

const ROUTE_BY_ITEM_ID = new Map<string, ProgressionEquipmentItemRoute>(
  PROGRESSION_EQUIPMENT_CONTENT.flatMap((family) =>
    family.items.map((item) => [item.itemId, { family, item }] as const),
  ),
);

export const PROGRESSION_NON_WEAPON_ITEM_DEFINITIONS: Readonly<Record<string, EquipmentInfoLike>> = Object.fromEntries(
  PROGRESSION_EQUIPMENT_CONTENT.flatMap((family) =>
    family.items.map((item) => [
      item.itemId,
      {
        itemId: item.itemId,
        slot: family.slot,
        handling: family.handling,
        stats: item.stats,
      },
    ] as const),
  ),
);

export function resolveProgressionEquipmentRoute(itemId: string): ProgressionEquipmentItemRoute | undefined {
  return ROUTE_BY_ITEM_ID.get(itemId);
}

export function resolvePreviousProgressionEquipmentItemId(itemId: string): string | undefined {
  const route = resolveProgressionEquipmentRoute(itemId);
  if (route === undefined) return undefined;
  const previous = route.family.items.find((candidate) => candidate.tier === route.item.tier - 1);
  return previous?.itemId;
}
