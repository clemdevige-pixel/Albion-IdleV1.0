import type { MasteryId, ResourceFamily, WorkerProfession } from "@game/gameplay";
import {
  FIBER_GATHERING_MASTERY_ID,
  HIDE_GATHERING_MASTERY_ID,
  ORE_GATHERING_MASTERY_ID,
  WOOD_GATHERING_MASTERY_ID,
} from "./progressionContentCatalog.js";
import { GATHERING_TOOL_DEFINITIONS } from "./resourceContentCatalog.js";

export const PRODUCTION_TIERS = [3, 4, 5, 6, 7, 8] as const;
export type ProductionTier = (typeof PRODUCTION_TIERS)[number];

export function isProductionTier(value: unknown): value is ProductionTier {
  return (
    typeof value === "number" &&
    PRODUCTION_TIERS.includes(value as ProductionTier)
  );
}

export interface ProductionTierRules {
  readonly gatheringBaseTicks: number;
  readonly gatheringToolSpeedModifier: number;
  readonly workerSpeedModifier: number;
  readonly resourceRespawnDurationTicks: number;
}

export const PRODUCTION_TIER_RULES = {
  3: {
    gatheringBaseTicks: 24,
    gatheringToolSpeedModifier: 1,
    workerSpeedModifier: 1,
    resourceRespawnDurationTicks: 240,
  },
  4: {
    gatheringBaseTicks: 36,
    gatheringToolSpeedModifier: 0.85,
    workerSpeedModifier: 0.75,
    resourceRespawnDurationTicks: 360,
  },
  5: {
    gatheringBaseTicks: 48,
    gatheringToolSpeedModifier: 1,
    workerSpeedModifier: 1,
    resourceRespawnDurationTicks: 360,
  },
  6: {
    gatheringBaseTicks: 60,
    gatheringToolSpeedModifier: 1,
    workerSpeedModifier: 1,
    resourceRespawnDurationTicks: 360,
  },
  7: {
    gatheringBaseTicks: 72,
    gatheringToolSpeedModifier: 1,
    workerSpeedModifier: 1,
    resourceRespawnDurationTicks: 360,
  },
  8: {
    gatheringBaseTicks: 84,
    gatheringToolSpeedModifier: 1,
    workerSpeedModifier: 1,
    resourceRespawnDurationTicks: 360,
  },
} as const satisfies Record<ProductionTier, ProductionTierRules>;

export function getProductionTierRules(
  tier: ProductionTier,
): ProductionTierRules {
  return PRODUCTION_TIER_RULES[tier];
}

interface ProductionTierPresentation {
  readonly resourceName: string;
  readonly toolName: string;
}

interface ProductionFamilyDefinition {
  readonly gameplayFamily: Extract<ResourceFamily, "Wood" | "Ore" | "Hide" | "Fiber">;
  readonly profession: Extract<WorkerProfession, "woodcutter" | "miner" | "skinner" | "fiber_harvester">;
  readonly professionName: string;
  readonly masteryId: MasteryId;
  readonly label: string;
  readonly masterySymbol: string;
  readonly visualManifestId: string;
  readonly gatheringIcon: string;
  readonly rawIcon: string;
  readonly refinedIcon: string;
  readonly rawMaterialLabel: string;
  readonly tiers: Readonly<Partial<Record<ProductionTier, ProductionTierPresentation>>>;
}

