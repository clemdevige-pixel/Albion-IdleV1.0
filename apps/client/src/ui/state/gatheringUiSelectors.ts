import type { GameBridgeState, GatheringVM } from "../../game/GameBridge";
import { selectRunningGathering } from "../../game/bridge/GatheringBridgeSelectors";

/** Returns the single gathering activity currently owned by the hero. */
export function selectActiveGathering(
  state: GameBridgeState,
): GatheringVM | undefined {
  const activities = [
    state.gathering,
    state.oreGathering,
    state.hideGathering,
    state.fiberGathering,
  ];
  return selectRunningGathering(activities);
}
