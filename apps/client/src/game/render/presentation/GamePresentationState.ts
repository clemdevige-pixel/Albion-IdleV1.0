import type {
  EquipmentSlotVM,
  GameBridge,
  GatheringVM,
} from "../../GameBridge";
import { selectRunningGathering } from "../../bridge/GatheringBridgeSelectors";

export interface WeaponPresentationState {
  readonly visualManifestId: string | undefined;
  readonly combatProfileId: string | undefined;
}

/** Converts gameplay-facing bridge data into renderer-facing selections. */
export function selectActiveGathering(
  bridge: GameBridge,
): GatheringVM | undefined {
  const activities: readonly GatheringVM[] = [
    bridge.gathering,
    bridge.oreGathering,
    bridge.hideGathering,
    bridge.fiberGathering,
  ];
  return selectRunningGathering(activities);
}

export function selectEquippedWeapon(
  bridge: GameBridge | undefined,
): EquipmentSlotVM | undefined {
  return bridge?.equipment.slots.find((slot) => slot.slot === "weapon");
}

export function selectWeaponPresentation(
  bridge: GameBridge | undefined,
): WeaponPresentationState {
  const weapon = selectEquippedWeapon(bridge);
  return {
    visualManifestId: weapon?.visualManifestId,
    combatProfileId: weapon?.combatPresentationProfileId,
  };
}