/** Stable cross-domain metadata for the four supported Production families. */
export const PRODUCTION_FAMILY_CATALOG = {
  wood: {
    gameplayFamily: "Wood",
    profession: "woodcutter",
    professionName: "Bûcheron",
    masteryId: WOOD_GATHERING_MASTERY_ID,
    label: "Bois",
    masterySymbol: "🌲",
    visualManifestId: "resource_wood",
    gatheringIcon: "resource-birch-node.png",
    rawIcon: "resource-birch-log.png",
    refinedIcon: "resource-birch-planks.png",
    rawMaterialLabel: "Bois",
    tiers: {
      3: { resourceName: "Bois de bouleau", toolName: GATHERING_TOOL_DEFINITIONS.starterAxe.name },
      4: { resourceName: "Bois de pin", toolName: GATHERING_TOOL_DEFINITIONS.tier4Axe.name },
    },
  },
  ore: {
    gameplayFamily: "Ore",
    profession: "miner",
    professionName: "Mineur",
    masteryId: ORE_GATHERING_MASTERY_ID,
    label: "Minerai",
    masterySymbol: "⛏",
    visualManifestId: "resource_ore",
    gatheringIcon: "resource-copper-pickaxe.png",
    rawIcon: "resource-copper-ore.png",
    refinedIcon: "resource-copper-ingot.png",
    rawMaterialLabel: "Minerai",
    tiers: {
      3: { resourceName: "Minerai de cuivre", toolName: GATHERING_TOOL_DEFINITIONS.starterPickaxe.name },
      4: { resourceName: "Minerai de fer", toolName: GATHERING_TOOL_DEFINITIONS.tier4Pickaxe.name },
    },
  },
  hide: {
    gameplayFamily: "Hide",
    profession: "skinner",
    professionName: "Dépeceur",
    masteryId: HIDE_GATHERING_MASTERY_ID,
    label: "Peau",
    masterySymbol: "🦌",
    visualManifestId: "resource_hide",
    gatheringIcon: "resource-hide.png",
    rawIcon: "resource-hide.png",
    refinedIcon: "resource-leather.png",
    rawMaterialLabel: "Peau",
    tiers: {
      3: { resourceName: "Peau robuste", toolName: GATHERING_TOOL_DEFINITIONS.starterSkinningKnife.name },
      4: { resourceName: "Peau épaisse", toolName: GATHERING_TOOL_DEFINITIONS.tier4SkinningKnife.name },
    },
  },
  fiber: {
    gameplayFamily: "Fiber",
    profession: "fiber_harvester",
    professionName: "Herboriste",
    masteryId: FIBER_GATHERING_MASTERY_ID,
    label: "Fibres",
    masterySymbol: "🌿",
    visualManifestId: "resource_fiber",
    gatheringIcon: "resource-fiber.png",
    rawIcon: "resource-fiber.png",
    refinedIcon: "resource-cloth.png",
    rawMaterialLabel: "Fibre",
    tiers: {
      3: { resourceName: "Fibre de lin", toolName: GATHERING_TOOL_DEFINITIONS.starterSickle.name },
      4: { resourceName: "Fibre fine", toolName: GATHERING_TOOL_DEFINITIONS.tier4Sickle.name },
    },
  },
} as const satisfies Record<string, ProductionFamilyDefinition>;

export type ProductionFamilyId = keyof typeof PRODUCTION_FAMILY_CATALOG;
export type SupportedProductionFamily =
  (typeof PRODUCTION_FAMILY_CATALOG)[ProductionFamilyId]["gameplayFamily"];

export const PRODUCTION_FAMILY_IDS = Object.freeze(
  Object.keys(PRODUCTION_FAMILY_CATALOG) as ProductionFamilyId[],
);

export const PRODUCTION_FAMILIES = Object.freeze(
  PRODUCTION_FAMILY_IDS.map((id) => PRODUCTION_FAMILY_CATALOG[id].gameplayFamily),
);

const PRODUCTION_FAMILY_SET = new Set<string>(PRODUCTION_FAMILIES);

export function isSupportedProductionFamily(value: string): value is SupportedProductionFamily {
  return PRODUCTION_FAMILY_SET.has(value);
}

export function getProductionFamilyDefinition(id: ProductionFamilyId) {
  return PRODUCTION_FAMILY_CATALOG[id];
}

export function getProductionFamilyByGameplayFamily(family: SupportedProductionFamily) {
  return getProductionFamilyDefinition(getProductionFamilyId(family));
}

export function getProductionFamilyId(family: SupportedProductionFamily): ProductionFamilyId {
  return family.toLowerCase() as ProductionFamilyId;
}

export function getProductionTierPresentation(
  family: SupportedProductionFamily,
  tier: ProductionTier,
): ProductionTierPresentation | undefined {
  const definition = getProductionFamilyByGameplayFamily(family);
  const tiers = definition.tiers as Readonly<
    Partial<Record<ProductionTier, ProductionTierPresentation>>
  >;

  return tiers[tier];
}

export function requireProductionTierPresentation(
  family: SupportedProductionFamily,
  tier: ProductionTier,
): ProductionTierPresentation {
  const presentation = getProductionTierPresentation(family, tier);

  if (presentation === undefined) {
    throw new Error(
      `Production content missing for ${family} T${String(tier)}`,
    );
  }

  return presentation;
}

export function getProductionFamilyByProfession(profession: WorkerProfession) {
  return PRODUCTION_FAMILY_IDS
    .map((id) => PRODUCTION_FAMILY_CATALOG[id])
    .find((definition) => definition.profession === profession);
}

export const WORKER_PROFESSION_LABELS = {
  woodcutter: PRODUCTION_FAMILY_CATALOG.wood.professionName,
  miner: PRODUCTION_FAMILY_CATALOG.ore.professionName,
  stonecutter: "Tailleur de pierre",
  skinner: PRODUCTION_FAMILY_CATALOG.hide.professionName,
  fiber_harvester: PRODUCTION_FAMILY_CATALOG.fiber.professionName,
} as const satisfies Record<WorkerProfession, string>;

export function getWorkerResourceLabel(
  profession: WorkerProfession,
  tier: ProductionTier,
): string {
  const productionFamily = getProductionFamilyByProfession(profession);

  if (productionFamily === undefined) {
    return "Pierre";
  }

  return getProductionTierPresentation(
    productionFamily.gameplayFamily,
    tier,
  )?.resourceName ?? "Pierre";
}
