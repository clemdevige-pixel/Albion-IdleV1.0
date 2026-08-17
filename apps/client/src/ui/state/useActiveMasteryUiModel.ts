import type { GameBridgeState, GatheringVM, MasteryVM } from "../../game/GameBridge";
import {
  getProductionFamilyByGameplayFamily,
  isSupportedProductionFamily,
} from "../../data/productionFamilyCatalog";
import {
  resolveWeaponFamilyId,
  resolveWeaponMastery,
} from "../../data/weaponContentCatalog";
import { resolveWeaponFamilyCraftPresentation } from "../../data/equipmentPresentation";
import { masteryProgressPercent } from "../shared/masteryProgress";
import { shallowEqual, useGameUiSelector } from "./useGameUiSelector";

export type ActiveMasteryCategory = "combat" | "gathering";

export interface ActiveMasteryUiModel {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly currentXp: number;
  readonly xpToNextLevel: number;
  readonly progressPercent: number;
  readonly category: ActiveMasteryCategory;
  readonly icon: string;
  readonly iconAsset?: string;
}

function toUiModel(
  mastery: MasteryVM,
  category: ActiveMasteryCategory,
  icon: string,
  iconAsset?: string,
): ActiveMasteryUiModel {
  return {
    id: mastery.id,
    name: mastery.displayName,
    level: mastery.level,
    currentXp: mastery.currentXp,
    xpToNextLevel: mastery.xpToNextLevel,
    progressPercent: masteryProgressPercent(mastery),
    category,
    icon,
    ...(iconAsset === undefined ? {} : { iconAsset }),
  };
}

function findActiveGathering(state: GameBridgeState): GatheringVM | undefined {
  return [
    state.gathering,
    state.oreGathering,
    state.hideGathering,
    state.fiberGathering,
  ].find((gathering) => gathering.status === "gathering");
}

export function selectActiveMasteryUiModel(
  state: GameBridgeState,
): ActiveMasteryUiModel | null {
  const masteryById = new Map(
    state.progression.masteries.map((mastery) => [mastery.id, mastery]),
  );

  const activeGathering = findActiveGathering(state);
  if (
    activeGathering !== undefined
    && isSupportedProductionFamily(activeGathering.resourceFamily)
  ) {
    const definition = getProductionFamilyByGameplayFamily(activeGathering.resourceFamily);
    const mastery = masteryById.get(definition.masteryId);
    if (mastery !== undefined) {
      return toUiModel(
        mastery,
        "gathering",
        definition.masterySymbol,
        definition.professionIcon,
      );
    }
  }

  const weaponItemId = state.equipment.slots.find(
    (slot) => slot.slot === "weapon",
  )?.itemId;
  if (weaponItemId === undefined) return null;

  const masteryRoute = resolveWeaponMastery(weaponItemId);
  const familyId = resolveWeaponFamilyId(weaponItemId);
  if (masteryRoute === undefined || familyId === undefined) return null;

  const mastery = masteryById.get(masteryRoute.familyId);
  if (mastery === undefined) return null;

  const presentation = resolveWeaponFamilyCraftPresentation(familyId);
  return toUiModel(mastery, "combat", presentation?.symbol ?? "◆");
}

export function useActiveMasteryUiModel(): ActiveMasteryUiModel | null {
  return useGameUiSelector(selectActiveMasteryUiModel, shallowEqual);
}
