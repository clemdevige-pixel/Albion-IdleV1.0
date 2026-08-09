import { useCallback } from "react";
import { useGameServices } from "../../state/GameContext";
import { useGameUiSelector } from "../state/useGameUiSelector";
import {
  selectDashboardActivity,
  selectDashboardPlayer,
  selectDashboardProduction,
  selectDashboardSession,
  selectDashboardZone,
  type DashboardActivityEntry,
  type DashboardPlayerModel,
  type DashboardProductionModel,
  type DashboardProductionTask,
  type DashboardSegmentModel,
  type DashboardSessionModel,
  type DashboardZoneModel,
  type DashboardZoneOptionModel,
} from "./dashboardModels";

function sameSegments(
  previous: readonly DashboardSegmentModel[],
  next: readonly DashboardSegmentModel[],
): boolean {
  return previous.length === next.length && previous.every((segment, index) => {
    const candidate = next[index];
    return candidate !== undefined
      && segment.index === candidate.index
      && segment.state === candidate.state
      && segment.isZoneBoss === candidate.isZoneBoss;
  });
}

function sameZones(
  previous: readonly DashboardZoneOptionModel[],
  next: readonly DashboardZoneOptionModel[],
): boolean {
  return previous.length === next.length && previous.every((zone, index) => {
    const candidate = next[index];
    return candidate !== undefined
      && zone.zoneIndex === candidate.zoneIndex
      && zone.biomeName === candidate.biomeName
      && zone.zoneName === candidate.zoneName
      && zone.isUnlocked === candidate.isUnlocked
      && zone.isActive === candidate.isActive
      && zone.segmentIndex === candidate.segmentIndex
      && zone.unlockedSegmentCount === candidate.unlockedSegmentCount
      && zone.recommendedItemPower === candidate.recommendedItemPower
      && sameSegments(zone.segments, candidate.segments);
  });
}

function sameTasks(
  previous: readonly DashboardProductionTask[],
  next: readonly DashboardProductionTask[],
): boolean {
  return previous.length === next.length && previous.every((task, index) => {
    const candidate = next[index];
    return candidate !== undefined
      && task.id === candidate.id
      && task.kind === candidate.kind
      && task.label === candidate.label
      && task.detail === candidate.detail
      && task.progress === candidate.progress;
  });
}

function sameActivity(
  previous: readonly DashboardActivityEntry[],
  next: readonly DashboardActivityEntry[],
): boolean {
  return previous.length === next.length && previous.every((entry, index) => {
    const candidate = next[index];
    return candidate !== undefined
      && entry.id === candidate.id
      && entry.type === candidate.type
      && entry.description === candidate.description
      && entry.amount === candidate.amount
      && entry.timestamp === candidate.timestamp;
  });
}

export function useDashboardPlayer(): DashboardPlayerModel {
  return useGameUiSelector(selectDashboardPlayer, (previous, next) =>
    previous.itemPower === next.itemPower
    && previous.health === next.health
    && previous.maxHealth === next.maxHealth
    && previous.physicalDamage === next.physicalDamage
    && previous.magicalDamage === next.magicalDamage
    && previous.armor === next.armor
    && previous.magicResistance === next.magicResistance,
  );
}

export function useDashboardZone(): DashboardZoneModel {
  return useGameUiSelector(selectDashboardZone, (previous, next) =>
    previous.zoneIndex === next.zoneIndex
    && previous.zoneCount === next.zoneCount
    && previous.farmMode === next.farmMode
    && previous.biomeName === next.biomeName
    && previous.zoneName === next.zoneName
    && previous.segmentIndex === next.segmentIndex
    && previous.segmentCount === next.segmentCount
    && previous.encounterIndex === next.encounterIndex
    && previous.encounterCount === next.encounterCount
    && previous.progress === next.progress
    && previous.recommendedItemPower === next.recommendedItemPower
    && previous.bossTitle === next.bossTitle
    && previous.bossDetail === next.bossDetail
    && sameSegments(previous.segments, next.segments)
    && sameZones(previous.zones, next.zones),
  );
}

export function useDashboardZoneActions(): {
  readonly selectZoneSegment: (zoneIndex: number, segmentIndex: number) => boolean;
  readonly setFarmMode: (enabled: boolean) => void;
} {
  const { selectZone, setSegmentFarmMode } = useGameServices();
  const selectZoneSegment = useCallback((zoneIndex: number, segmentIndex: number): boolean => {
    return selectZone(zoneIndex, segmentIndex);
  }, [selectZone]);
  const setFarmMode = useCallback((enabled: boolean): void => {
    setSegmentFarmMode(enabled);
  }, [setSegmentFarmMode]);
  return { selectZoneSegment, setFarmMode };
}

export function useDashboardProduction(): DashboardProductionModel {
  return useGameUiSelector(selectDashboardProduction, (previous, next) => {
    const previousInteraction = previous.gatheringInteraction;
    const nextInteraction = next.gatheringInteraction;
    const sameInteraction = previousInteraction === undefined && nextInteraction === undefined
      || previousInteraction !== undefined && nextInteraction !== undefined
        && previousInteraction.resourceFamily === nextInteraction.resourceFamily
        && previousInteraction.cycleId === nextInteraction.cycleId
        && previousInteraction.strikesUsed === nextInteraction.strikesUsed
        && previousInteraction.durationSeconds === nextInteraction.durationSeconds;
    return previous.hiddenTaskCount === next.hiddenTaskCount
      && sameInteraction
      && sameTasks(previous.tasks, next.tasks);
  });
}

export function useDashboardActivity(): readonly DashboardActivityEntry[] {
  return useGameUiSelector(selectDashboardActivity, sameActivity);
}

export function useDashboardSession(): DashboardSessionModel {
  return useGameUiSelector(selectDashboardSession, (previous, next) =>
    previous.elapsedSeconds === next.elapsedSeconds
    && previous.enemiesKilled === next.enemiesKilled
    && previous.silverPerHour === next.silverPerHour
    && previous.famePerHour === next.famePerHour,
  );
}

export function useDashboardGatheringActions(): {
  readonly strike: (resourceFamily: string, quality: "correct" | "perfect" | "miss") => boolean;
  readonly returnToCombat: () => void;
} {
  const { performGatheringStrike, returnToCombat } = useGameServices();
  const strike = useCallback((
    resourceFamily: string,
    quality: "correct" | "perfect" | "miss",
  ): boolean => {
    return performGatheringStrike(resourceFamily, quality);
  }, [performGatheringStrike]);
  const resume = useCallback(() => {
    returnToCombat();
  }, [returnToCombat]);
  return { strike, returnToCombat: resume };
}
