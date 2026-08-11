import type { GatheringVM } from "./GameBridgeModels";

/** Resolves the authoritative running cycle independently from the tier being browsed. */
export function selectRunningGathering(
  activities: readonly GatheringVM[],
): GatheringVM | undefined {
  const activity = activities.find((candidate) => candidate.activeCycle !== undefined)
    ?? activities.find((candidate) => candidate.status === "gathering");
  if (activity?.activeCycle === undefined) return activity;

  const cycle = activity.activeCycle;
  return {
    ...activity,
    status: "gathering",
    resourceName: cycle.resourceName,
    resourceTier: cycle.resourceTier,
    progress: cycle.progress,
    durationSeconds: cycle.durationSeconds,
    activeMiniGame: {
      cycleId: cycle.cycleId,
      strikesUsed: cycle.strikesUsed,
    },
  };
}
