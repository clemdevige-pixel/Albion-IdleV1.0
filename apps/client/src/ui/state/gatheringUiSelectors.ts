import type { GameBridgeState, GatheringVM } from "../../game/GameBridge";

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
  return activities.find((activity) => activity.status === "gathering");
}
