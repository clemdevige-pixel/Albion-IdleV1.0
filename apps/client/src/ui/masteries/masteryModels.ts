import type { GameBridgeState, MasteryVM, WorkerVM } from "../../game/GameBridge";
import { masteryProgressPercent } from "../shared/masteryProgress";

export type MasteryCategoryId = "combat" | "gathering";

export interface MasteryProgressModel {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly currentXp: number;
  readonly xpToNextLevel: number;
  readonly progressPercent: number;
  readonly isUnlocked: boolean;
  readonly bonuses: readonly string[];
  readonly subtitle?: string;
}

export interface MasteryFamilyModel extends MasteryProgressModel {
  readonly icon: string;
  readonly specializations: readonly MasteryProgressModel[];
}

export interface MasteriesModel {
  readonly totalFame: number;
  readonly overflowPool: number;
  readonly categories: Readonly<Record<MasteryCategoryId, readonly MasteryFamilyModel[]>>;
}

export interface MasteriesSource {
  readonly progression: GameBridgeState["progression"];
  readonly workers: GameBridgeState["workers"];
}

interface CombatFamilyDefinition {
  readonly familyId: string;
  readonly specializationIds: readonly string[];
  readonly icon: string;
}

interface GatheringFamilyDefinition {
  readonly masteryId: string;
  readonly profession: WorkerVM["profession"];
  readonly icon: string;
}

const COMBAT_FAMILIES: readonly CombatFamilyDefinition[] = [
  { familyId: "mastery_sword", specializationIds: ["mastery_broadsword"], icon: "⚔" },
  { familyId: "mastery_bow", specializationIds: ["mastery_longbow", "mastery_badon"], icon: "🏹" },
  { familyId: "mastery_fire_staff", specializationIds: ["mastery_t4_fire_staff"], icon: "🔥" },
  { familyId: "mastery_gloves", specializationIds: ["mastery_spiked_gauntlets"], icon: "🥊" },
] as const;

const GATHERING_FAMILIES: readonly GatheringFamilyDefinition[] = [
  { masteryId: "mastery_gathering_wood", profession: "woodcutter", icon: "🌲" },
  { masteryId: "mastery_gathering_ore", profession: "miner", icon: "⛏" },
  { masteryId: "mastery_gathering_hide", profession: "skinner", icon: "🦌" },
  { masteryId: "mastery_gathering_fiber", profession: "fiber_harvester", icon: "🌿" },
] as const;

export function selectMasteriesSource(state: GameBridgeState): MasteriesSource {
  return { progression: state.progression, workers: state.workers };
}

function combatProgress(mastery: MasteryVM, family: boolean): MasteryProgressModel {
  const perLevel = family ? 0.5 : 1;
  return {
    id: mastery.id,
    name: mastery.displayName,
    level: mastery.level,
    currentXp: mastery.currentXp,
    xpToNextLevel: mastery.xpToNextLevel,
    progressPercent: masteryProgressPercent(mastery),
    isUnlocked: mastery.isUnlocked,
    bonuses: [`+${String(mastery.level * perLevel)} IP`, `+${String(perLevel)} IP par niveau`],
    subtitle: family ? "Bonus pour toute la famille" : "Bonus pour cette arme",
  };
}

function workerProgress(worker: WorkerVM): MasteryProgressModel {
  const percent = worker.masteryXpToNext <= 0
    ? 100
    : Math.max(0, Math.min(100, (worker.masteryXp / worker.masteryXpToNext) * 100));
  return {
    id: worker.id,
    name: worker.displayName,
    level: worker.mastery,
    currentXp: worker.masteryXp,
    xpToNextLevel: worker.masteryXpToNext,
    progressPercent: percent,
    isUnlocked: true,
    bonuses: [
      `${String(worker.durationSeconds)} s par cycle`,
      `${String(worker.yieldPerCycle)} ressource par cycle`,
    ],
    subtitle: `${worker.professionName} · T${String(worker.productionTier)}`,
  };
}

export function buildMasteriesModel(source: MasteriesSource): MasteriesModel {
  const masteryById = new Map(source.progression.masteries.map((mastery) => [mastery.id, mastery]));

  const combat = COMBAT_FAMILIES.flatMap((definition): readonly MasteryFamilyModel[] => {
    const family = masteryById.get(definition.familyId);
    if (family === undefined) return [];
    const specializations = definition.specializationIds.flatMap((id): readonly MasteryProgressModel[] => {
      const mastery = masteryById.get(id);
      return mastery === undefined ? [] : [combatProgress(mastery, false)];
    });
    return [{ ...combatProgress(family, true), icon: definition.icon, specializations }];
  });

  const gathering = GATHERING_FAMILIES.flatMap((definition): readonly MasteryFamilyModel[] => {
    const family = masteryById.get(definition.masteryId);
    if (family === undefined) return [];
    const speedBonus = Math.min(50, family.level * 0.5);
    const specializations = source.workers.workers
      .filter((worker) => worker.profession === definition.profession)
      .map(workerProgress);
    return [{
      id: family.id,
      name: family.displayName,
      level: family.level,
      currentXp: family.currentXp,
      xpToNextLevel: family.xpToNextLevel,
      progressPercent: masteryProgressPercent(family),
      isUnlocked: family.isUnlocked,
      bonuses: [`+${String(speedBonus)}% vitesse de récolte`, "1 ressource par cycle"],
      subtitle: "Maîtrise du héros",
      icon: definition.icon,
      specializations,
    }];
  });

  return {
    totalFame: source.progression.totalFame,
    overflowPool: source.progression.overflowPool,
    categories: { combat, gathering },
  };
}
