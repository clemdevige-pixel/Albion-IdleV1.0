import type { GameBridgeState, MasteryVM, WorkerVM } from "../../game/GameBridge";
import { getWeaponMasteryFamilyDefinitions, type WeaponFamilyId } from "../../data/weaponContentCatalog";
import { resolveWeaponSpecializationIcon } from "../../data/weaponItemVisualCatalog";
import {
  WEAPON_CROSS_SPECIALIZATION_IP_PER_LEVEL,
  WEAPON_FAMILY_IP_PER_LEVEL,
  WEAPON_SPECIALIZATION_IP_PER_LEVEL,
} from "../../data/itemPower";
import {
  GATHERING_CONTENT_TIERS,
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyByProfession,
  getProductionFamilyDefinition,
} from "../../data/productionFamilyCatalog";
import { getRequiredGatheringMasteryForTier } from "../../data/progressionContentCatalog";
import {
  FACTION_MASTERY_IDS,
  getFactionMasteryDisplayName,
  getFactionMasteryYieldBonusPercent,
} from "../../data/factionMasteryContentCatalog";
import { masteryProgressPercent } from "../shared/masteryProgress";

export type MasteryCategoryId = "combat" | "gathering" | "faction";

const COMBAT_MASTERY_ICON_ASSETS: Readonly<Record<WeaponFamilyId, string>> = {
  sword: "/assets/ui/masteries/epee.png",
  bow: "/assets/ui/masteries/arc.png",
  fire_staff: "/assets/ui/masteries/baton_feu.png",
  gloves: "/assets/ui/masteries/gants.png",
  dagger: "/assets/ui/masteries/dagues.png",
};

const ITEM_POWER_FORMATTER = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function formatItemPower(value: number): string {
  return ITEM_POWER_FORMATTER.format(value);
}

function getNextGatheringUnlock(level: number, profession: WorkerVM["profession"]): string {
  const family = getProductionFamilyByProfession(profession);
  if (family === undefined) return "Tous les paliers de ressource débloqués";
  const nextTier = GATHERING_CONTENT_TIERS.find((tier) => getRequiredGatheringMasteryForTier(tier) > level);
  if (nextTier === undefined) return "Tous les paliers de ressource débloqués";
  const resourceName = family.tiers[nextTier]?.resourceName ?? `Ressource T${String(nextTier)}`;
  return `Prochaine ressource : ${resourceName} (T${String(nextTier)}) au niv. ${String(getRequiredGatheringMasteryForTier(nextTier))}`;
}

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
  readonly iconAsset?: string;
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

export function selectMasteriesSource(state: GameBridgeState): MasteriesSource {
  return { progression: state.progression, workers: state.workers };
}

function combatProgress(mastery: MasteryVM, family: boolean): MasteryProgressModel {
  if (family) {
    return {
      id: mastery.id,
      name: mastery.displayName,
      level: mastery.level,
      currentXp: mastery.currentXp,
      xpToNextLevel: mastery.xpToNextLevel,
      progressPercent: masteryProgressPercent(mastery),
      isUnlocked: mastery.isUnlocked,
      bonuses: [
        `+${formatItemPower(mastery.level * WEAPON_FAMILY_IP_PER_LEVEL)} IP`,
        `+${formatItemPower(WEAPON_FAMILY_IP_PER_LEVEL)} IP par niveau`,
      ],
      subtitle: "Bonus pour toute la famille",
    };
  }

  const iconAsset = resolveWeaponSpecializationIcon(mastery.id);
  return {
    id: mastery.id,
    name: mastery.displayName,
    level: mastery.level,
    currentXp: mastery.currentXp,
    xpToNextLevel: mastery.xpToNextLevel,
    progressPercent: masteryProgressPercent(mastery),
    isUnlocked: mastery.isUnlocked,
    bonuses: [
      `+${formatItemPower(mastery.level * WEAPON_SPECIALIZATION_IP_PER_LEVEL)} IP sur cette arme`,
      `+${formatItemPower(mastery.level * WEAPON_CROSS_SPECIALIZATION_IP_PER_LEVEL)} IP aux autres armes de la famille`,
      `+${formatItemPower(WEAPON_SPECIALIZATION_IP_PER_LEVEL)} / +${formatItemPower(WEAPON_CROSS_SPECIALIZATION_IP_PER_LEVEL)} IP par niveau`,
    ],
    subtitle: "Bonus principal + synergie de famille",
    ...(iconAsset === undefined ? {} : { iconAsset }),
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
    bonuses: [getNextGatheringUnlock(worker.mastery, worker.profession)],
    subtitle: `${worker.professionName} · T${String(worker.productionTier)}`,
  };
}

function factionProgress(mastery: MasteryVM): MasteryFamilyModel {
  const yieldBonusPercent = getFactionMasteryYieldBonusPercent(mastery.level);
  return {
    id: mastery.id,
    name: getFactionMasteryDisplayName(mastery.id) ?? mastery.displayName,
    level: mastery.level,
    currentXp: mastery.currentXp,
    xpToNextLevel: mastery.xpToNextLevel,
    progressPercent: masteryProgressPercent(mastery),
    isUnlocked: mastery.isUnlocked,
    bonuses: [`+${String(yieldBonusPercent)}% rendement de faction`],
    subtitle: "Maîtrise de faction",
    icon: "◆",
    specializations: [],
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
    return [{
      ...combatProgress(family, true),
      icon: "◆",
      iconAsset: COMBAT_MASTERY_ICON_ASSETS[definition.familyId],
      specializations,
    }];
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
      bonuses: [
        `+${String(speedBonus)}% vitesse de récolte`,
        getNextGatheringUnlock(family.level, definition.profession),
      ],
      subtitle: "Maîtrise du héros",
      icon: definition.masterySymbol,
      iconAsset: definition.professionIcon,
      specializations,
    }];
  });

  const faction = Object.values(FACTION_MASTERY_IDS).flatMap((masteryId): readonly MasteryFamilyModel[] => {
    const mastery = masteryById.get(masteryId);
    return mastery === undefined ? [] : [factionProgress(mastery)];
  });

  return {
    totalFame: source.progression.totalFame,
    overflowPool: source.progression.overflowPool,
    categories: { combat, gathering, faction },
  };
}
