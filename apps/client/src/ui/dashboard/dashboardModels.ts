import type {
  GameBridgeState,
  GatheringVM,
  TransactionEntryType,
} from "../../game/GameBridge";
import { getSegmentRecommendedItemPower } from "../../data/itemPower";
import { calculateAverageEquippedItemPower } from "../state/equipmentUiSelectors";
import { selectActiveGathering } from "../state/gatheringUiSelectors";

export interface DashboardPlayerModel {
  readonly itemPower: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly physicalDamage: number;
  readonly magicalDamage: number;
  readonly armor: number;
  readonly magicResistance: number;
}

export type DashboardSegmentState = "complete" | "current" | "available" | "locked";

export interface DashboardSegmentModel {
  readonly index: number;
  readonly state: DashboardSegmentState;
  readonly isZoneBoss: boolean;
}

export interface DashboardZoneOptionModel {
  readonly zoneIndex: number;
  readonly biomeName: string;
  readonly zoneName: string;
  readonly isUnlocked: boolean;
  readonly isActive: boolean;
  readonly segmentIndex: number;
  readonly unlockedSegmentCount: number;
  readonly segments: readonly DashboardSegmentModel[];
  readonly recommendedItemPower: number;
}

export interface DashboardZoneModel {
  readonly zoneIndex: number;
  readonly zoneCount: number;
  readonly farmMode: boolean;
  readonly biomeName: string;
  readonly zoneName: string;
  readonly segmentIndex: number;
  readonly segmentCount: number;
  readonly encounterIndex: number;
  readonly encounterCount: number;
  readonly progress: number;
  readonly recommendedItemPower: number;
  readonly segments: readonly DashboardSegmentModel[];
  readonly bossTitle: string;
  readonly bossDetail: string;
  readonly zones: readonly DashboardZoneOptionModel[];
}

export type DashboardProductionKind = "gathering" | "refining" | "worker";

export interface DashboardProductionTask {
  readonly id: string;
  readonly kind: DashboardProductionKind;
  readonly label: string;
  readonly detail: string;
  readonly progress: number;
}

export interface DashboardGatheringInteraction {
  readonly resourceFamily: string;
  readonly cycleId: string;
  readonly strikesUsed: number;
  readonly durationSeconds: number;
}

export interface DashboardProductionModel {
  readonly tasks: readonly DashboardProductionTask[];
  readonly hiddenTaskCount: number;
  readonly gatheringInteraction: DashboardGatheringInteraction | undefined;
}

export interface DashboardActivityEntry {
  readonly id: string;
  readonly type: TransactionEntryType;
  readonly description: string;
  readonly amount: number;
  readonly timestamp: number;
}

export interface DashboardSessionModel {
  readonly elapsedSeconds: number;
  readonly enemiesKilled: number;
  readonly silverPerHour: number;
  readonly famePerHour: number;
}

function getComputedStat(state: GameBridgeState, id: string): number {
  return state.stats.stats.find((entry) => entry.id === id)?.computed ?? 0;
}

export function selectDashboardPlayer(state: GameBridgeState): DashboardPlayerModel {
  return {
    itemPower: calculateAverageEquippedItemPower(
      state.equipment,
      state.progression.masteries,
    ),
    health: state.playerHealth,
    maxHealth: state.playerMaxHealth,
    physicalDamage: getComputedStat(state, "stat_physical_damage"),
    magicalDamage: getComputedStat(state, "stat_magical_damage"),
    armor: getComputedStat(state, "stat_armor"),
    magicResistance: getComputedStat(state, "stat_magic_resistance"),
  };
}

