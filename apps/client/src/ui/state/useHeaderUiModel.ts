import type { GameBridgeState } from "../../game/GameBridge";
import { calculateAverageEquippedItemPower } from "./equipmentUiSelectors";
import { shallowEqual, useGameUiSelector } from "./useGameUiSelector";

export interface HeaderUiModel {
  readonly silver: number;
  readonly incomeRate: number;
  readonly totalFame: number;
  readonly itemPower: number;
  readonly weaponItemId: string | null;
  readonly biomeName: string;
  readonly zoneName: string;
  readonly segmentIndex: number;
  readonly segmentCount: number;
  readonly zoneProgress: number;
}

function selectHeaderUiModel(state: GameBridgeState): HeaderUiModel {
  return {
    silver: state.wallet.silver,
    incomeRate: state.wallet.incomeRate,
    totalFame: state.progression.totalFame,
    itemPower: calculateAverageEquippedItemPower(
      state.equipment,
      state.progression.masteries,
    ),
    weaponItemId: state.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId ?? null,
    biomeName: state.world.biomeName,
    zoneName: state.world.zoneName,
    segmentIndex: state.world.segmentIndex,
    segmentCount: state.world.segmentCount,
    zoneProgress: state.world.zoneProgress,
  };
}

export function useHeaderUiModel(): HeaderUiModel {
  return useGameUiSelector(selectHeaderUiModel, shallowEqual);
}
