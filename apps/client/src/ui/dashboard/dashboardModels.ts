import type {
  GameBridgeState,
  GatheringVM,
  TransactionEntryType,
} from "../../game/GameBridge";
import type { WorldBandId } from "@game/data";
import { getSegmentRecommendedItemPower } from "../../data/itemPower";
import { calculateProjectedSegmentRates } from "../../runtime/projectedRateCalculator";
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
  readonly zoneDefId: string;
  readonly zoneIndex: number;
  readonly worldBandId: WorldBandId;
  readonly zoneIndexWithinBand: number;
  readonly tier: number;
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
  readonly worldBandId: WorldBandId;
  readonly zoneIndexWithinBand: number;
  readonly zoneCount: number;
  readonly farmMode: boolean;
  readonly biomeName: string;
  readonly zoneName: string;
  readonly segmentIndex: number;
  readonly segmentCount: number;
  readonly encounterIndex: number;
  readonly encounterCount: number;
  readonly pendingSegmentIndex: number | undefined;
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

export interface DashboardYieldModel {
  readonly silverPerHour: number;
  readonly famePerHour: number;
  readonly enchantmentShardsPerHour: number;
  readonly keyFragmentsPerHour: number;
}

export function selectDashboardPlayer(state: GameBridgeState): DashboardPlayerModel {
  return {
    itemPower: calculateAverageEquippedItemPower(state),
    health: state.hero.health,
    maxHealth: getComputedStat(state, "stat_health"),
    physicalDamage: getComputedStat(state, "stat_physical_damage"),
    magicalDamage: getComputedStat(state, "stat_magical_damage"),
    armor: getComputedStat(state, "stat_armor"),
    magicResistance: getComputedStat(state, "stat_magic_resistance"),
  };
}

export function selectDashboardZone(state: GameBridgeState): DashboardZoneModel {
  const zone = state.world.zone;
  const segments = zone.segments.map((segment, index) => ({
    index: index + 1,
    state: index + 1 < state.world.segmentIndex
      ? "complete" as const
      : index + 1 === state.world.segmentIndex
        ? "current" as const
        : index + 1 <= state.world.unlockedSegmentCount
          ? "available" as const
          : "locked" as const,
    isZoneBoss: segment.isZoneBoss,
  }));
  const zones = state.world.zones.map((option) => ({
    zoneDefId: option.zoneDefId,
    zoneIndex: option.zoneIndex,
    worldBandId: option.worldBandId,
    zoneIndexWithinBand: option.zoneIndexWithinBand,
    tier: option.tier,
    biomeName: option.biomeName,
    zoneName: option.zoneName,
    isUnlocked: option.isUnlocked,
    isActive: option.isActive,
    segmentIndex: option.segmentIndex,
    unlockedSegmentCount: option.unlockedSegmentCount,
    segments: option.segments.map((segment, index) => ({
      index: index + 1,
      state: index + 1 < option.segmentIndex
        ? "complete" as const
        : index + 1 === option.segmentIndex
          ? "current" as const
          : index + 1 <= option.unlockedSegmentCount
            ? "available" as const
            : "locked" as const,
      isZoneBoss: segment.isZoneBoss,
    })),
    recommendedItemPower: getSegmentRecommendedItemPower(
      option.worldBandId,
      option.zoneIndexWithinBand,
      option.segmentIndex,
    ),
  }));

  return {
    zoneIndex: state.world.zoneIndex,
    worldBandId: state.world.worldBandId,
    zoneIndexWithinBand: state.world.zoneIndexWithinBand,
    zoneCount: state.world.zoneCount,
    farmMode: state.world.farmMode,
    biomeName: zone.biomeName,
    zoneName: zone.zoneName,
    segmentIndex: state.world.segmentIndex,
    segmentCount: zone.segments.length,
    encounterIndex: state.world.encounterIndex,
    encounterCount: state.world.encounterCount,
    pendingSegmentIndex: state.world.pendingSegmentIndex,
    progress: state.world.segmentProgress,
    recommendedItemPower: getSegmentRecommendedItemPower(
      state.world.worldBandId,
      state.world.zoneIndexWithinBand,
      state.world.segmentIndex,
    ),
    segments,
    bossTitle: state.world.bossTitle,
    bossDetail: state.world.bossDetail,
    zones,
  };
}

export function selectDashboardProduction(state: GameBridgeState): DashboardProductionModel {
  const tasks: DashboardProductionTask[] = [];
  const activeGathering: GatheringVM | undefined = selectActiveGathering(state);
  if (activeGathering !== undefined) {
    tasks.push({
      id: `gathering-${activeGathering.resourceFamily}`,
      kind: "gathering",
      label: activeGathering.resourceName,
      detail: `Récolte · T${String(activeGathering.tier)}`,
      progress: activeGathering.progress,
    });
  }

  const refiningActivities = [
    ["wood", state.woodRefining],
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

  const visibleTasks = tasks.slice(0, 4);
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

export function selectDashboardYield(state: GameBridgeState): DashboardYieldModel {
  const equippedWeaponId = state.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId;
  const projected = calculateProjectedSegmentRates({
    physicalDamage: getComputedStat(state, "stat_physical_damage"),
    magicalDamage: getComputedStat(state, "stat_magical_damage"),
    attackSpeed: getComputedStat(state, "stat_attack_speed"),
    equippedWeaponId,
    primaryAbilityAutoCast: state.abilities.primary?.autoCast ?? false,
    currentZoneIndex: state.world.zoneIndexWithinBand,
    currentWorldBandId: state.world.worldBandId,
    currentSegment: state.world.segmentIndex - 1,
  });

  return {
    silverPerHour: state.segmentSilverPerHour,
    famePerHour: state.segmentFamePerHour,
    enchantmentShardsPerHour: projected.enchantmentShardsPerHour,
    keyFragmentsPerHour: projected.keyFragmentsPerHour,
  };
}