export function selectDashboardZone(state: GameBridgeState): DashboardZoneModel {
  const { world } = state;
  const completedSegments = new Set(world.completedSegments);
  const segments = Array.from({ length: world.segmentCount }, (_, offset) => {
    const index = offset + 1;
    let segmentState: DashboardSegmentState = "locked";
    if (index === world.segmentIndex) segmentState = "current";
    else if (completedSegments.has(index)) segmentState = "complete";
    else if (index <= world.unlockedSegmentCount) segmentState = "available";
    return {
      index,
      state: segmentState,
      isZoneBoss: index === world.segmentCount,
    };
  });

  const isBossEncounter = world.encounterType === "boss";
  const isEliteEncounter = world.encounterType === "elite";
  const encountersUntilBoss = Math.max(0, world.encounterCount - world.encounterIndex);
  const bossTitle = world.segmentIndex === world.segmentCount
    ? "Boss de zone"
    : `Élite du segment ${String(world.segmentIndex)}`;
  const bossDetail = isBossEncounter || isEliteEncounter
    ? (state.enemyName !== "" ? state.enemyName : "Affrontement en cours")
    : encountersUntilBoss === 0
      ? "Prochain affrontement"
      : `Dans ${String(encountersUntilBoss)} rencontre${encountersUntilBoss > 1 ? "s" : ""}`;

  const zones = world.zones.map((zone): DashboardZoneOptionModel => {
    const completed = new Set(zone.completedSegments);
    const zoneSegments = Array.from({ length: world.segmentCount }, (_, offset) => {
      const index = offset + 1;
      let state: DashboardSegmentState = "locked";
      if (zone.isActive && index === world.segmentIndex) state = "current";
      else if (completed.has(index)) state = "complete";
      else if (zone.isUnlocked && index <= zone.unlockedSegmentCount) state = "available";
      return { index, state, isZoneBoss: index === world.segmentCount };
    });
    const displayedSegment = zone.isActive ? world.segmentIndex : zone.segmentIndex;
    return {
      zoneIndex: zone.zoneIndex,
      biomeName: zone.biomeName,
      zoneName: zone.zoneName,
      isUnlocked: zone.isUnlocked,
      isActive: zone.isActive,
      segmentIndex: displayedSegment,
      unlockedSegmentCount: zone.unlockedSegmentCount,
      segments: zoneSegments,
      recommendedItemPower: getSegmentRecommendedItemPower(zone.zoneIndex, displayedSegment),
    };
  });

  return {
    zoneIndex: world.zoneIndex,
    zoneCount: world.zoneCount,
    farmMode: world.farmMode,
    biomeName: world.biomeName,
    zoneName: world.zoneName,
    segmentIndex: world.segmentIndex,
    segmentCount: world.segmentCount,
    encounterIndex: world.encounterIndex,
    encounterCount: world.encounterCount,
    progress: world.zoneProgress,
    recommendedItemPower: getSegmentRecommendedItemPower(
      world.zoneIndex,
      world.segmentIndex,
    ),
    segments,
    bossTitle,
    bossDetail,
    zones,
  };
}

function gatheringTask(gathering: GatheringVM): DashboardProductionTask {
  return {
    id: `gathering-${gathering.resourceFamily}`,
    kind: "gathering",
    label: gathering.resourceName,
    detail: `Récolte T${String(gathering.resourceTier)} · ${String(gathering.durationSeconds)} s`,
    progress: gathering.progress,
  };
}

export function selectDashboardProduction(
  state: GameBridgeState,
): DashboardProductionModel {
  const tasks: DashboardProductionTask[] = [];
  const activeGathering = selectActiveGathering(state);
  if (activeGathering !== undefined) tasks.push(gatheringTask(activeGathering));

  const refiningActivities = [
    ["wood", state.refining],
    ["metal", state.metalRefining],
    ["leather", state.leatherRefining],
    ["cloth", state.clothRefining],
  ] as const;
  for (const [id, refining] of refiningActivities) {
    if (refining.status !== "refining") continue;
    tasks.push({
      id: `refining-${id}`,
      kind: "refining",
      label: refining.recipeName,
      detail: `Raffinage · ${String(refining.durationSeconds)} s`,
      progress: refining.progress,
    });
  }

  for (const worker of state.workers.workers) {
    if (worker.state !== "working") continue;
    tasks.push({
      id: `worker-${worker.id}`,
      kind: "worker",
      label: worker.displayName,
      detail: `${worker.resourceName} · T${String(worker.productionTier)}`,
      progress: worker.progress,
    });
  }

  const visibleTasks = tasks.slice(0, 3);
  const miniGame = activeGathering?.activeMiniGame;
  return {
    tasks: visibleTasks,
    hiddenTaskCount: Math.max(0, tasks.length - visibleTasks.length),
    gatheringInteraction: activeGathering !== undefined && miniGame !== undefined
      ? {
          resourceFamily: activeGathering.resourceFamily,
          cycleId: miniGame.cycleId,
          strikesUsed: miniGame.strikesUsed,
          durationSeconds: activeGathering.durationSeconds,
        }
      : undefined,
  };
}

export function selectDashboardActivity(
  state: GameBridgeState,
): readonly DashboardActivityEntry[] {
  return state.transactionHistory.slice(0, 4).map((entry) => ({ ...entry }));
}

export function selectDashboardSession(state: GameBridgeState): DashboardSessionModel {
  return {
    elapsedSeconds: state.zoneElapsed,
    enemiesKilled: state.enemiesKilled,
    silverPerHour: state.segmentSilverPerHour,
    famePerHour: state.segmentFamePerHour,
  };
}
