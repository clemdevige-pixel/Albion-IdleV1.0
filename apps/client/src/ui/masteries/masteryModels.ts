import type { GameBridgeState, MasteryVM, WorkerVM } from "../../game/GameBridge";
import { getWeaponMasteryFamilyDefinitions } from "../../data/weaponContentCatalog";
import { resolveWeaponFamilyCraftPresentation } from "../../data/equipmentPresentation";
import {
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
} from "../../data/productionFamilyCatalog";
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
  readonly iconAsset?: string;
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

  const combat = getWeaponMasteryFamilyDefinitions().flatMap((definition): readonly MasteryFamilyModel[] => {
    const family = masteryById.get(definition.masteryId);
    if (family === undefined) return [];
    const specializations = definition.specializationMasteryIds.flatMap((id): readonly MasteryProgressModel[] => {
      const mastery = masteryById.get(id);
      return mastery === undefined ? [] : [combatProgress(mastery, false)];
    });
    const presentation = resolveWeaponFamilyCraftPresentation(definition.familyId);
    return [{ ...combatProgress(family, true), icon: presentation?.symbol ?? "◆", specializations }];
  });

  const gathering = PRODUCTION_FAMILY_IDS.flatMap((familyId): readonly MasteryFamilyModel[] => {
    const definition = getProductionFamilyDefinition(familyId);
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
      icon: definition.masterySymbol,
      iconAsset: definition.professionIcon,
      specializations,
    }];
  });

  return {
    totalFame: source.progression.totalFame,
    overflowPool: source.progression.overflowPool,
    categories: { combat, gathering },
  };
}
